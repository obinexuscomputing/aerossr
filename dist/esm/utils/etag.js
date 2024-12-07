import * as crypto from 'crypto';

function generateETag(content) {
    return crypto.createHash('md5').update(content).digest('hex');
}

export { generateETag };
//# sourceMappingURL=etag.js.map
