import { createReadStream, Stats } from 'fs';
import { stat, readFile } from 'fs/promises';
import * as path from 'path';
import { promisify } from 'util';
import { gzip, createGzip } from 'zlib';
import { IncomingMessage, ServerResponse } from 'http';
import { generateETag } from '../../utils/';
import type { Middleware, StaticFileOptions } from '../../types/';

const gzipAsync = promisify(gzip);

export class StaticFileMiddleware {
  private readonly root: string;
  private readonly maxAge: number;
  private readonly index: string[];
  private readonly dotFiles: 'ignore' | 'allow' | 'deny';
  private readonly compression: boolean;
  private readonly etag: boolean;
  private readonly headers: Record<string, string>;

  constructor(options: StaticFileOptions) {
    this.root = path.resolve(options.root);
    this.maxAge = options.maxAge || 86400;
    this.index = options.index || ['index.html'];
    this.dotFiles = options.dotFiles || 'ignore';
    this.compression = options.compression !== false;
    this.etag = options.etag !== false;
    this.headers = options.headers || {};
  }

  private isDotFile(urlPath: string): boolean {
    return urlPath.split('/').some(part => part.startsWith('.'));
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

  private async handleFile(
    filepath: string,
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<boolean> {
    try {
      const stats = await stat(filepath);

      if (stats.isDirectory()) {
        for (const indexFile of this.index) {
          const indexPath = path.join(filepath, indexFile);
          try {
            const indexStats = await stat(indexPath);
            if (indexStats.isFile()) {
              await this.serveFile(indexPath, indexStats, req, res);
              return true;
            }
          } catch {
            continue;
          }
        }
        return false;
      }

      if (stats.isFile()) {
        await this.serveFile(filepath, stats, req, res);
        return true;
      }

      return false;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return false;
      }
      throw error;
    }
  }

  private async serveFile(
    filepath: string,
    stats: Stats,
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<void> {
    const mimeType = this.getMimeType(path.extname(filepath).toLowerCase());
    const headers = {
      'Content-Type': mimeType,
      'Cache-Control': `public, max-age=${this.maxAge}`,
      'Last-Modified': stats.mtime.toUTCString(),
      ...this.headers
    };

    if (this.etag) {
      const etag = generateETag(`${filepath}:${stats.mtime.toISOString()}`);
      headers['ETag'] = etag;

      if (req.headers['if-none-match'] === etag) {
        res.writeHead(304, headers);
        res.end();
        return;
      }
    }

    if (req.headers['if-modified-since']) {
      const ifModifiedSince = new Date(req.headers['if-modified-since']);
      if (ifModifiedSince.getTime() >= stats.mtime.getTime()) {
        res.writeHead(304, headers);
        res.end();
        return;
      }
    }

    // Handle range requests
    if (req.headers.range) {
      const range = req.headers.range.match(/bytes=(\d*)-(\d*)/);
      if (range) {
        const start = parseInt(range[1], 10);
        const end = range[2] ? parseInt(range[2], 10) : stats.size - 1;
        headers['Content-Range'] = `bytes ${start}-${end}/${stats.size}`;
        headers['Content-Length'] = String(end - start + 1);
        headers['Accept-Ranges'] = 'bytes';
        
        res.writeHead(206, headers);
        createReadStream(filepath, { start, end }).pipe(res);
        return;
      }
    }

    // Handle compression
    if (this.compression && 
        this.isCompressible(mimeType) && 
        req.headers['accept-encoding']?.includes('gzip')) {
      headers['Content-Encoding'] = 'gzip';
      headers['Vary'] = 'Accept-Encoding';

      res.writeHead(200, headers);

      if (stats.size > 1024 * 1024) { // 1MB threshold
        createReadStream(filepath).pipe(createGzip()).pipe(res);
      } else {
        const content = await readFile(filepath);
        const compressed = await gzipAsync(content);
        res.end(compressed);
      }
      return;
    }

    // Regular file serving
    res.writeHead(200, headers);
    if (req.method === 'HEAD') {
      res.end();
      return;
    }

    if (stats.size > 1024 * 1024) { // 1MB threshold
      createReadStream(filepath).pipe(res);
    } else {
      const content = await readFile(filepath);
      res.end(content);
    }
  }

  public middleware(): Middleware {
    return async (req: IncomingMessage, res: ServerResponse, next: () => Promise<void>): Promise<void> => {
      try {
        if (req.method !== 'GET' && req.method !== 'HEAD') {
          await next();
          return;
        }

        const urlPath = decodeURIComponent(req.url?.split('?')[0] || '/');
        const normalizedPath = path.normalize(urlPath);

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
        const relative = path.relative(this.root, fullPath);

        if (relative.includes('..') || path.isAbsolute(relative)) {
          res.writeHead(403, { 'Content-Type': 'text/plain' });
          res.end('Forbidden');
          return;
        }

        const handled = await this.handleFile(fullPath, req, res);
        if (!handled) {
          await next();
        }
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');
      }
    };
  }
}