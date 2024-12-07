import { Server, createServer, IncomingMessage, ServerResponse } from 'http';
import { promises as fs } from 'fs';
import { parse as parseUrl } from 'url';
import { join } from 'path';
import { gzip } from 'zlib';
import { promisify } from 'util';
import { Logger } from './logger';
import { createCache } from './cache';
import { setCorsHeaders } from './cors';
import { generateETag } from './etag';
import { handleError } from './errorHandler';
import { injectMetaTags } from './html';
import { generateBundle } from './bundler';
import { AeroSSRConfig, RouteHandler, Middleware } from '@/types';

const gzipAsync = promisify(gzip)

export class AeroSSR {
  private readonly config: Required<AeroSSRConfig>;
  private readonly logger: Logger;
  private server: Server | null;
  private readonly routes: Map<string, RouteHandler>;
  private readonly middlewares: Middleware[];

  constructor(config: AeroSSRConfig = {}) {
    this.config = {
      port: config.port || 3000,
      cacheMaxAge: config.cacheMaxAge || 3600,
      corsOrigins: config.corsOrigins || '*',
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
    index: number = 0
  ): Promise<void> {
    if (index >= this.middlewares.length) {
      return;
    }

    await this.middlewares[index](req, res, () => this.executeMiddlewares(req, res, index + 1));
  }

  private async handleRequest(
    _req: IncomingMessage,
    res: ServerResponse
  ): Promise<void> {
    try {
      this.logger.logRequest(_req);

      await this.executeMiddlewares(_req, res);

      const parsedUrl = parseUrl(_req.url || '', true);
      const pathname = parsedUrl.pathname || '/';

      if (_req.method === 'OPTIONS') {
        setCorsHeaders(res, this.config.corsOrigins);
        res.writeHead(204);
        res.end();
        return;
      }

      const routeHandler = this.routes.get(pathname);
      if (routeHandler) {
        await routeHandler(_req, res);
        return;
      }

      if (pathname === '/dist') {
        await this.handleDistRequest(_req, res, parsedUrl.query);
        return;
      }

      await this.handleDefaultRequest(_req, res, pathname);
    } catch (error) {
      await handleError(error instanceof Error ? error : new Error('Unknown error'), _req, res);
    }
  }
  private async handleDistRequest(
    _req: IncomingMessage,
    res: ServerResponse,
    query: Record<string, string | string[] | undefined>
  ): Promise<void> {
    const projectPath = (query.projectPath as string) || './';
    const entryPoint = (query.entryPoint as string) || 'main.js';

    const bundle = await generateBundle(projectPath, entryPoint);
    const etag = generateETag(bundle);

    if (_req.headers['if-none-match'] === etag) {
      res.writeHead(304);
      res.end();
      return;
    }

    setCorsHeaders(res, this.config.corsOrigins);
    res.writeHead(200, {
      'Content-Type': 'application/javascript',
      'Cache-Control': `public, max-age=${this.config.cacheMaxAge}`,
      'ETag': etag,
    });

    const acceptEncoding = _req.headers['accept-encoding'] || '';
    if (this.config.compression && acceptEncoding.includes('gzip')) {
      const compressed = await gzipAsync(bundle);
      res.setHeader('Content-Encoding', 'gzip');
      res.end(compressed);
    } else {
      res.end(bundle);
    }
  }


  private async handleDefaultRequest(
    _req: IncomingMessage,
    res: ServerResponse,
    pathname: string
  ): Promise<void> {
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
        this.logger.log(`AeroSSR server running on port ${this.config.port}`);
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
}

export default AeroSSR;
