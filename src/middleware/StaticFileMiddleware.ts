import { stat, readFile } from 'fs/promises';
import * as path from 'path';
import { promisify } from 'util';
import { gzip } from 'zlib';
import { IncomingMessage, ServerResponse } from 'http';
import { generateETag } from '../utils';
import { Stats } from 'fs';
import { StaticFileOptions, Middleware } from '../types';

const gzipAsync = promisify(gzip);

export interface CachedContent {
  content: Buffer;
  headers: Record<string, string>;
  encoding?: string;
}

export class StaticFileMiddleware {
  private readonly root: string;
  private readonly maxAge: number;
  private readonly index: string[];
  private readonly dotFiles: 'ignore' | 'allow' | 'deny';
  private readonly compression: boolean;
  private readonly etag: boolean;

  constructor(options: StaticFileOptions) {
    this.root = options.root;
    this.maxAge = options.maxAge || 86400;
    this.index = options.index || ['index.html'];
    this.dotFiles = options.dotFiles || 'ignore';
    this.compression = options.compression !== false;
    this.etag = options.etag !== false;
  }

  private async serveFile(
    filepath: string,
    stats: Stats,
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<void> {
    const ext = path.extname(filepath).toLowerCase();
    const mimeType = this.getMimeType(ext);

    const etag = this.etag ? generateETag(`${filepath}:${stats.mtime.toISOString()}`) : null;
    if (etag && req.headers['if-none-match'] === etag) {
      res.writeHead(304);
      res.end();
      return;
    }

    const headers: Record<string, string> = {
      'Content-Type': mimeType,
      'Cache-Control': `public, max-age=${this.maxAge}`,
      'Last-Modified': stats.mtime.toUTCString()
    };

    if (etag) {
      headers['ETag'] = etag;
    }

    const content = await readFile(filepath);

    if (this.compression && this.isCompressible(mimeType) && content.length > 1024) {
      const acceptEncoding = req.headers['accept-encoding'] || '';
      if (acceptEncoding.includes('gzip')) {
        const compressed = await gzipAsync(content);
        headers['Content-Encoding'] = 'gzip';
        headers['Vary'] = 'Accept-Encoding';
        res.writeHead(200, headers);
        res.end(compressed);
        return;
      }
    }

    res.writeHead(200, headers);
    res.end(content);
  }

  private isCompressible(mimeType: string): boolean {
    return /^(text|application)\/(javascript|json|html|xml|css|plain)/.test(mimeType);
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
    return mimeTypes[ext] || 'application/octet-stream';
  }

  middleware(): Middleware {
    return async (_req: IncomingMessage, res: ServerResponse, next: () => Promise<void>) => {
      try {
        if (_req.method !== 'GET' && _req.method !== 'HEAD') {
          return next();
        }

        const urlPath = path.normalize(decodeURIComponent(_req.url || '').split('?')[0]);

        if (this.dotFiles !== 'allow' && urlPath.split('/').some(p => p.startsWith('.'))) {
          if (this.dotFiles === 'deny') {
            res.writeHead(403);
            res.end('Forbidden');
            return;
          }
          return next();
        }

        const fullPath = path.join(this.root, urlPath);

        try {
          const stats = await stat(fullPath);
          
          if (stats.isDirectory()) {
            for (const indexFile of this.index) {
              const indexPath = path.join(fullPath, indexFile);
              try {
                const indexStats = await stat(indexPath);
                if (indexStats.isFile()) {
                  await this.serveFile(indexPath, indexStats, _req, res);
                  return;
                }
              } catch {
                continue;
              }
            }
            return next();
          }

          if (stats.isFile()) {
            await this.serveFile(fullPath, stats, _req, res);
            return;
          }
        } catch {
          return next();
        }
      } catch (error) {
        return next();
      }
    };
  }
}