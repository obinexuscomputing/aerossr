import { stat, createReadStream, promises as fsPromises, Stats } from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { gzip } from 'zlib';
import { IncomingMessage, ServerResponse } from 'http';
import { generateETag } from '../utils';
// Removed duplicate import of Stats
import { StaticFileOptions, Middleware } from '../types';

const gzipAsync = promisify(gzip);

export class StaticFileMiddleware {
  public readonly root: string;
  public readonly maxAge: number;
  public readonly index: string[];
  public readonly dotFiles: 'ignore' | 'allow' | 'deny';
  public readonly compression: boolean;
  public readonly etag: boolean;
  options: any;

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
    const mimeType = this.getMimeType(path.extname(filepath).toLowerCase());

    const etag = this.etag ? generateETag(`${filepath}:${stats.mtime.toISOString()}`) : null;
    if (etag && req.headers['if-none-match'] === etag) {
      res.writeHead(304);
      res.end();
      return;
    }

    const headers: Record<string, string> = {
      'Content-Type': mimeType,
      'Cache-Control': `public, max-age=${this.maxAge}`,
      'Last-Modified': stats.mtime.toUTCString(),
    };

    if (etag) {
      headers['ETag'] = etag;
    }

    const content = await fsPromises.readFile(filepath);

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

  private isDotFile(urlPath: string): boolean {
    return urlPath.split('/').some(part => part.startsWith('.'));
  }

  private handleDotFile(req: IncomingMessage, res: ServerResponse, next: () => Promise<void>): Promise<void> | false {
    if (this.dotFiles === 'allow') {
      return false; // Continue processing
    }

    if (this.dotFiles === 'deny') {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      res.end('Forbidden');
      return Promise.resolve();
    }

    // ignore - pass to next middleware
    return next();
  }

  private isCompressible(mimeType: string): boolean {
    return /^(text|application)\/(javascript|json|html|xml|css|plain)/.test(mimeType);
  }

  private getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
      case '.html':
        return 'text/html';
      case '.js':
        return 'application/javascript';
      case '.css':
        return 'text/css';
      case '.png':
        return 'image/png';
      case '.jpg':
      case '.jpeg':
        return 'image/jpeg';
      case '.svg':
        return 'image/svg+xml';
      case '.json':
        return 'application/json';
      default:
        return 'application/octet-stream';
    }
  }
  private async statFile(filePath: string): Promise<Stats | null> {
    try {
      return await fsPromises.stat(filePath);
    } catch {
      return null;
    }
  }

  middleware() {
    return async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
      try {
        const requestedPath = path.join(this.options.root, decodeURIComponent(req.url || '/'));
        let resolvedPath = path.resolve(requestedPath);

        if (!resolvedPath.startsWith(this.options.root)) {
          res.writeHead(403);
          res.end('Forbidden');
          return;
        }

        if (!this.options.allowDotfiles && path.basename(resolvedPath).startsWith('.')) {
          res.writeHead(403);
          res.end('Forbidden');
          return;
        }

        let stat = await this.statFile(resolvedPath);

        if (!stat) {
          const indexFile = path.join(resolvedPath, this.options.defaultFile || 'index.html');
          stat = await this.statFile(indexFile);
          if (stat) {
            resolvedPath = indexFile;
          } else {
            next();
            return;
          }
        }

        if (stat.isDirectory()) {
          next();
          return;
        }

        res.writeHead(200, {
          'Content-Type': this.getMimeType(resolvedPath),
          'Cache-Control': this.options.cacheControl,
          'Last-Modified': stat.mtime.toUTCString(),
        });

        const stream = createReadStream(resolvedPath);
        stream.pipe(res);

      } catch (error) {
        console.error('StaticFileMiddleware error:', error);
        res.writeHead(500);
        res.end('Internal Server Error');
      }
    };
  }
}