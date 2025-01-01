import { createReadStream, Stats } from 'fs';
import { stat, readFile } from 'fs/promises';
import * as path from 'path';
import { promisify } from 'util';
import { gzip, createGzip } from 'zlib';
import { IncomingMessage, ServerResponse } from 'http';
import { generateETag } from '../utils';
import { StaticFileOptions } from '@/types';

const gzipAsync = promisify(gzip);


export class StaticFileMiddleware {
  private readonly root: string;
  private readonly maxAge: number;
  private readonly index: string[];
  private readonly dotFiles: 'ignore' | 'allow' | 'deny';
  private readonly compression: boolean;
  private readonly etag: boolean;

  constructor(options: StaticFileOptions) {
    this.root = options.root;
    this.maxAge = options.maxAge || 86400; // Default 24 hours
    this.index = options.index || ['index.html'];
    this.dotFiles = options.dotFiles || 'ignore';
    this.compression = options.compression !== false;
    this.etag = options.etag !== false;
  }

  private isDotFile(urlPath: string): boolean {
    return urlPath.split('/').some(part => part.startsWith('.'));
  }

  private async handleDotFile(
    req: IncomingMessage,
    res: ServerResponse,
    next: () => Promise<void>
  ): Promise<boolean> {
    if (this.dotFiles === 'allow') {
      return false; // Continue processing
    }
    if (this.dotFiles === 'deny') {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      res.end('Forbidden');
      return true;
    }
    // ignore - pass to next middleware
    await next();
    return true;
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
      '.wasm': 'application/wasm',
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  private async serveFile(
    filepath: string,
    stats: Stats,
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<void> {
    const mimeType = this.getMimeType(path.extname(filepath).toLowerCase());
    const lastModified = stats.mtime.toUTCString();

    // Handle conditional requests
    const ifModifiedSince = req.headers['if-modified-since'];
    const ifNoneMatch = req.headers['if-none-match'];
    const etag = this.etag ? generateETag(`${filepath}:${stats.mtime.toISOString()}`) : null;

    if (etag && ifNoneMatch === etag || 
        (ifModifiedSince && new Date(ifModifiedSince).getTime() >= stats.mtime.getTime())) {
      res.writeHead(304);
      res.end();
      return;
    }

    const headers: Record<string, string> = {
      'Content-Type': mimeType,
      'Cache-Control': `public, max-age=${this.maxAge}`,
      'Last-Modified': lastModified,
    };

    if (etag) {
      headers['ETag'] = etag;
    }

    // Handle compression for suitable files
    if (this.compression && this.isCompressible(mimeType) && stats.size > 1024) {
      const acceptEncoding = req.headers['accept-encoding'] || '';
      if (acceptEncoding.includes('gzip')) {
        headers['Content-Encoding'] = 'gzip';
        headers['Vary'] = 'Accept-Encoding';
        res.writeHead(200, headers);

        // Use streaming for large files
        if (stats.size > 1024 * 1024) { // 1MB threshold
          const stream = createReadStream(filepath).pipe(createGzip());
          stream.pipe(res);
          return;
        } else {
          // Use buffer compression for smaller files
          const content = await readFile(filepath);
          const compressed = await gzipAsync(content);
          res.end(compressed);
          return;
        }
      }
    }

    // Serve uncompressed
    res.writeHead(200, headers);
    if (stats.size > 1024 * 1024) { // 1MB threshold
      createReadStream(filepath).pipe(res);
    } else {
      const content = await readFile(filepath);
      res.end(content);
    }
  }

  middleware() {
    return async (req: IncomingMessage, res: ServerResponse, next: () => Promise<void>) => {
      try {
        // Only handle GET and HEAD requests
        if (req.method !== 'GET' && req.method !== 'HEAD') {
          await next();
          return;
        }

        const urlPath = path.normalize(decodeURIComponent(req.url || '').split('?')[0]);
        
        // Security check for dotfiles
        if (this.isDotFile(urlPath)) {
          const handled = await this.handleDotFile(req, res, next);
          if (handled) return;
        }

        // Prevent directory traversal
        const fullPath = path.join(this.root, urlPath);
        if (!fullPath.startsWith(this.root)) {
          res.writeHead(403);
          res.end('Forbidden');
          return;
        }

        try {
          const stats = await stat(fullPath);

          if (stats.isDirectory()) {
            // Try each index file
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
          } else {
            throw error;
          }
        }
      } catch (error) {
        res.writeHead(500);
        res.end('Internal Server Error');
      }
    };
  }
}