import { Server, createServer, IncomingMessage, ServerResponse } from 'http';
import { promises as fs } from 'fs';
import { parse as parseUrl } from 'url';
import { join } from 'path';
import { gzip } from 'zlib';
import { promisify } from 'util';
import { Logger } from './utils/Logger';
import { createCache } from './utils/CacheManager';
import { setCorsHeaders } from './utils/CorsManager';
import { generateETag } from './utils/ETagGenerator';
import { handleError } from './utils/ErrorHandler';
import { injectMetaTags } from './utils/HtmlManager';
import { generateBundle } from './utils/Bundler';
import { AeroSSRConfig, CorsOptions, Middleware, RouteHandler, BundleHandler } from './types';

const gzipAsync = promisify(gzip);

export class AeroSSR {
  public readonly config: Required<AeroSSRConfig>;
  public readonly logger: Logger;
  public server: Server | null;
  public readonly routes: Map<string, RouteHandler>;
  private readonly middlewares: Middleware[];
  
  constructor(config: AeroSSRConfig = {}) {
    const corsOptions: CorsOptions = typeof config.corsOrigins === 'string'
      ? { origins: config.corsOrigins }
      : config.corsOrigins || { origins: '*' };

    this.config = {
      loggerOptions: config.loggerOptions || {},
      errorHandler: config.errorHandler || handleError,
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
    this.server = null;
    this.routes = new Map();
    this.middlewares = [];
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
      await this.executeMiddlewares(req, res);

      const parsedUrl = parseUrl(req.url || '', true);
      const pathname = parsedUrl.pathname || '/';

      if (req.method === 'OPTIONS') {
        setCorsHeaders(res, this.config.corsOrigins as CorsOptions);
        res.writeHead(204);
        res.end();
        return;
      }

      const routeHandler = this.routes.get(pathname);
      if (routeHandler) {
        await routeHandler(req, res);
        return;
      }

      if (pathname === '/dist') {
        await this.handleDistRequest(req, res, parsedUrl.query);
        return;
      }

      await this.handleDefaultRequest(req, res);
    } catch (error) {
      await handleError(error instanceof Error ? error : new Error('Unknown error'), req, res);
    }
  }

  private async handleDistRequest(
    req: IncomingMessage,
    res: ServerResponse,
    query: Record<string, string | string[] | undefined>
  ): Promise<void> {
    const projectPath = (query.projectPath as string) || './';
    const entryPoint = (query.entryPoint as string) || 'main.js';

    const bundle = await generateBundle(projectPath, entryPoint);
    const etag = generateETag(bundle);

    if (req.headers['if-none-match'] === etag) {
      res.writeHead(304);
      res.end();
      return;
    }

    setCorsHeaders(res, this.config.corsOrigins as CorsOptions);
    res.writeHead(200, {
      'Content-Type': 'application/javascript',
      'Cache-Control': `public, max-age=${this.config.cacheMaxAge}`,
      'ETag': etag,
    });

    if (this.config.compression && req.headers['accept-encoding']?.includes('gzip')) {
      const compressed = await gzipAsync(bundle);
      res.setHeader('Content-Encoding', 'gzip');
      res.end(compressed);
    } else {
      res.end(bundle);
    }
  }

  private async handleDefaultRequest(
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<void> {
    const parsedUrl = parseUrl(req.url || '', true);
    const pathname = parsedUrl.pathname || '/';

    const htmlPath = join(__dirname, 'index.html');
    let html = await fs.readFile(htmlPath, 'utf-8');

    const meta = {
      title: `Page - ${pathname}`,
      description: `Content for ${pathname}`,
    };

    html = injectMetaTags(html, meta, this.config.defaultMeta);

    res.writeHead(200, {
      'Content-Type': 'text/html',
      'Cache-Control': 'no-cache',
    });
    res.end(html);
  }

  public async start(): Promise<Server> {
    return new Promise((resolve) => {
      this.server = createServer((req, res) => this.handleRequest(req, res));
      this.server.listen(this.config.port, () => {
        this.logger.log(`Server is running on port ${this.config.port}`);
        resolve(this.server as Server);
      });
    });
  }

  public async stop(): Promise<void> {
    if (this.server) {
      return new Promise((resolve) => {
        this.server?.close(() => {
          this.logger.log('Server stopped');
          this.server = null;
          resolve();
        });
      });
    }
    return Promise.resolve();
  }

  public listen(port: number): void {
    this.config.port = port;
    this.start().catch(error => {
      this.logger.log(`Failed to start server: ${error.message}`);
    });
  }
}

export default AeroSSR;