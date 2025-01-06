import { createReadStream, Stats } from 'fs';
import { stat, readFile } from 'fs/promises';
import * as path from 'path';
import { createGzip, gzip } from 'zlib';
import { promisify } from 'util';
import { IncomingMessage, ServerResponse } from 'http';
import { generateETag } from '../utils/etag';
import { Middleware } from '../types';

const gzipAsync = promisify(gzip);

export interface StaticFileOptions {
  root: string;
  maxAge?: number;
  index?: string[];
  dotFiles?: 'ignore' | 'allow' | 'deny';
  compression?: boolean;
  etag?: boolean;
}

export class StaticFileMiddleware {
  private readonly root: string;
  private readonly maxAge: number;
  private readonly index: string[];
  private readonly dotFiles: 'ignore' | 'allow' | 'deny';
  private readonly compression: boolean;
  private readonly etag: boolean;

  constructor(options: StaticFileOptions) {
    this.root = path.resolve(options.root);
    this.maxAge = options.maxAge || 86400;
    this.index = options.index || ['index.html'];
    this.dotFiles = options.dotFiles || 'ignore';
    this.compression = options.compression !== false;
    this.etag = options.etag !== false;
  }

  public middleware(): Middleware {
    return async (req: IncomingMessage, res: ServerResponse, next: () => Promise<void>) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        await next();
        return;
      }

      try {
        const urlPath = decodeURIComponent(req.url?.split('?')[0] || '/');
        const normalizedPath = path.normalize(urlPath);

        // Handle dotfiles
        if (this.isDotFile(normalizedPath)) {
          if (this.dotFiles === 'deny') {
            res.writeHead(403, { 'Content-Type': 'text/plain' });
            res.end('Forbidden');
            return;
          }
          if (this.dotFiles === 'ignore') {
            await next();
            return;
          }
        }

        const fullPath = path.join(this.root, normalizedPath);

        // Prevent directory traversal
        const relative = path.relative(this.root, fullPath);
        if (relative.includes('..')) {
          res.writeHead(403, { 'Content-Type': 'text/plain' });
          res.end('Forbidden');
          return;
        }

        try {
          const stats = await stat(fullPath);

          if (stats.isDirectory()) {
            for (const indexFile of this.index) {
              const indexPath = path.join(fullPath, indexFile);
              try {
                const indexStats = await stat(indexPath);
                if (indexStats.isFile()) {
                  await this.serveFile(indexPath, indexStats, req, res);
                  return;
                }
              } catch {
                continue;
              }
            }
            await next();
            return;
          }

          if (stats.isFile()) {
            await this.serveFile(fullPath, stats, req, res);
            return;
          }

          await next();
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            await next();
            return;
          }
          throw error;
        }
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');
      }
    };
  }

  private isDotFile(urlPath: string): boolean {
    return urlPath.split('/').some(part => part.startsWith('.'));
  }

  private getMimeType(ext: string): string {
    const mimeTypes: Record<string, string> = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.wav': 'audio/wav',
      '.mp4': 'video/mp4',
      '.woff': 'application/font-woff',
      '.ttf': 'application/font-ttf',
      '.eot': 'application/vnd.ms-fontobject',
      '.otf': 'application/font-otf',
      '.wasm': 'application/wasm'
    };
    return mimeTypes[ext.toLowerCase()] || 'application/octet-stream';
  }

  private isCompressible(mimeType: string): boolean {
    return /^(text|application)\/(javascript|json|html|xml|css|plain)/.test(mimeType);
  }

  private async serveFile(
    filepath: string,
    stats: Stats,
    req: IncomingMessage, 
    res: ServerResponse
  ): Promise<void> {
    const mimeType = this.getMimeType(path.extname(filepath));
    const etag = this.etag ? generateETag(`${stats.mtime.toISOString()}`) : null;

    // Handle conditional requests
    const ifModifiedSince = req.headers['if-modified-since'];
    const ifNoneMatch = req.headers['if-none-match'];

    if (etag && ifNoneMatch === etag) {
      res.writeHead(304);
      res.end();
      return;
    }

    if (ifModifiedSince) {
      const clientDate = new Date(ifModifiedSince);
      if (clientDate >= stats.mtime) {
        res.writeHead(304);
        res.end();
        return;
      }
    }

    const headers: Record<string, string> = {
      'Content-Type': mimeType,
      'Cache-Control': `public, max-age=${this.maxAge}`,
      'Last-Modified': stats.mtime.toUTCString()
    };

    if (etag) {
      headers['ETag'] = etag;
    }

    // Handle compression
    const acceptEncoding = req.headers['accept-encoding'];
    const shouldCompress = this.compression && 
                         this.isCompressible(mimeType) && 
                         acceptEncoding?.includes('gzip');

    if (shouldCompress) {
      headers['Content-Encoding'] = 'gzip';
      headers['Vary'] = 'Accept-Encoding';
    }

    res.writeHead(200, headers);

    // Handle HEAD requests
    if (req.method === 'HEAD') {
      res.end();
      return;
    }

    try {
      if (stats.size > 1024 * 1024) { // 1MB threshold
        const stream = createReadStream(filepath);
        if (shouldCompress) {
          const gzipStream = createGzip();
          stream.on('error', () => res.end());
          gzipStream.on('error', () => res.end());
          stream.pipe(gzipStream).pipe(res);
        } else {
          stream.on('error', () => res.end());
          stream.pipe(res);
        }
      } else {
        const content = await readFile(filepath);
        if (shouldCompress) {
          const compressed = await gzipAsync(content);
          res.end(compressed);
        } else {
          res.end(content);
        }
      }
    } catch (error) {
      // If we encounter an error after headers are sent, just end the response
      res.end();
    }
  }
}