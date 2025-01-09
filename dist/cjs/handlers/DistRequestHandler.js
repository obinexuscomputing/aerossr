/*!
  @obinexuscomputing/aerossr v0.1.1
  (c) 2025 OBINexus Computing
  Released under the ISC License
 */
'use strict';

var zlib = require('zlib');
var util = require('util');
require('../utils/security/CorsManager.js');
var ETagGenerator = require('../utils/security/ETagGenerator.js');

const gzipAsync = util.promisify(zlib.gzip);
class DistRequestHandler {
    bundler;
    config;
    logger;
    constructor(bundler, config, logger) {
        this.bundler = bundler;
        this.config = config;
        this.logger = logger;
        // Validate dependencies
        if (!bundler)
            throw new Error('Bundler is required');
        if (!config)
            throw new Error('Config is required');
        if (!logger)
            throw new Error('Logger is required');
    }
    /**
     * Handle distribution request for bundled JavaScript
     */
    async handleDistRequest(req, res) {
        try {
            // Get entry point from query
            const entryPoint = this.getEntryPoint(req);
            // Generate bundle
            const bundle = await this.generateBundle(entryPoint);
            // Handle caching using ETag
            const etag = this.generateETag(bundle.code);
            if (this.isNotModified(req, etag)) {
                return this.sendNotModified(res);
            }
            // Send response
            await this.sendResponse(res, bundle.code, etag);
        }
        catch (error) {
            await this.handleError(error, req, res);
        }
    }
    /**
     * Get entry point from request query
     */
    getEntryPoint(req) {
        return req.query.entryPoint || 'main.js';
    }
    /**
     * Generate bundle with options
     */
    async generateBundle(entryPoint) {
        const options = {
            minify: true,
            sourceMap: false
        };
        return await this.bundler.generateBundle(entryPoint, options);
    }
    /**
     * Generate ETag for content
     */
    generateETag(content) {
        return ETagGenerator.etagGenerator.generate(content);
    }
    /**
     * Check if content is not modified
     */
    isNotModified(req, etag) {
        return req.headers['if-none-match'] === etag;
    }
    /**
     * Send 304 Not Modified response
     */
    sendNotModified(res) {
        res.raw.writeHead(304);
        res.raw.end();
    }
    /**
     * Create response headers
     */
    createHeaders(etag) {
        return {
            'Content-Type': 'application/javascript',
            'Cache-Control': `public, max-age=${this.config.cacheMaxAge}`,
            'ETag': etag
        };
    }
    /**
     * Send response with optional compression
     */
    async sendResponse(res, content, etag) {
        const headers = this.createHeaders(etag);
        if (this.shouldCompress(this.config, res)) {
            await this.sendCompressed(res, content, headers);
        }
        else {
            this.sendUncompressed(res, content, headers);
        }
    }
    /**
     * Check if response should be compressed
     */
    shouldCompress(config, res) {
        const acceptEncoding = res.raw.req.headers['accept-encoding'];
        return config.compression && acceptEncoding?.includes('gzip');
    }
    /**
     * Send compressed response
     */
    async sendCompressed(res, content, headers) {
        try {
            const compressed = await gzipAsync(content);
            const compressedHeaders = {
                ...headers,
                'Content-Encoding': 'gzip',
                'Vary': 'Accept-Encoding'
            };
            res.raw.writeHead(200, compressedHeaders);
            res.raw.end(compressed);
        }
        catch (error) {
            this.logger.error('Compression failed, falling back to uncompressed', error);
            this.sendUncompressed(res, content, headers);
        }
    }
    /**
     * Send uncompressed response
     */
    sendUncompressed(res, content, headers) {
        res.raw.writeHead(200, headers);
        res.raw.end(content);
    }
    /**
     * Handle errors
     */
    async handleError(error, req, res) {
        const bundleError = new Error(`Bundle generation failed: ${error instanceof Error ? error.message : String(error)}`);
        if (error instanceof Error) {
            bundleError.cause = error;
            this.logger.error('Bundle generation failed', error);
        }
        if (this.config.errorHandler) {
            await this.config.errorHandler(bundleError, req.raw, res.raw);
        }
        else {
            this.sendErrorResponse(res);
        }
    }
    /**
     * Send error response
     */
    sendErrorResponse(res) {
        res.raw.writeHead(500, { 'Content-Type': 'text/plain' });
        res.raw.end('Internal Server Error');
    }
}

exports.DistRequestHandler = DistRequestHandler;
//# sourceMappingURL=DistRequestHandler.js.map
