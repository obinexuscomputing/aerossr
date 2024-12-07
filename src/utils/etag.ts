import * as crypto from 'crypto';

export interface MetaTags {
  charset?: string;
  viewport?: string;
  description?: string;
  title?: string;
  [key: string]: string | undefined;
}

export function generateETag(content: string | Buffer): string {
  return crypto.createHash('md5').update(content).digest('hex');
}