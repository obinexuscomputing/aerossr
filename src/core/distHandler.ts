import { Request, Response } from '../http';
import { CustomError } from '@/utils/error';
import { gzip } from 'zlib';
import { promisify } from 'util';
import { etagGenerator } from '@/utils/security';

const gzipAsync = promisify(gzip);

interface DistHeaders {
  'Content-Type': string;
  'Cache-Control': string;
  'ETag': string;
  'Content-Encoding'?: string;
  'Vary'?: string;
  [header: string]: string | undefined;
}

export class DistRequestHandler {
  constructor(
    private readonly bundler: any,
    private readonly config: any,
    private readonly logger: any
  ) {}

  public async handleDistRequest(req: Request, res: Response): Promise<void> {
    try {
      const query = req.query;
      const entryPoint = query.entryPoint as string || 'main.js';

      const bundle = await this.bundler.generateBundle(entryPoint, {
        minify: true,
        sourceMap: false
      });

      const etag = etagGenerator.generate(bundle.code);
      if (req.headers['if-none-match'] === etag) {
        res.raw.writeHead(304);
        res.raw.end();
        return;
      }

      const headers: DistHeaders = {
        'Content-Type': 'application/javascript',
        'Cache-Control': `public, max-age=${this.config.cacheMaxAge}`,
        'ETag': etag
      };

      if (this.config.compression && req.headers['accept-encoding']?.includes('gzip')) {
        const compressed = await gzipAsync(bundle.code);
        headers['Content-Encoding'] = 'gzip';
        headers['Vary'] = 'Accept-Encoding';
        res.raw.writeHead(200, headers);
        res.raw.end(compressed);
      } else {
        res.raw.writeHead(200, headers);
        res.raw.end(bundle.code);
      }

    } catch (error) {
      const bundleError = new Error(
        `Bundle generation failed: ${error instanceof Error ? error.message : String(error)}`
      ) as CustomError;

      if (error instanceof Error) {
        bundleError.cause = error;
      }

      // Using the raw error handler since we're already in an error state
      if (this.config.errorHandler) {
        await this.config.errorHandler(bundleError, req.raw, res.raw);
      } else {
        // Fallback error handling
        res.raw.writeHead(500, { 'Content-Type': 'text/plain' });
        res.raw.end('Internal Server Error');
      }
    }
  }
}