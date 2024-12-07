import * as crypto from 'crypto';

export function generateETag(content: string | Buffer): string {
  return crypto.createHash('md5').update(content).digest('hex');
}