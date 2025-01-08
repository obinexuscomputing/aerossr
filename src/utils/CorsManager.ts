import { ServerResponse } from 'http';
import { CorsOptionsBase } from '@/types';

export interface CorsOptions extends CorsOptionsBase {
  origins?: string | string[];
  methods?: string[];
  allowedHeaders?: string[];
  exposedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
}

export class CORSManager {
  private readonly defaultOptions: Required<CorsOptions>;

  constructor(options: Partial<CorsOptions> = {}) {
    this.defaultOptions = {
      origins: '*',
      methods: ['GET', 'POST', 'OPTIONS', 'HEAD'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      exposedHeaders: [],
      credentials: false,
      maxAge: 86400,
      ...this.validateOptions(options)
    };
  }

  /**
   * Validates and normalizes CORS options
   */
  private validateOptions(options: Partial<CorsOptions>): Partial<CorsOptions> {
    const validated: Partial<CorsOptions> = {};

    if (options.origins !== undefined) {
      validated.origins = options.origins;
    }

    if (Array.isArray(options.methods)) {
      validated.methods = options.methods.filter(method => 
        typeof method === 'string' && method.length > 0
      );
    }

    if (Array.isArray(options.allowedHeaders)) {
      validated.allowedHeaders = options.allowedHeaders.filter(header => 
        typeof header === 'string' && header.length > 0
      );
    }

    if (Array.isArray(options.exposedHeaders)) {
      validated.exposedHeaders = options.exposedHeaders.filter(header => 
        typeof header === 'string' && header.length > 0
      );
    }

    if (typeof options.credentials === 'boolean') {
      validated.credentials = options.credentials;
    }

    if (typeof options.maxAge === 'number' && !isNaN(options.maxAge)) {
      validated.maxAge = Math.max(0, Math.floor(options.maxAge));
    }

    return validated;
  }

  /**
   * Safely joins array values with fallback
   */
  private safeJoin(arr: any[] | undefined | null, separator: string = ', '): string {
    if (!Array.isArray(arr) || arr.length === 0) {
      return '';
    }
    return arr.filter(item => typeof item === 'string' && item.length > 0).join(separator);
  }

  /**
   * Sets CORS headers on response
   */
  public setCorsHeaders(
    res: ServerResponse,
    options: Partial<CorsOptions> = {}
  ): void {
    if (!res || typeof res.setHeader !== 'function') {
      throw new Error('Invalid ServerResponse object');
    }

    const validOptions = this.validateOptions(options);
    const mergedOptions = { ...this.defaultOptions, ...validOptions };

    try {
      // Set Allow-Origin header
      const origin = Array.isArray(mergedOptions.origins) 
        ? this.safeJoin(mergedOptions.origins, ',') 
        : (mergedOptions.origins || '*');
      res.setHeader('Access-Control-Allow-Origin', origin);

      // Set Allow-Methods header
      const methods = this.safeJoin(mergedOptions.methods);
      if (methods) {
        res.setHeader('Access-Control-Allow-Methods', methods);
      }

      // Set Allow-Headers header
      const allowedHeaders = this.safeJoin(mergedOptions.allowedHeaders);
      if (allowedHeaders) {
        res.setHeader('Access-Control-Allow-Headers', allowedHeaders);
      }

      // Set optional headers
      const exposedHeaders = this.safeJoin(mergedOptions.exposedHeaders);
      if (exposedHeaders) {
        res.setHeader('Access-Control-Expose-Headers', exposedHeaders);
      }

      // Set credentials header
      if (mergedOptions.credentials) {
        res.setHeader('Access-Control-Allow-Credentials', 'true');
      }

      // Set max age header
      if (typeof mergedOptions.maxAge === 'number' && mergedOptions.maxAge >= 0) {
        res.setHeader('Access-Control-Max-Age', mergedOptions.maxAge.toString());
      }
    } catch (error) {
      console.error('Error setting CORS headers:', error);
      throw error;
    }
  }

  /**
   * Handles preflight requests
   */
  public handlePreflight(
    res: ServerResponse,
    options: Partial<CorsOptions> = {}
  ): void {
    try {
      this.setCorsHeaders(res, options);
      if (!res.headersSent) {
        res.writeHead(204);
      }
      res.end();
    } catch (error) {
      console.error('Error handling preflight request:', error);
      if (!res.headersSent) {
        res.writeHead(500);
      }
      res.end();
    }
  }

  /**
   * Normalizes CORS options
   */
  public normalizeCorsOptions(
    options?: string | Partial<CorsOptions>
  ): CorsOptions {
    if (!options) {
      return { origins: '*' };
    }

    if (typeof options === 'string') {
      return { origins: options };
    }

    return this.validateOptions(options) as CorsOptions;
  }

  /**
   * Updates default options
   */
  public updateDefaults(options: Partial<CorsOptions>): void {
    const validOptions = this.validateOptions(options);
    Object.assign(this.defaultOptions, validOptions);
  }

  /**
   * Gets current default options
   */
  public getDefaults(): Required<CorsOptions> {
    return { ...this.defaultOptions };
  }
}

// Export singleton instance
export const corsManager = new CORSManager();