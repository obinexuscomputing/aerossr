import crypto from 'crypto';
export function generateETag(content) {
    return crypto.createHash('md5').update(content).digest('hex');
}
//# sourceMappingURL=etag.js.map