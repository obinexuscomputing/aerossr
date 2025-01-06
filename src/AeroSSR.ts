// src/AeroSSR.ts
import { Server, createServer, IncomingMessage, ServerResponse } from 'http';
import { promises as fs } from 'fs';
import { parse as parseUrl } from 'url';
import { join } from 'path';
import { gzip } from 'zlib';
import { promisify } from 'util';
import { Logger } from './utils/Logger';
import { createCache } from './utils/CacheManager';
import { corsManager, CorsOptions } from './utils/CorsManager';
import { etagGenerator } from './utils/ETagGenerator';
import { ErrorHandler } from './utils/ErrorHandler';
import { htmlManager } from './utils/HtmlManager';
import { AeroSSRBundler } from './utils/Bundler';
import { AeroSSRConfig, Middleware, RouteHandler, BundleHandler } from './types';

const gzipAsync = promisify(gzip);

export class AeroSSR {
  public readonly config: Required<AeroSSRConfig>;
  public readonly logger: Logger;
  private readonly bundler: AeroSSRBundler;
  public server: Server | null;
  public readonly routes: Map<string, RouteHandler>;
  private readonly middlewares: Middleware[];
  
  constructor(config: AeroSSRConfig = {}) {
    // Normalize CORS options
    const corsOptions = corsManager.normalizeCorsOptions(config.corsOrigins);

    this.config = {
      loggerOptions: config.loggerOptions || {},
      errorHandler: config.errorHandler || ErrorHandler.handleError,
      staticFileHandler: config.staticFileHandler || this.handleDefaultRequest.bind(this),
      bundleHandler: config.bundleHandler as BundleHandler || this.handleDistRequest.bind(this),
      port: config.port || 3000,
      cacheMaxAge: config.cacheMaxAge || 3600,
      corsOrigins: corsOptions,
      compression: config.compression !== false,
      logFilePath: config.logFilePath || null,
      bundleCache: config.bundleCache || createCache<string>(),
      templateCache: config.templateCache || createCache<string>(),
      defaultMeta: {
        title: 'AeroSSR App',
        description: 'Built with AeroSSR bundler',
        charset: 'UTF-8',
        viewport: 'width=device-width, initial-scale=1.0',
        ...config.defaultMeta,
      },
    };

    this.logger = new Logger({ logFilePath: this.config.logFilePath });
    this.bundler = new AeroSSRBundler();
    this.server = null;
    this.routes = new Map();
    this.middlewares = [];

    // Update CORS manager defaults with configuration
    corsManager.updateDefaults(this.config.corsOrigins as CorsOptions);
  }

  public use(middleware: Middleware): void {
    this.middlewares.push(middleware);
  }

  public route(path: string, handler: RouteHandler): void {
    this.routes.set(path, handler);
  }

  public clearCache(): void {
    this.config.bundleCache.clear();
    this.config.templateCache.clear();
  }

  private async executeMiddlewares(
    req: IncomingMessage,
    res: ServerResponse,
    index = 0
  ): Promise<void> {
    if (index >= this.middlewares.length) {
      return;
    }

    const chain = [...this.middlewares];
    let currentIndex = index;

    const next = async (): Promise<void> => {
      const middleware = chain[currentIndex];
      if (middleware) {
        currentIndex++;
        await middleware(req, res, next);
      }
    };

    await next();
  }

  private async handleRequest(
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<void> {
    try {
      this.logger.log(`Request received: ${req.method} ${req.url}`);
      
      // Handle CORS preflight requests
      if (req.method === 'OPTIONS') {
        corsManager.handlePreflight(res, this.config.corsOrigins as CorsOptions);
        return;
      }

      // Set CORS headers for regular requests
      corsManager.setCorsHeaders(res, this.config.corsOrigins as CorsOptions);

      // Execute middleware chain
      await this.executeMiddlewares(req, res);

      const parsedUrl = parseUrl(req.url || '', true);
      const pathname = parsedUrl.pathname || '/';

      // Route handling
      const routeHandler = this.routes.get(pathname);
      if (routeHandler) {
        await routeHandler(req, res);
        return;
      }

      // Special routes
      if (pathname === '/dist') {
        await this.handleDistRequest(req, res, parsedUrl.query);
        return;
      }

      // Default request handler
      await this.handleDefaultRequest(req, res);
    } catch (error) {
      await ErrorHandler.handleError(
        error instanceof Error ? error : new Error('Unknown error'), 
        req, 
        res
      );
    }
  }

  private async handleDistRequest(
    req: IncomingMessage,
    res: ServerResponse,
    query: Record<string, string | string[] | undefined>
  ): Promise<void> {
    try {
      const projectPath = (query.projectPath as string) || './';
      const entryPoint = (query.entryPoint as string) || 'main.js';

      // Generate bundle
      const bundle = await this.bundler.generateBundle(entryPoint, {
        minify: true,
        sourceMap: false
      });

      // Generate ETag
      const etag = etagGenerator.generate(bundle.code);

      // Handle conditional requests
      if (req.headers['if-none-match'] === etag) {
        res.writeHead(304);
        res.end();
        return;
      }

      // Set response headers
      const headers = {
        'Content-Type': 'application/javascript',
        'Cache-Control': `public, max-age=${this.config.cacheMaxAge}`,
        'ETag': etag,
      };

      // Handle compression
      if (this.config.compression && req.headers['accept-encoding']?.includes('gzip')) {
        const compressed = await gzipAsync(bundle.code);
        headers['Content-Encoding'] = 'gzip';
        headers['Vary'] = 'Accept-Encoding';
        res.writeHead(200, headers);
        res.end(compressed);
      } else {
        res.writeHead(200, headers);
        res.end(bundle.code);
      }
    } catch (error) {
      throw new Error(`Bundle generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async handleDefaultRequest(
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<void> {
    try {
      const parsedUrl = parseUrl(req.url || '', true);
      const pathname = parsedUrl.pathname || '/';

      // Read and process HTML template
      const htmlPath = join(__dirname, 'index.html');
      let html = await fs.readFile(htmlPath, 'utf-8');

      // Generate meta tags
      const meta = {
        title: `Page - ${pathname}`,
        description: `Content for ${pathname}`,
      };

      // Inject meta tags
      html = htmlManager.injectMetaTags(html, meta, this.config.defaultMeta);

      // Set response headers
      res.writeHead(200, {
        'Content-Type': 'text/html',
        'Cache-Control': 'no-cache',
        'X-Content-Type-Options': 'nosniff'
      });
      res.end(html);
    } catch (error) {
      throw new Error(`Default request handling failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  public async start(): Promise<Server> {
    return new Promise((resolve, reject) => {
      try {
        this.server = createServer((req, res) => this.handleRequest(req, res));
        
        this.server.on('error', (error) => {
          this.logger.log(`Server error: ${error.message}`);
          reject(error);
        });

        this.server.listen(this.config.port, () => {
          this.logger.log(`Server is running on port ${this.config.port}`);
          resolve(this.server as Server);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  public async stop(): Promise<void> {
    if (!this.server) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      this.server?.close(() => {
        this.logger.log('Server stopped');
        this.server = null;
        resolve();
      });
    });
  }

  public listen(port: number): void {
    this.config.port = port;
    this.start().catch(error => {
      this.logger.log(`Failed to start server: ${error.message}`);
    });
  }
}

export default AeroSSR;