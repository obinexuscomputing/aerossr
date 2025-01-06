// src/utils/cors.ts
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

  constructor(options: CorsOptions = {}) {
    this.defaultOptions = {
      origins: '*',
      methods: ['GET', 'POST', 'OPTIONS', 'HEAD'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      exposedHeaders: [],
      credentials: false,
      maxAge: 86400,
      ...options
    };
  }

  /**
   * Sets CORS headers on response
   */
  public setCorsHeaders(
    res: ServerResponse,
    options: CorsOptions = {}
  ): void {
    const mergedOptions = { ...this.defaultOptions, ...options };
    const {
      origins,
      methods,
      allowedHeaders,
      exposedHeaders,
      credentials,
      maxAge
    } = mergedOptions;

    // Set main CORS headers
    res.setHeader(
      'Access-Control-Allow-Origin',
      Array.isArray(origins) ? origins.join(',') : origins
    );
    
    res.setHeader(
      'Access-Control-Allow-Methods',
      methods.join(', ')
    );
    
    res.setHeader(
      'Access-Control-Allow-Headers',
      allowedHeaders.join(', ')
    );

    // Set optional headers
    if (exposedHeaders.length) {
      res.setHeader(
        'Access-Control-Expose-Headers',
        exposedHeaders.join(', ')
      );
    }

    if (credentials) {
      res.setHeader(
        'Access-Control-Allow-Credentials',
        'true'
      );
    }

    res.setHeader(
      'Access-Control-Max-Age',
      maxAge.toString()
    );
  }

  /**
   * Handles preflight requests
   */
  public handlePreflight(
    res: ServerResponse,
    options: CorsOptions = {}
  ): void {
    this.setCorsHeaders(res, options);
    res.writeHead(204);
    res.end();
  }

  /**
   * Normalizes CORS options
   */
  public normalizeCorsOptions(
    options?: string | CorsOptions
  ): CorsOptions {
    if (typeof options === 'string') {
      return { origins: options };
    }
    return options || { origins: '*' };
  }

  /**
   * Updates default options
   */
  public updateDefaults(options: Partial<CorsOptions>): void {
    Object.assign(this.defaultOptions, options);
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