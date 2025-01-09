import { IncomingMessage, ServerResponse } from 'http';
import { gzip } from 'zlib';
import { promisify } from 'util';
import { Logger } from '@/types';
import { etagGenerator } from '@/utils';
import { AeroSSRBundler } from './bundler';

const gzipAsync = promisify(gzip);

export class DistHandler {
  constructor(
    private readonly bundler: AeroSSRBundler,
    private readonly logger: Logger,
    private readonly compression: boolean = true,
    private readonly cacheMaxAge: number = 3600
  ) {}

  public async handleDistRequest(
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
        'Cache-Control': `public, max-age=${this.cacheMaxAge}`,
        'ETag': etag,
      };

      if (this.compression && req.headers['accept-encoding']?.includes('gzip')) {
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
      this.logger.error(`Bundle generation failed: ${error}`);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
    }
  }
}