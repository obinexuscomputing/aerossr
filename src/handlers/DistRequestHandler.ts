// src/handlers/DistRequestHandler.ts
import { Request, Response } from '../http';
import { CustomError } from '@/utils/error';
import { gzip } from 'zlib';
import { promisify } from 'util';
import { etagGenerator } from '@/utils/security';
import { AeroSSRConfig } from '@/types';
import { Logger } from '@/utils/logging';
import { AeroSSRBundler } from '@/core/bundler';

const gzipAsync = promisify(gzip);

// Define header types
interface DistHeaders {
  'Content-Type': string;
  'Cache-Control': string;
  'ETag': string;
  'Content-Encoding'?: string;
  'Vary'?: string;
  [header: string]: string | undefined;
}

// Define bundle options type
interface BundleOptions {
  minify: boolean;
  sourceMap: boolean;
}

export class DistRequestHandler {
  constructor(
    private readonly bundler: AeroSSRBundler,
    private readonly config: Required<AeroSSRConfig>,
    private readonly logger: Logger
  ) {
    // Validate dependencies
    if (!bundler) throw new Error('Bundler is required');
    if (!config) throw new Error('Config is required');
    if (!logger) throw new Error('Logger is required');
  }

  /**
   * Handle distribution request for bundled JavaScript
   */
  public async handleDistRequest(req: Request, res: Response): Promise<void> {
    try {
      // Get entry point from query
      const entryPoint = this.getEntryPoint(req);

      // Generate bundle
      const bundle = await this.generateBundle(entryPoint);

      // Handle caching using ETag
      const etag = this.generateETag(bundle.code);
      if (this.isNotModified(req, etag)) {
        return this.sendNotModified(res);
      }

      // Send response
      await this.sendResponse(res, bundle.code, etag);

    } catch (error) {
      await this.handleError(error, req, res);
    }
  }

  /**
   * Get entry point from request query
   */
  private getEntryPoint(req: Request): string {
    return (req.query.entryPoint as string) || 'main.js';
  }

  /**
   * Generate bundle with options
   */
  private async generateBundle(entryPoint: string) {
    const options: BundleOptions = {
      minify: true,
      sourceMap: false
    };

    return await this.bundler.generateBundle(entryPoint, options);
  }

  /**
   * Generate ETag for content
   */
  private generateETag(content: string): string {
    return etagGenerator.generate(content);
  }

  /**
   * Check if content is not modified
   */
  private isNotModified(req: Request, etag: string): boolean {
    return req.headers['if-none-match'] === etag;
  }

  /**
   * Send 304 Not Modified response
   */
  private sendNotModified(res: Response): void {
    res.raw.writeHead(304);
    res.raw.end();
  }

  /**
   * Create response headers
   */
  private createHeaders(etag: string): DistHeaders {
    return {
      'Content-Type': 'application/javascript',
      'Cache-Control': `public, max-age=${this.config.cacheMaxAge}`,
      'ETag': etag
    };
  }

  /**
   * Send response with optional compression
   */
  private async sendResponse(res: Response, content: string, etag: string): Promise<void> {
    const headers = this.createHeaders(etag);

    if (this.shouldCompress(this.config, res)) {
      await this.sendCompressed(res, content, headers);
    } else {
      this.sendUncompressed(res, content, headers);
    }
  }

  /**
   * Check if response should be compressed
   */
  private shouldCompress(config: Required<AeroSSRConfig>, res: Response): boolean {
    const acceptEncoding = res.raw.req.headers['accept-encoding'] as string;
    return config.compression && acceptEncoding?.includes('gzip');
  }

  /**
   * Send compressed response
   */
  private async sendCompressed(res: Response, content: string, headers: DistHeaders): Promise<void> {
    try {
      const compressed = await gzipAsync(content);
      const compressedHeaders = {
        ...headers,
        'Content-Encoding': 'gzip',
        'Vary': 'Accept-Encoding'
      };

      res.raw.writeHead(200, compressedHeaders);
      res.raw.end(compressed);
    } catch (error) {
      this.logger.error('Compression failed, falling back to uncompressed', error as Error);
      this.sendUncompressed(res, content, headers);
    }
  }

  /**
   * Send uncompressed response
   */
  private sendUncompressed(res: Response, content: string, headers: DistHeaders): void {
    res.raw.writeHead(200, headers);
    res.raw.end(content);
  }

  /**
   * Handle errors
   */
  private async handleError(error: unknown, req: Request, res: Response): Promise<void> {
    const bundleError = new Error(
      `Bundle generation failed: ${error instanceof Error ? error.message : String(error)}`
    ) as CustomError;

    if (error instanceof Error) {
      bundleError.cause = error;
      this.logger.error('Bundle generation failed', error);
    }

    if (this.config.errorHandler) {
      await this.config.errorHandler(bundleError, req.raw, res.raw);
    } else {
      this.sendErrorResponse(res);
    }
  }

  /**
   * Send error response
   */
  private sendErrorResponse(res: Response): void {
    res.raw.writeHead(500, { 'Content-Type': 'text/plain' });
    res.raw.end('Internal Server Error');
  }
}