/*!
 * @obinexuscomputing/aerossr v0.1.1
 * (c) 2025 OBINexus Computing
 * Released under the ISC License
 */
import * as crypto from 'crypto';

function generateETag(content, options = {}) {
    const hash = crypto.createHash('md5').update(content).digest('hex');
    return options.weak ? `W/"${hash}"` : `"${hash}"`;
}

export { generateETag };
/*!
 * End of bundle for @obinexuscomputing/aerossr
 */
//# sourceMappingURL=etag.js.map
