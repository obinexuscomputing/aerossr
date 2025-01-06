/*!
  @obinexuscomputing/aerossr v0.1.1
  (c) 2025 OBINexus Computing
  Released under the ISC License
 */
'use strict';

class CORSManager {
    defaultOptions;
    constructor(options = {}) {
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
    setCorsHeaders(res, options = {}) {
        const mergedOptions = { ...this.defaultOptions, ...options };
        const { origins, methods, allowedHeaders, exposedHeaders, credentials, maxAge } = mergedOptions;
        // Set main CORS headers
        res.setHeader('Access-Control-Allow-Origin', Array.isArray(origins) ? origins.join(',') : origins);
        res.setHeader('Access-Control-Allow-Methods', methods.join(', '));
        res.setHeader('Access-Control-Allow-Headers', allowedHeaders.join(', '));
        // Set optional headers
        if (exposedHeaders.length) {
            res.setHeader('Access-Control-Expose-Headers', exposedHeaders.join(', '));
        }
        if (credentials) {
            res.setHeader('Access-Control-Allow-Credentials', 'true');
        }
        res.setHeader('Access-Control-Max-Age', maxAge.toString());
    }
    /**
     * Handles preflight requests
     */
    handlePreflight(res, options = {}) {
        this.setCorsHeaders(res, options);
        res.writeHead(204);
        res.end();
    }
    /**
     * Normalizes CORS options
     */
    normalizeCorsOptions(options) {
        if (typeof options === 'string') {
            return { origins: options };
        }
        return options || { origins: '*' };
    }
    /**
     * Updates default options
     */
    updateDefaults(options) {
        Object.assign(this.defaultOptions, options);
    }
    /**
     * Gets current default options
     */
    getDefaults() {
        return { ...this.defaultOptions };
    }
}
// Export singleton instance
const corsManager = new CORSManager();

exports.CORSManager = CORSManager;
exports.corsManager = corsManager;
//# sourceMappingURL=CorsManager.js.map
