import { createReadStream, Stats } from 'fs';
import { stat, readFile } from 'fs/promises';
import * as path from 'path';
import { createGzip, gzip } from 'zlib';
import { promisify } from 'util';
import { IncomingMessage, ServerResponse } from 'http';
import { generateETag } from '../utils/etag';
import { Middleware, StaticFileOptions } from '../types';

const gzipAsync = promisify(gzip);


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

  private async handleFile(
    filePath: string, 
    req: IncomingMessage, 
    res: ServerResponse
  ): Promise<boolean> {
    try {
      const stats = await stat(filePath);
      
      if (stats.isFile()) {
        await this.serveFile(filePath, stats, req, res);
        return true;
      }
      
      if (stats.isDirectory()) {
        for (const indexFile of this.index) {
          const indexPath = path.join(filePath, indexFile);
          try {
            const indexStats = await stat(indexPath);
            if (indexStats.isFile()) {
              await this.serveFile(indexPath, indexStats, req, res);
              return true;
            }
          } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
              throw error;
            }
          }
        }
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return false;
      }
      throw error;
    }
    return false;
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

        // Check for dot files
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

        // Resolve full path
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

  private isDotFile(urlPath: string): boolean {
    return urlPath.split('/').some(part => part.startsWith('.') && part !== '.' && part !== '..');
  }

  private async serveFile(
    filepath: string,
    stats: Stats,
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<void> {
    const mimeType = this.getMimeType(path.extname(filepath));
    const lastModified = stats.mtime.toUTCString();
    const etag = this.etag ? generateETag(`${stats.size}-${stats.mtime.getTime()}`) : null;

    // Handle conditional requests
    const ifModifiedSince = req.headers['if-modified-since'];
    const ifNoneMatch = req.headers['if-none-match'];

    if (ifNoneMatch && etag && ifNoneMatch === etag) {
      res.writeHead(304);
      res.end();
      return;
    }

    if (ifModifiedSince && new Date(ifModifiedSince) >= stats.mtime) {
      res.writeHead(304);
      res.end();
      return;
    }

    const headers: Record<string, string> = {
      'Content-Type': mimeType,
      'Cache-Control': `public, max-age=${this.maxAge}`,
      'Last-Modified': lastModified
    };

    if (etag) {
      headers['ETag'] = etag;
    }

    const acceptEncoding = req.headers['accept-encoding'] as string;
    const shouldCompress = 
      this.compression && 
      this.isCompressible(mimeType) && 
      acceptEncoding?.includes('gzip');

    if (shouldCompress) {
      headers['Content-Encoding'] = 'gzip';
      headers['Vary'] = 'Accept-Encoding';
    }

    res.writeHead(200, headers);

    // HEAD requests should only return headers
    if (req.method === 'HEAD') {
      res.end();
      return;
    }

    // Handle file serving
    if (stats.size > 1024 * 1024) { // 1MB threshold
      const stream = createReadStream(filepath);
      if (shouldCompress) {
        const gzipStream = createGzip();
        stream
          .on('error', () => res.end())
          .pipe(gzipStream)
          .on('error', () => res.end())
          .pipe(res);
      } else {
        stream
          .on('error', () => res.end())
          .pipe(res);
      }
    } else {
      try {
        const content = await readFile(filepath);
        if (shouldCompress) {
          const compressed = await gzipAsync(content);
          res.end(compressed);
        } else {
          res.end(content);
        }
      } catch (error) {
        res.end();
      }
    }
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
    return mimeTypes[ext.toLowerCase()] || 'application/octet-stream';
  }
}