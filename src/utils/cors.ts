import { ServerResponse } from 'http';

export interface CorsOptions {
  origins?: string | string[];
  methods?: string[];
  allowedHeaders?: string[];
  exposedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
}

export function setCorsHeaders(res: ServerResponse, options: CorsOptions = {}): void {
  const {
    origins = '*',
    methods = ['GET', 'POST', 'OPTIONS', 'HEAD'],
    allowedHeaders = ['Content-Type', 'Authorization'],
    exposedHeaders = [],
    credentials = false,
    maxAge = 86400
  } = options;

  res.setHeader('Access-Control-Allow-Origin', Array.isArray(origins) ? origins.join(',') : origins);
  res.setHeader('Access-Control-Allow-Methods', methods.join(', '));
  res.setHeader('Access-Control-Allow-Headers', allowedHeaders.join(', '));
  
  if (exposedHeaders.length) {
    res.setHeader('Access-Control-Expose-Headers', exposedHeaders.join(', '));
  }
  
  if (credentials) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  
  res.setHeader('Access-Control-Max-Age', maxAge.toString());
}