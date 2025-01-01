import * as crypto from 'crypto';

function generateETag(content, options = {}) {
    const hash = crypto.createHash('md5').update(content).digest('hex');
    return options.weak ? `W/"${hash}"` : `"${hash}"`;
}

export { generateETag };
//# sourceMappingURL=etag.js.map
