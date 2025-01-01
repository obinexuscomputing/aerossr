import * as crypto from 'crypto';

export interface ETagOptions {
  weak?: boolean;
}

export function generateETag(content: string | Buffer, options: ETagOptions = {}): string {
  const hash = crypto.createHash('md5').update(content).digest('hex');
  return options.weak ? `W/"${hash}"` : `"${hash}"`;
}