'use strict';

var crypto = require('crypto');

function generateETag(content) {
    return crypto.createHash('md5').update(content).digest('hex');
}

exports.generateETag = generateETag;
//# sourceMappingURL=etag.cjs.map
