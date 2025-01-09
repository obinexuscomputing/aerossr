// src/core/AeroSSR.ts
import { Server, createServer, IncomingMessage, ServerResponse } from 'http';
import { promises as fs } from 'fs';
import { parse as parseUrl } from 'url';
import path, { join } from 'path';
import { gzip } from 'zlib';
import { promisify } from 'util';
import { Request, RequestContext, Response } from '../http';
import { Router } from '../routing/Router';
import { RouteHandler, Middleware, RouteStrategy } from '@/routing';
import { StaticFileMiddleware } from '@/middleware/static/StaticFileMiddleware';
import { AeroSSRConfig, BundleHandler, CorsOptions, StaticFileOptions } from '@/types';
import { createCache } from '@/utils/cache/CacheManager';
import { htmlManager } from '@/utils/html/HtmlManager';
import { corsManager } from '@/utils/security/CorsManager';
import { etagGenerator } from '@/utils/security/ETagGenerator';
import { Logger, ErrorHandler, CustomError, AeroSSRBundler } from '@/utils';

const gzipAsync = promisify(gzip);

export class AeroSSR {
  public readonly config: Required<AeroSSRConfig>;
  public readonly logger: Logger;
  private readonly bundler: AeroSSRBundler;
  private readonly router: Router;
  public server: Server | null;
  public readonly routes: Map<string, RouteHandler>;
  private readonly middlewares: Middleware[];

  constructor(options: Partial<AeroSSRConfig> = {}) {
    // Initialize base configuration first
    const baseConfig = {
      projectPath: path.resolve(options.projectPath || process.cwd()),
      publicPath: path.resolve(options.projectPath || process.cwd(), 'public'),
      port: options.port || 3000,
      compression: options.compression !== false,
      cacheMaxAge: options.cacheMaxAge || 3600,
      logFilePath: options.logFilePath || path.join(process.cwd(), 'logs', 'server.log'),
      loggerOptions: options.loggerOptions || {},
      corsOrigins: corsManager.normalizeCorsOptions(options.corsOrigins),
      defaultMeta: {
        title: 'AeroSSR App',
        description: 'Built with AeroSSR bundler',
        charset: 'UTF-8',
        viewport: 'width=device-width, initial-scale=1.0',
        ...options.defaultMeta,
      },
    } as AeroSSRConfig;

    // Create required directories
    this.createRequiredDirectories(baseConfig.projectPath);

    // Complete configuration with derived components
    this.config = {
      ...baseConfig,
      bundleCache: options.bundleCache || createCache<string>(),
      templateCache: options.templateCache || createCache<string>(),
      errorHandler: options.errorHandler || ErrorHandler.handleErrorStatic,
      staticFileHandler: options.staticFileHandler || this.handleDefaultRequest.bind(this),
      bundleHandler: options.bundleHandler as BundleHandler || this.handleBundle.bind(this),
    } as Required<AeroSSRConfig>;

    // Initialize core components
    this.logger = new Logger({
      logFilePath: this.config.logFilePath,
      ...this.config.loggerOptions
    });

    this.router = new Router(new RouteStrategy());
    this.bundler = new AeroSSRBundler(this.config.projectPath);
    this.server = null;
    this.routes = new Map();
    this.middlewares = [];

    // Set up default static file handling
    if (!options.staticFileOptions && !options.staticFileHandler) {
      const defaultStaticOptions: StaticFileOptions = {
        root: 'public',
        maxAge: 86400,
        index: ['index.html'],
        dotFiles: 'ignore',
        compression: this.config.compression,
        etag: true
      };
      this.setupStaticFileHandling(defaultStaticOptions);
    } else if (options.staticFileOptions) {
      this.setupStaticFileHandling(options.staticFileOptions);
    }

    // Update CORS manager defaults
    corsManager.updateDefaults(this.config.corsOrigins as CorsOptions);

    // Validate configuration
    this.validateConfig();
  }

  private async createRequiredDirectories(projectPath: string): Promise<void> {
    const requiredDirs = [
      path.join(projectPath, 'public'),
      path.join(projectPath, 'logs'),
      path.join(projectPath, 'src')
    ];

    for (const dir of requiredDirs) {
      try {
        await fs.mkdir(dir, { recursive: true });
      } catch (error) {
        if (this.logger) {
          this.logger.log(`Failed to create directory ${dir}: ${error}`);
        }
      }
    }
  }

  private setupStaticFileHandling(options: StaticFileOptions): void {
    const staticOptions = {
      root: path.join(this.config.projectPath, options.root || 'public'),
      maxAge: options.maxAge || 86400,
      index: options.index || ['index.html'],
      dotFiles: options.dotFiles || 'ignore',
      compression: options.compression ?? this.config.compression,
      etag: options.etag !== false
    };

    const staticFileMiddleware = new StaticFileMiddleware(staticOptions);
    this.use(staticFileMiddleware.middleware());
  }

  private validateConfig(): void {
    if (this.config.port < 0 || this.config.port > 65535) {
      throw new Error('Invalid port number');
    }
    if (this.config.cacheMaxAge < 0) {
      throw new Error('Cache max age cannot be negative');
    }
    if (this.config.errorHandler && typeof this.config.errorHandler !== 'function') {
      throw new Error('Error handler must be a function');
    }
  }

  public use(middleware: (req: IncomingMessage, res: ServerResponse, next: () => Promise<void>) => Promise<void>): void {
    if (typeof middleware !== 'function') {
      throw new Error('Middleware must be a function');
    }
    this.middlewares.push(middleware);
  }

  public route(path: string, handler: RouteHandler): void {
    if (typeof path !== 'string' || !path) {
      throw new Error('Route path must be a non-empty string');
    }
    if (typeof handler !== 'function') {
      throw new Error('Route handler must be a function');
    }
    this.router.add(this.router.route(path).handler(handler));
  }

  public clearCache(): void {
    this.config.bundleCache.clear();
    this.config.templateCache.clear();
    this.bundler.clearCache();
  }
  private createContext(rawReq: IncomingMessage, rawRes: ServerResponse): RequestContext {
    const req = new Request(rawReq);
    const res = new Response(rawRes);
    return {
      req,
      res,
      params: {},
      query: {},
      state: {},
    };
  }

  private async executeMiddlewares(context: RequestContext): Promise<void> {
    // Early return if no middlewares
    if (this.middlewares.length === 0) {
      return;
    }
  
    const chain = [...this.middlewares];
    let index = 0;
  
    const next = async (): Promise<void> => {
      const middleware = chain[index];
      if (!middleware) {
        return;
      }
  
      try {
        // Create new context with next function for current middleware
        const middlewareContext = {
          ...context,
          req: context.req.raw,
          next: async () => {
            index++;
            await next();
          }
        };
  
        // Execute current middleware
        await middleware(context.req.raw, context.res.raw, next);
      } catch (error) {
        const middlewareError = new Error(
          `Middleware execution failed: ${error instanceof Error ? error.message : String(error)}`
        ) as CustomError;
  
        if (error instanceof Error) {
          middlewareError.cause = error;
          middlewareError.stack = error.stack;
        }
  
        throw middlewareError;
      }
    };
  
    // Start the middleware chain
    await next();
  }

    
  private async handleRequest(
    rawReq: IncomingMessage,
    rawRes: ServerResponse
  ): Promise<void> {
    try {
      this.logger.log(`Request received: ${rawReq.method} ${rawReq.url}`);

      const context = this.createContext(rawReq, rawRes);

      // Handle CORS preflight
      if (context.req.method === 'OPTIONS') {
        corsManager.handlePreflight(context.res.raw);
        return;
      }

      // Set CORS headers
      corsManager.setCorsHeaders(context.res.raw);

      // Execute middleware chain
      await this.executeMiddlewares(context);

      const parsedUrl = parseUrl(rawReq.url || '', true);
      const pathname = parsedUrl.pathname || '/';

      // Special routes
      if (pathname === '/dist') {
        await this.handleBundle(context.req.raw, context.res.raw, parsedUrl.query);
        return;
      }

      // Route handling
      await this.router.handle(context.req.raw, context.res.raw);
    } catch (err) {
      const error = err as CustomError;
      await ErrorHandler.handleErrorStatic(error, rawReq, rawRes, { logger: this.logger });
    }
  }

  private async handleBundle(
    req: IncomingMessage,
    res: ServerResponse,
    query: Record<string, string | string[] | undefined>
  ): Promise<void> {
    try {
      const entryPoint = (query.entryPoint as string) || 'main.js';

      const bundle = await this.bundler.generateBundle(entryPoint, {
        minify: true,
        sourceMap: false
      });

      const etag = etagGenerator.generate(bundle.code);

      if (req.headers['if-none-match'] === etag) {
        res.writeHead(304);
        res.end();
        return;
      }

      const headers = {
        'Content-Type': 'application/javascript',
        'Cache-Control': `public, max-age=${this.config.cacheMaxAge}`,
        'ETag': etag,
      };

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
      const bundleError = new Error(
        `Bundle generation failed: ${error instanceof Error ? error.message : String(error)}`
      ) as CustomError;
      if (error instanceof Error) {
        bundleError.cause = error;
      }
      throw bundleError;
    }
  }

  private async handleDefaultRequest(
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<void> {
    try {
      const parsedUrl = parseUrl(req.url || '', true);
      const pathname = parsedUrl.pathname || '/';

      // Template lookup
      const htmlPath = join(this.config.projectPath, 'public', 'index.html');
      let html = await fs.readFile(htmlPath, 'utf-8');

      // Meta tags
      const meta = {
        title: `Page - ${pathname}`,
        description: `Content for ${pathname}`,
        ...this.config.defaultMeta
      };

      // Inject meta tags
      html = htmlManager.injectMetaTags(html, meta);

      const headers = {
        'Content-Type': 'text/html',
        'Cache-Control': 'no-cache',
        'X-Content-Type-Options': 'nosniff'
      };

      if (!res.headersSent) {
        res.writeHead(200, headers);
      }
      res.end(html);
    } catch (error) {
      const requestError = new Error(
        `Default request handling failed: ${error instanceof Error ? error.message : String(error)}`
      ) as CustomError;
      
      if (error instanceof Error) {
        requestError.cause = error;
        requestError.stack = error.stack;
      }
      
      throw requestError;
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
    if (port < 0 || port > 65535) {
      throw new Error('Invalid port number');
    }
    this.config.port = port;
    this.start().catch(error => {
      this.logger.log(`Failed to start server: ${error.message}`);
    });
  }
}

export default AeroSSR;