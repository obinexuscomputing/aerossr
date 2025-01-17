#!/usr/bin/env node

import { Command } from 'commander';
import fs$1, { existsSync, mkdirSync, createReadStream, promises } from 'fs';
import * as path from 'path';
import path__default, { join, resolve } from 'path';
import * as fs from 'fs/promises';
import { stat, readFile } from 'fs/promises';
import * as crypto from 'crypto';
import { createHash } from 'crypto';
import { createServer } from 'http';
import { parse } from 'url';
import { promisify } from 'util';
import { gzip, createGzip } from 'zlib';

class Logger {
    logFilePath;
    options;
    static DEFAULT_OPTIONS = {
        logFilePath: null,
        logLevel: 'info',
        maxFileSize: 10 * 1024 * 1024,
        maxFiles: 5,
        format: 'text'
    };
    constructor(options = {}) {
        if (typeof options === 'string') {
            options = { logFilePath: options };
        }
        this.options = { ...Logger.DEFAULT_OPTIONS, ...options };
        this.logFilePath = this.options.logFilePath;
        if (this.logFilePath) {
            this.initializeLogFile();
        }
    }
    initializeLogFile() {
        try {
            const logDir = path__default.dirname(this.logFilePath);
            if (!existsSync(logDir)) {
                mkdirSync(logDir, { recursive: true });
            }
        }
        catch (error) {
            const err = error;
            console.error(`Logger initialization failed for path: ${this.logFilePath} - ${err.message}`);
            throw err;
        }
    }
    getLogPath() {
        return this.logFilePath;
    }
    formatMessage(message, level = 'info') {
        const timestamp = new Date().toISOString();
        if (this.options.format === 'json') {
            return JSON.stringify({
                timestamp,
                level,
                message
            }) + '\n';
        }
        return `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
    }
    shouldLog(level) {
        const levels = ['debug', 'info', 'warn', 'error'];
        const configuredLevel = levels.indexOf(this.options.logLevel);
        const messageLevel = levels.indexOf(level);
        return messageLevel >= configuredLevel;
    }
    async log(message, level = 'info') {
        if (!this.shouldLog(level)) {
            return;
        }
        const formattedMessage = this.formatMessage(message, level);
        console.log(formattedMessage.trim());
        if (this.logFilePath) {
            try {
                await this.checkRotation();
                await fs.appendFile(this.logFilePath, formattedMessage, 'utf-8');
            }
            catch (error) {
                const err = error;
                console.error(`Failed to write to log file: ${err.message}`);
                throw err;
            }
        }
    }
    async checkRotation() {
        if (!this.logFilePath || !this.options.maxFileSize)
            return;
        try {
            const stats = await fs.stat(this.logFilePath);
            if (stats.size >= this.options.maxFileSize) {
                await this.rotateLogFiles();
            }
        }
        catch (error) {
            console.error(`Failed to check log rotation: ${error.message}`);
        }
    }
    async rotateLogFiles() {
        if (!this.logFilePath)
            return;
        try {
            for (let i = this.options.maxFiles - 1; i > 0; i--) {
                const oldPath = `${this.logFilePath}.${i}`;
                const newPath = `${this.logFilePath}.${i + 1}`;
                if (existsSync(oldPath)) {
                    await fs.rename(oldPath, newPath);
                }
            }
            if (existsSync(this.logFilePath)) {
                await fs.rename(this.logFilePath, `${this.logFilePath}.1`);
            }
            await fs.writeFile(this.logFilePath, '', 'utf-8');
        }
        catch (error) {
            console.error(`Failed to rotate log files: ${error.message}`);
        }
    }
    formatErrorDetails(details) {
        const { message, error, context } = details;
        const parts = [message];
        if (error instanceof Error) {
            parts.push(`Error: ${error.message}`);
            if (error.stack) {
                parts.push(`Stack: ${error.stack}`);
            }
            if (error.cause) {
                parts.push(`Cause: ${error.cause}`);
            }
        }
        else if (error) {
            parts.push(`Additional Info: ${JSON.stringify(error)}`);
        }
        if (context && Object.keys(context).length > 0) {
            parts.push(`Context: ${JSON.stringify(context, null, 2)}`);
        }
        return parts.join('\n');
    }
    async error(messageOrDetails, error) {
        let details;
        if (typeof messageOrDetails === 'string') {
            details = {
                message: messageOrDetails,
                error: error
            };
        }
        else {
            details = messageOrDetails;
        }
        const formattedMessage = this.formatErrorDetails(details);
        await this.log(formattedMessage, 'error');
    }
    async debug(message, context) {
        const formattedMessage = context
            ? `${message}\nContext: ${JSON.stringify(context, null, 2)}`
            : message;
        await this.log(formattedMessage, 'debug');
    }
    async info(message, context) {
        const formattedMessage = context
            ? `${message}\nContext: ${JSON.stringify(context, null, 2)}`
            : message;
        await this.log(formattedMessage, 'info');
    }
    async warn(message, context) {
        const formattedMessage = context
            ? `${message}\nContext: ${JSON.stringify(context, null, 2)}`
            : message;
        await this.log(formattedMessage, 'warn');
    }
    async clear() {
        if (this.logFilePath && existsSync(this.logFilePath)) {
            try {
                await fs.writeFile(this.logFilePath, '', 'utf-8');
            }
            catch (error) {
                const err = error;
                console.error(`Failed to clear log file: ${err.message}`);
                throw err;
            }
        }
    }
    logRequest(req) {
        const { method = 'undefined', url = 'undefined', headers = {} } = req;
        const userAgent = headers['user-agent'] || 'unknown';
        const logMessage = `${method} ${url} - ${userAgent}`;
        void this.log(logMessage, 'info');
    }
}

class ErrorHandler {
    defaultStyles;
    showStack;
    showDetails;
    logger;
    constructor(options = {}) {
        this.defaultStyles = options.styles || `
      body { 
        font-family: system-ui, -apple-system, sans-serif;
        padding: 2rem;
        max-width: 800px;
        margin: 0 auto;
        line-height: 1.5;
        color: #333;
      }
      .error {
        background: #f8d7da;
        border: 1px solid #f5c6cb;
        padding: 1.5rem;
        border-radius: 6px;
        margin: 1rem 0;
      }
      .error-title {
        color: #721c24;
        margin: 0 0 1rem;
      }
      .error-message {
        margin: 0 0 1rem;
        font-size: 1.1rem;
      }
      .details {
        margin-top: 1.5rem;
        padding: 1rem;
        background: #f8f9fa;
        border: 1px solid #dee2e6;
        border-radius: 4px;
        font-family: monospace;
        font-size: 0.9rem;
        white-space: pre-wrap;
        overflow-x: auto;
      }
      .details-title {
        font-weight: bold;
        margin-bottom: 0.5rem;
        color: #495057;
      }
    `;
        this.showStack = options.showStack ?? process.env.NODE_ENV !== 'production';
        this.showDetails = options.showDetails ?? process.env.NODE_ENV !== 'production';
        this.logger = options.logger;
    }
    static generateBasicErrorPage(statusCode, message) {
        return `
      <!DOCTYPE html>
      <html>
      <head>
          <title>Error ${statusCode}</title>
          <style>
            body { font-family: system-ui; padding: 2rem; max-width: 600px; margin: 0 auto; }
            .error { background: #f8d7da; padding: 1rem; border-radius: 4px; }
          </style>
      </head>
      <body>
          <h1>Error ${statusCode}</h1>
          <div class="error">
              <p>${message}</p>
          </div>
      </body>
      </html>
    `;
    }
    generateErrorPage(statusCode, message, error, options = {}) {
        const styles = options.styles || this.defaultStyles;
        const showStack = options.showStack ?? this.showStack;
        const showDetails = options.showDetails ?? this.showDetails;
        let details = '';
        if (error && showDetails) {
            const detailsContent = [];
            if (error.code) {
                detailsContent.push(`<div class="details-title">Error Code:</div>${error.code}`);
            }
            if (error.details) {
                detailsContent.push(`<div class="details-title">Details:</div>${JSON.stringify(error.details, null, 2)}`);
            }
            if (error.stack && showStack) {
                detailsContent.push(`<div class="details-title">Stack Trace:</div>${error.stack.replace(/</g, '&lt;').replace(/>/g, '&gt;')}`);
            }
            if (error.cause && showStack) {
                detailsContent.push(`<div class="details-title">Cause:</div>${error.cause.stack?.replace(/</g, '&lt;').replace(/>/g, '&gt;') || error.cause.message}`);
            }
            if (detailsContent.length > 0) {
                details = `<div class="details">${detailsContent.join('\n')}</div>`;
            }
        }
        return `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Error ${statusCode}</title>
          <style>${styles}</style>
      </head>
      <body>
          <h1 class="error-title">Error ${statusCode}</h1>
          <div class="error">
              <p class="error-message">${message}</p>
              ${details}
          </div>
          <script>
            // Automatically retry on certain errors
            ${statusCode === 503 ? 'setTimeout(() => window.location.reload(), 5000);' : ''}
          </script>
      </body>
      </html>
    `;
    }
    async handleError(error, req, res) {
        try {
            const statusCode = error.statusCode || 500;
            const message = error.message || 'Internal Server Error';
            // Log error details
            const errorDetails = {
                statusCode,
                message,
                path: req.url,
                method: req.method,
                headers: req.headers,
                error: {
                    name: error.name,
                    code: error.code,
                    stack: error.stack,
                    details: error.details,
                    cause: error.cause
                }
            };
            if (this.logger) {
                await this.logger.error(`Server error: ${JSON.stringify(errorDetails, null, 2)}`);
            }
            else {
                console.error('Server error:', errorDetails);
            }
            // Only set headers if they haven't been sent
            if (!res.headersSent) {
                res.writeHead(statusCode, {
                    'Content-Type': 'text/html',
                    'Cache-Control': 'no-store, must-revalidate',
                    'X-Content-Type-Options': 'nosniff'
                });
                const errorPage = this.generateErrorPage(statusCode, message, error);
                res.end(errorPage);
            }
        }
        catch (handlingError) {
            // Fallback error handling if something goes wrong during error handling
            if (!res.headersSent) {
                res.writeHead(500, { 'Content-Type': 'text/html' });
                res.end(ErrorHandler.generateBasicErrorPage(500, 'Internal Server Error'));
            }
            console.error('Error during error handling:', handlingError);
        }
    }
    static async handleErrorStatic(error, req, res, options) {
        const handler = new ErrorHandler(options);
        await handler.handleError(error, req, res);
    }
}

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
            ...this.validateOptions(options)
        };
    }
    /**
     * Validates and normalizes CORS options
     */
    validateOptions(options) {
        const validated = {};
        if (options.origins !== undefined) {
            validated.origins = options.origins;
        }
        if (Array.isArray(options.methods)) {
            validated.methods = options.methods.filter(method => typeof method === 'string' && method.length > 0);
        }
        if (Array.isArray(options.allowedHeaders)) {
            validated.allowedHeaders = options.allowedHeaders.filter(header => typeof header === 'string' && header.length > 0);
        }
        if (Array.isArray(options.exposedHeaders)) {
            validated.exposedHeaders = options.exposedHeaders.filter(header => typeof header === 'string' && header.length > 0);
        }
        if (typeof options.credentials === 'boolean') {
            validated.credentials = options.credentials;
        }
        if (typeof options.maxAge === 'number' && !isNaN(options.maxAge)) {
            validated.maxAge = Math.max(0, Math.floor(options.maxAge));
        }
        return validated;
    }
    /**
     * Safely joins array values with fallback
     */
    safeJoin(arr, separator = ', ') {
        if (!Array.isArray(arr) || arr.length === 0) {
            return '';
        }
        return arr.filter(item => typeof item === 'string' && item.length > 0).join(separator);
    }
    /**
     * Sets CORS headers on response
     */
    setCorsHeaders(res, options = {}) {
        if (!res || typeof res.setHeader !== 'function') {
            throw new Error('Invalid ServerResponse object');
        }
        const validOptions = this.validateOptions(options);
        const mergedOptions = { ...this.defaultOptions, ...validOptions };
        try {
            // Set Allow-Origin header
            const origin = Array.isArray(mergedOptions.origins)
                ? this.safeJoin(mergedOptions.origins, ',')
                : (mergedOptions.origins || '*');
            res.setHeader('Access-Control-Allow-Origin', origin);
            // Set Allow-Methods header
            const methods = this.safeJoin(mergedOptions.methods);
            if (methods) {
                res.setHeader('Access-Control-Allow-Methods', methods);
            }
            // Set Allow-Headers header
            const allowedHeaders = this.safeJoin(mergedOptions.allowedHeaders);
            if (allowedHeaders) {
                res.setHeader('Access-Control-Allow-Headers', allowedHeaders);
            }
            // Set optional headers
            const exposedHeaders = this.safeJoin(mergedOptions.exposedHeaders);
            if (exposedHeaders) {
                res.setHeader('Access-Control-Expose-Headers', exposedHeaders);
            }
            // Set credentials header
            if (mergedOptions.credentials) {
                res.setHeader('Access-Control-Allow-Credentials', 'true');
            }
            // Set max age header
            if (typeof mergedOptions.maxAge === 'number' && mergedOptions.maxAge >= 0) {
                res.setHeader('Access-Control-Max-Age', mergedOptions.maxAge.toString());
            }
        }
        catch (error) {
            console.error('Error setting CORS headers:', error);
            throw error;
        }
    }
    /**
     * Handles preflight requests
     */
    handlePreflight(res, options = {}) {
        try {
            this.setCorsHeaders(res, options);
            if (!res.headersSent) {
                res.writeHead(204);
            }
            res.end();
        }
        catch (error) {
            console.error('Error handling preflight request:', error);
            if (!res.headersSent) {
                res.writeHead(500);
            }
            res.end();
        }
    }
    /**
     * Normalizes CORS options
     */
    normalizeCorsOptions(options) {
        if (!options) {
            return { origins: '*' };
        }
        if (typeof options === 'string') {
            return { origins: options };
        }
        return this.validateOptions(options);
    }
    /**
     * Updates default options
     */
    updateDefaults(options) {
        const validOptions = this.validateOptions(options);
        Object.assign(this.defaultOptions, validOptions);
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

class ETagGenerator {
    defaultOptions;
    cache;
    maxCacheSize;
    constructor(options = {}, maxCacheSize = 1000) {
        this.defaultOptions = {
            weak: false,
            algorithm: 'md5',
            encoding: 'hex',
            ...options
        };
        this.cache = new Map();
        this.maxCacheSize = maxCacheSize;
    }
    /**
     * Generates an ETag for the given content
     */
    generate(content, options = {}) {
        const mergedOptions = { ...this.defaultOptions, ...options };
        const cacheKey = this.getCacheKey(content, mergedOptions);
        // Check cache first
        const cachedETag = this.cache.get(cacheKey);
        if (cachedETag) {
            return cachedETag;
        }
        const hash = this.generateHash(content, mergedOptions);
        const etag = this.formatETag(hash, mergedOptions.weak);
        // Cache the result
        this.cacheETag(cacheKey, etag);
        return etag;
    }
    /**
     * Generates a hash for the given content
     */
    generateHash(content, options) {
        return crypto
            .createHash(options.algorithm)
            .update(content)
            .digest(options.encoding);
    }
    /**
     * Formats the hash as an ETag
     */
    formatETag(hash, weak) {
        return weak ? `W/"${hash}"` : `"${hash}"`;
    }
    /**
     * Generates a cache key for content and options
     */
    getCacheKey(content, options) {
        const contentStr = Buffer.isBuffer(content) ? content.toString('base64') : content;
        return `${contentStr}:${JSON.stringify(options)}`;
    }
    /**
     * Caches an ETag with LRU eviction if needed
     */
    cacheETag(key, etag) {
        if (this.cache.size >= this.maxCacheSize) {
            // Remove oldest entry
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        this.cache.set(key, etag);
    }
    /**
     * Validates if a given string is a valid ETag
     */
    isValid(etag) {
        const strongPattern = /^"[a-f0-9]+?"$/;
        const weakPattern = /^W\/"[a-f0-9]+?"$/;
        return strongPattern.test(etag) || weakPattern.test(etag);
    }
    /**
     * Compares two ETags for equality
     */
    compare(etag1, etag2) {
        const normalize = (etag) => etag.replace(/^W\//, '');
        return normalize(etag1) === normalize(etag2);
    }
    /**
     * Clears the ETag cache
     */
    clearCache() {
        this.cache.clear();
    }
    /**
     * Gets cache statistics
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            maxSize: this.maxCacheSize
        };
    }
    /**
     * Updates the maximum cache size
     */
    setMaxCacheSize(size) {
        this.maxCacheSize = size;
        while (this.cache.size > this.maxCacheSize) {
            // Remove oldest entries until we're under the limit
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
    }
    /**
     * Gets the current default options
     */
    getDefaultOptions() {
        return { ...this.defaultOptions };
    }
    /**
     * Updates the default options
     */
    setDefaultOptions(options) {
        Object.assign(this.defaultOptions, options);
    }
}
function generateETag(content, options = {}) {
    const { weak = false, algorithm = 'md5', encoding = 'hex' } = options;
    const hash = crypto.createHash(algorithm).update(content).digest(encoding);
    return weak ? `W/"${hash}"` : `"${hash}"`;
}
// Export singleton instance
const etagGenerator = new ETagGenerator();

class Request {
    raw;
    params;
    query;
    path;
    method;
    body;
    constructor(req, params = {}) {
        this.raw = req;
        this.params = params;
        this.method = req.method || 'GET';
        const parsedUrl = parse(req.url || '/', true);
        this.path = parsedUrl.pathname || '/';
        this.query = parsedUrl.query;
    }
    header(name) {
        const value = this.raw.headers[name.toLowerCase()];
        return value;
    }
    get headers() {
        return this.raw.headers;
    }
    accepts(type) {
        const accept = this.header('accept');
        if (!accept)
            return false;
        return typeof accept === 'string' ?
            accept.includes(type) || accept.includes('*/*') :
            accept.some(h => h.includes(type) || h.includes('*/*'));
    }
}

class Response {
    raw;
    headersSent = false;
    constructor(res) {
        this.raw = res;
    }
    status(code) {
        this.raw.statusCode = code;
        return this;
    }
    header(name, value) {
        if (!this.headersSent) {
            this.raw.setHeader(name, value);
        }
        return this;
    }
    type(type) {
        return this.header('Content-Type', type);
    }
    send(body) {
        if (this.headersSent)
            return;
        if (typeof body === 'string') {
            this.type('text/plain').end(body);
        }
        else if (Buffer.isBuffer(body)) {
            this.type('application/octet-stream').end(body);
        }
        else if (typeof body === 'object') {
            this.type('application/json').end(JSON.stringify(body));
        }
        else {
            this.type('text/plain').end(String(body));
        }
    }
    json(body) {
        this.type('application/json').send(JSON.stringify(body));
    }
    end(data) {
        this.headersSent = true;
        this.raw.end(data);
    }
}

class RouteBuilder {
    pattern;
    method;
    middlewares = [];
    routeHandler;
    routeMetadata;
    constructor(pattern, method) {
        this.pattern = pattern;
        this.method = method.toUpperCase();
    }
    handler(fn) {
        this.routeHandler = fn;
        return this;
    }
    use(...middleware) {
        this.middlewares.push(...middleware);
        return this;
    }
    metadata(meta) {
        this.routeMetadata = meta;
        return this;
    }
    build() {
        if (!this.routeHandler) {
            throw new Error('Route handler is required');
        }
        return {
            pattern: this.pattern,
            method: this.method,
            handler: this.routeHandler,
            middleware: this.middlewares,
            metadata: this.routeMetadata
        };
    }
}

class Router {
    routes = [];
    strategy;
    observers = [];
    constructor(strategy) {
        this.strategy = strategy;
    }
    addObserver(observer) {
        if (!this.observers.includes(observer)) {
            this.observers.push(observer);
        }
    }
    removeObserver(observer) {
        const index = this.observers.indexOf(observer);
        if (index !== -1) {
            this.observers.splice(index, 1);
        }
    }
    route(pattern, method = 'GET') {
        return new RouteBuilder(pattern, method);
    }
    get(pattern) {
        return this.route(pattern, 'GET');
    }
    post(pattern) {
        return this.route(pattern, 'POST');
    }
    put(pattern) {
        return this.route(pattern, 'PUT');
    }
    delete(pattern) {
        return this.route(pattern, 'DELETE');
    }
    add(routeBuilder) {
        const route = routeBuilder.build();
        this.routes.push(route);
    }
    group(prefix, callback) {
        const subRouter = new Router(this.strategy);
        callback(subRouter);
        subRouter.routes.forEach(route => {
            this.routes.push({
                ...route,
                pattern: prefix + route.pattern
            });
        });
    }
    match(path, method) {
        for (const route of this.routes) {
            if (route.method === method && this.strategy.matches(path, route.pattern)) {
                return {
                    route,
                    params: this.strategy.extractParams(path, route.pattern)
                };
            }
        }
        return undefined;
    }
    async handle(req, res) {
        const url = req.url || '/';
        const method = req.method || 'GET';
        const path = url.split('?')[0];
        // Find matching route
        const match = this.match(path, method);
        if (!match) {
            throw new Error(`No route found for ${method} ${path}`);
        }
        const { route, params } = match;
        this.notifyObservers('matched', route);
        // Create context
        const query = this.strategy.extractQuery(url);
        const context = {
            req,
            res,
            params,
            query,
            state: {},
            next: async () => { } // Will be replaced
        };
        const startTime = Date.now();
        try {
            // Setup middleware chain
            const chain = [...route.middleware];
            let chainIndex = 0;
            const executeChain = async () => {
                if (chainIndex < chain.length) {
                    const middleware = chain[chainIndex++];
                    await middleware(context.req, context.res, context.next);
                    await executeChain();
                }
                else {
                    await route.handler(context);
                }
            };
            // Replace context.next with chain executor
            context.next = executeChain;
            // Start execution
            await executeChain();
            // Record duration and notify
            const duration = Date.now() - startTime;
            this.notifyObservers('executed', route, duration);
        }
        catch (error) {
            // Handle and propagate errors
            const routeError = error instanceof Error ? error : new Error(String(error));
            this.notifyObservers('error', route, routeError);
            throw routeError;
        }
    }
    notifyObservers(event, route, data) {
        this.observers.forEach(observer => {
            try {
                switch (event) {
                    case 'matched':
                        observer.onRouteMatched(route);
                        break;
                    case 'executed':
                        if (typeof data === 'number') {
                            observer.onRouteExecuted(route, data);
                        }
                        break;
                    case 'error':
                        if (data instanceof Error) {
                            observer.onRouteError(route, data);
                        }
                        break;
                }
            }
            catch (error) {
                console.error('Observer notification failed:', error);
            }
        });
    }
}

class DefaultRouteStrategy {
    matches(path, pattern) {
        const pathParts = path.split('/').filter(Boolean);
        const patternParts = pattern.split('/').filter(Boolean);
        if (pathParts.length !== patternParts.length) {
            return false;
        }
        return patternParts.every((part, i) => {
            if (part.startsWith(':')) {
                return true; // Parameter matches anything
            }
            return part === pathParts[i];
        });
    }
    extractParams(path, pattern) {
        const params = {};
        const pathParts = path.split('/').filter(Boolean);
        const patternParts = pattern.split('/').filter(Boolean);
        patternParts.forEach((part, i) => {
            if (part.startsWith(':')) {
                const paramName = part.slice(1).replace('?', ''); // Remove : and optional ?
                params[paramName] = pathParts[i];
            }
        });
        return params;
    }
    extractQuery(url) {
        const queryParams = {};
        const queryIndex = url.indexOf('?');
        if (queryIndex === -1) {
            return queryParams;
        }
        const queryString = url.slice(queryIndex + 1);
        const searchParams = new URLSearchParams(queryString);
        for (const [key, value] of searchParams.entries()) {
            queryParams[key] = value;
        }
        return queryParams;
    }
}

const gzipAsync$2 = promisify(gzip);
class StaticFileMiddleware {
    root;
    maxAge;
    index;
    dotFiles;
    compression;
    etag;
    headers;
    constructor(options) {
        this.root = path.resolve(options.root);
        this.maxAge = options.maxAge || 86400;
        this.index = options.index || ['index.html'];
        this.dotFiles = options.dotFiles || 'ignore';
        this.compression = options.compression !== false;
        this.etag = options.etag !== false;
        this.headers = options.headers || {};
    }
    isDotFile(urlPath) {
        return urlPath.split('/').some(part => part.startsWith('.'));
    }
    isCompressible(mimeType) {
        return /^(text|application)\/(javascript|json|html|xml|css|plain)/.test(mimeType);
    }
    getMimeType(ext) {
        const mimeTypes = {
            '.html': 'text/html',
            '.js': 'application/javascript',
            '.css': 'text/css',
            '.json': 'application/json',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml',
            '.wav': 'audio/wav',
            '.mp4': 'video/mp4',
            '.woff': 'application/font-woff',
            '.ttf': 'application/font-ttf',
            '.eot': 'application/vnd.ms-fontobject',
            '.otf': 'application/font-otf',
            '.wasm': 'application/wasm'
        };
        return mimeTypes[ext] || 'application/octet-stream';
    }
    async handleFile(filepath, req, res) {
        try {
            const stats = await stat(filepath);
            if (stats.isDirectory()) {
                for (const indexFile of this.index) {
                    const indexPath = path.join(filepath, indexFile);
                    try {
                        const indexStats = await stat(indexPath);
                        if (indexStats.isFile()) {
                            await this.serveFile(indexPath, indexStats, req, res);
                            return true;
                        }
                    }
                    catch {
                        continue;
                    }
                }
                return false;
            }
            if (stats.isFile()) {
                await this.serveFile(filepath, stats, req, res);
                return true;
            }
            return false;
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                return false;
            }
            throw error;
        }
    }
    async serveFile(filepath, stats, req, res) {
        const mimeType = this.getMimeType(path.extname(filepath).toLowerCase());
        const headers = {
            'Content-Type': mimeType,
            'Cache-Control': `public, max-age=${this.maxAge}`,
            'Last-Modified': stats.mtime.toUTCString(),
            ...this.headers
        };
        if (this.etag) {
            const etag = generateETag(`${filepath}:${stats.mtime.toISOString()}`);
            headers['ETag'] = etag;
            if (req.headers['if-none-match'] === etag) {
                res.writeHead(304, headers);
                res.end();
                return;
            }
        }
        if (req.headers['if-modified-since']) {
            const ifModifiedSince = new Date(req.headers['if-modified-since']);
            if (ifModifiedSince.getTime() >= stats.mtime.getTime()) {
                res.writeHead(304, headers);
                res.end();
                return;
            }
        }
        // Handle range requests
        if (req.headers.range) {
            const range = req.headers.range.match(/bytes=(\d*)-(\d*)/);
            if (range) {
                const start = parseInt(range[1], 10);
                const end = range[2] ? parseInt(range[2], 10) : stats.size - 1;
                headers['Content-Range'] = `bytes ${start}-${end}/${stats.size}`;
                headers['Content-Length'] = String(end - start + 1);
                headers['Accept-Ranges'] = 'bytes';
                res.writeHead(206, headers);
                createReadStream(filepath, { start, end }).pipe(res);
                return;
            }
        }
        // Handle compression
        if (this.compression &&
            this.isCompressible(mimeType) &&
            req.headers['accept-encoding']?.includes('gzip')) {
            headers['Content-Encoding'] = 'gzip';
            headers['Vary'] = 'Accept-Encoding';
            res.writeHead(200, headers);
            if (stats.size > 1024 * 1024) { // 1MB threshold
                createReadStream(filepath).pipe(createGzip()).pipe(res);
            }
            else {
                const content = await readFile(filepath);
                const compressed = await gzipAsync$2(content);
                res.end(compressed);
            }
            return;
        }
        // Regular file serving
        res.writeHead(200, headers);
        if (req.method === 'HEAD') {
            res.end();
            return;
        }
        if (stats.size > 1024 * 1024) { // 1MB threshold
            createReadStream(filepath).pipe(res);
        }
        else {
            const content = await readFile(filepath);
            res.end(content);
        }
    }
    middleware() {
        return async (req, res, next) => {
            try {
                if (req.method !== 'GET' && req.method !== 'HEAD') {
                    await next();
                    return;
                }
                const urlPath = decodeURIComponent(req.url?.split('?')[0] || '/');
                const normalizedPath = path.normalize(urlPath);
                if (this.isDotFile(normalizedPath)) {
                    if (this.dotFiles === 'deny') {
                        res.writeHead(403, { 'Content-Type': 'text/plain' });
                        res.end('Forbidden');
                        return;
                    }
                    if (this.dotFiles === 'ignore') {
                        await next();
                        return;
                    }
                }
                const fullPath = path.join(this.root, normalizedPath);
                const relative = path.relative(this.root, fullPath);
                if (relative.includes('..') || path.isAbsolute(relative)) {
                    res.writeHead(403, { 'Content-Type': 'text/plain' });
                    res.end('Forbidden');
                    return;
                }
                const handled = await this.handleFile(fullPath, req, res);
                if (!handled) {
                    await next();
                }
            }
            catch (error) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Internal Server Error');
            }
        };
    }
}

function createCache() {
    const store = new Map();
    return {
        size: store.size,
        get(key) {
            return store.get(key);
        },
        set(key, value) {
            store.set(key, value);
        },
        clear() {
            store.clear();
        }
    };
}

class HTMLManager {
    defaultMeta;
    constructor(defaultMeta = {}) {
        this.defaultMeta = {
            charset: 'utf-8',
            viewport: 'width=device-width, initial-scale=1.0',
            title: '',
            description: '',
            keywords: '',
            author: '',
            ogTitle: '',
            ogDescription: '',
            ogImage: '',
            twitterCard: 'summary',
            twitterTitle: '',
            twitterDescription: '',
            twitterImage: '',
            ...defaultMeta
        };
    }
    /**
     * Updates default meta tags
     */
    setDefaultMeta(meta) {
        this.defaultMeta = {
            ...this.defaultMeta,
            ...meta
        };
    }
    /**
     * Gets current default meta tags
     */
    getDefaultMeta() {
        return { ...this.defaultMeta };
    }
    /**
     * Formats a meta tag based on type and content
     */
    formatMetaTag(key, value) {
        if (key === 'title') {
            return `<title>${this.sanitizeContent(value)}</title>`;
        }
        if (key.startsWith('og')) {
            return `<meta property="og:${key.slice(2).toLowerCase()}" content="${this.sanitizeContent(value)}">`;
        }
        if (key.startsWith('twitter')) {
            return `<meta name="twitter:${key.slice(7).toLowerCase()}" content="${this.sanitizeContent(value)}">`;
        }
        if (key === 'charset') {
            return `<meta charset="${this.sanitizeContent(value)}">`;
        }
        return `<meta name="${key}" content="${this.sanitizeContent(value)}">`;
    }
    /**
     * Injects meta tags into HTML
     */
    injectMetaTags(html, meta = {}) {
        const finalMeta = {
            ...this.defaultMeta,
            ...meta
        };
        const metaTags = Object.entries(finalMeta)
            .filter(([_, value]) => value !== undefined && value !== '')
            .map(([key, value]) => this.formatMetaTag(key, String(value)))
            .join('\n    ');
        return html.replace('</head>', `    ${metaTags}\n  </head>`);
    }
    /**
     * Validates meta tags structure
     */
    validateMetaTags(meta) {
        const validations = {
            title: (value) => value.length <= 60,
            description: (value) => value.length <= 160,
            keywords: (value) => value.split(',').length <= 10,
            ogImage: (value) => /^https?:\/\/.+/.test(value),
            twitterImage: (value) => /^https?:\/\/.+/.test(value)
        };
        return Object.entries(meta).every(([key, value]) => {
            if (!value || typeof value !== 'string')
                return true;
            const validator = validations[key];
            return validator ? validator(value) : true;
        });
    }
    /**
     * Sanitizes meta tag content
     */
    sanitizeContent(content) {
        return content
            .replace(/<\/?[^>]+(>|$)/g, '') // Remove HTML tags
            .replace(/"/g, '&quot;') // Escape quotes
            .replace(/&/g, '&amp;') // Escape ampersands
            .replace(/</g, '&lt;') // Escape less than
            .replace(/>/g, '&gt;') // Escape greater than
            .trim();
    }
    /**
     * Helper method to decode HTML entities
     */
    decodeHTMLEntities(str) {
        const textarea = document.createElement('textarea');
        textarea.innerHTML = str;
        return textarea.value;
    }
    /**
     * Convert property name to camelCase
     */
    propertyNameToCamelCase(name) {
        if (name.startsWith('og:')) {
            const ogProp = name.slice(3);
            return 'og' + ogProp.charAt(0).toUpperCase() + ogProp.slice(1);
        }
        if (name.startsWith('twitter:')) {
            const twitterProp = name.slice(8);
            return 'twitter' + twitterProp.charAt(0).toUpperCase() + twitterProp.slice(1);
        }
        return name.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    }
    /**
     * Extracts existing meta tags from HTML
     */
    extractMetaTags(html) {
        const meta = {};
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (titleMatch) {
            meta.title = this.decodeHTMLEntities(titleMatch[1]);
        }
        const metaTagPattern = /<meta\s+(?:[^>]*?\s+)?(?:name|property)="([^"]+)"[^>]*?content="([^"]+)"[^>]*>/g;
        let match;
        while ((match = metaTagPattern.exec(html)) !== null) {
            const [_, nameOrProperty, content] = match;
            if (!nameOrProperty || !content)
                continue;
            const propertyName = this.propertyNameToCamelCase(nameOrProperty);
            const decodedContent = this.decodeHTMLEntities(content);
            if (nameOrProperty === 'charset') {
                meta.charset = decodedContent;
            }
            else {
                meta[propertyName] = decodedContent;
            }
        }
        const charsetMatch = html.match(/<meta\s+charset="([^"]+)"[^>]*>/i);
        if (charsetMatch) {
            meta.charset = this.decodeHTMLEntities(charsetMatch[1]);
        }
        return meta;
    }
    /**
     * Creates meta tags object with sanitized values
     */
    createMetaTags(meta) {
        return Object.entries(meta).reduce((acc, [key, value]) => {
            if (value !== undefined && typeof value === 'string') {
                const sanitized = this.sanitizeContent(value);
                acc[key] = this.decodeHTMLEntities(sanitized);
            }
            return acc;
        }, {});
    }
    /**
     * Generates complete HTML document with meta tags
     */
    generateHTML(content, meta = {}) {
        const baseHTML = `
<!DOCTYPE html>
<html>
<head>
</head>
<body>
  ${content}
</body>
</html>`;
        return this.injectMetaTags(baseHTML, meta);
    }
}
// Export singleton instance
const htmlManager = new HTMLManager();

const gzipAsync$1 = promisify(gzip);
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
        return etagGenerator.generate(content);
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
            const compressed = await gzipAsync$1(content);
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

class AeroSSRBundler {
    projectPath;
    bundleCache;
    templateCache;
    defaultOptions;
    constructor(projectPath, options = {}) {
        this.projectPath = path.resolve(projectPath);
        this.bundleCache = options.bundleCache || createCache();
        this.templateCache = options.templateCache || createCache();
        this.defaultOptions = {
            extensions: ['.js', '.ts', '.jsx', '.tsx'],
            maxDepth: 100,
            ignorePatterns: ['node_modules'],
            baseDir: this.projectPath,
            minify: true,
            sourceMap: false,
            comments: true,
            target: 'universal',
            hydration: false
        };
    }
    generateHash(content) {
        return createHash('md5').update(content).digest('hex');
    }
    async resolveFilePath(importPath, fromPath, options = {}) {
        // Support test environment
        if (process.env.NODE_ENV === 'test') {
            return importPath;
        }
        // Handle browser-specific modules
        if (options.target === 'browser' && !importPath.startsWith('.') && !importPath.startsWith('/')) {
            return importPath;
        }
        const basePath = path.resolve(path.dirname(fromPath), importPath);
        const extensions = this.defaultOptions.extensions;
        // Check if path has valid extension
        if (extensions.some(ext => importPath.endsWith(ext))) {
            try {
                await fs.access(basePath);
                return basePath;
            }
            catch {
                return null;
            }
        }
        // Try adding extensions
        for (const ext of extensions) {
            const fullPath = `${basePath}${ext}`;
            try {
                await fs.access(fullPath);
                return fullPath;
            }
            catch {
                continue;
            }
        }
        // Try index files
        for (const ext of extensions) {
            const indexPath = path.join(basePath, `index${ext}`);
            try {
                await fs.access(indexPath);
                return indexPath;
            }
            catch {
                continue;
            }
        }
        return null;
    }
    async resolveDependencies(filePath, options) {
        const deps = new Set();
        const { maxDepth, ignorePatterns, target } = { ...this.defaultOptions, ...options };
        // Skip ignored patterns
        if (ignorePatterns.some(pattern => filePath.includes(pattern))) {
            return deps;
        }
        const resolve = async (currentPath, depth = 0) => {
            if (depth > maxDepth || deps.has(currentPath)) {
                return;
            }
            deps.add(currentPath);
            try {
                const content = await fs.readFile(currentPath, 'utf-8');
                const importPatterns = [
                    /require\s*\(['"]([^'"]+)['"]\)/g,
                    /import\s+.*?from\s+['"]([^'"]+)['"]/g,
                    /import\s*['"]([^'"]+)['"]/g,
                    /import\s*\(.*?['"]([^'"]+)['"]\s*\)/g,
                    /export\s+.*?from\s+['"]([^'"]+)['"]/g
                ];
                const promises = [];
                for (const pattern of importPatterns) {
                    let match;
                    while ((match = pattern.exec(content)) !== null) {
                        const importPath = match[1];
                        if (!importPath)
                            continue;
                        promises.push((async () => {
                            try {
                                const fullPath = await this.resolveFilePath(importPath, currentPath, { target });
                                if (fullPath) {
                                    await resolve(fullPath, depth + 1);
                                }
                            }
                            catch (err) {
                                if (process.env.NODE_ENV !== 'test') {
                                    console.warn(`Warning: Could not resolve dependency ${importPath} in ${currentPath}`);
                                }
                            }
                        })());
                    }
                }
                await Promise.all(promises);
            }
            catch (err) {
                throw new Error(`Error processing ${currentPath}: ${err instanceof Error ? err.message : String(err)}`);
            }
        };
        await resolve(filePath, 0);
        return deps;
    }
    minifyBundle(code) {
        if (!code.trim())
            return '';
        // Extract and preserve strings
        const strings = [];
        let stringPlaceholderCode = code.replace(/`(?:\\[\s\S]|[^\\`])*`|"(?:\\[\s\S]|[^\\"])*"|'(?:\\[\s\S]|[^\\'])*'/g, (match) => {
            strings.push(match);
            return `__STRING_${strings.length - 1}__`;
        });
        // Process code while preserving structure
        let result = '';
        let inComment = false;
        let inMultilineComment = false;
        for (let i = 0; i < stringPlaceholderCode.length; i++) {
            const char = stringPlaceholderCode[i];
            const nextChar = stringPlaceholderCode[i + 1] || '';
            // Handle comments
            if (inComment) {
                if (char === '\n')
                    inComment = false;
                continue;
            }
            if (inMultilineComment) {
                if (char === '*' && nextChar === '/') {
                    inMultilineComment = false;
                    i++;
                }
                continue;
            }
            if (char === '/' && nextChar === '/') {
                inComment = true;
                i++;
                continue;
            }
            if (char === '/' && nextChar === '*') {
                inMultilineComment = true;
                i++;
                continue;
            }
            // Handle whitespace
            if (/\s/.test(char)) {
                const prevChar = result[result.length - 1];
                const nextNonSpaceChar = stringPlaceholderCode.slice(i + 1).match(/\S/);
                if (prevChar && nextNonSpaceChar &&
                    /[a-zA-Z0-9_$]/.test(prevChar) &&
                    /[a-zA-Z0-9_$]/.test(nextNonSpaceChar[0])) {
                    result += ' ';
                }
                continue;
            }
            result += char;
        }
        // Clean up and restore strings
        result = result
            .replace(/\s*([+\-*/%=<>!&|^~?:,;{}[\]()])\s*/g, '$1')
            .replace(/\s+/g, ' ')
            .trim();
        return result.replace(/__STRING_(\d+)__/g, (_, index) => strings[parseInt(index)]);
    }
    generateHydrationCode(entryPoint) {
        return `
      (function() {
        window.__AEROSSR_HYDRATE__ = true;
        const script = document.createElement('script');
        script.type = 'module';
        script.src = '${entryPoint}';
        document.body.appendChild(script);
      })();
    `;
    }
    generateModuleSystem() {
        return `
      const __modules__ = new Map();
      const __exports__ = new Map();
      
      function require(id) {
        if (!__exports__.has(id)) {
          const module = { exports: {} };
          __modules__.get(id)(module, module.exports, require);
          __exports__.set(id, module.exports);
        }
        return __exports__.get(id);
      }
    `;
    }
    async generateBundle(entryPoint, options = {}) {
        const mergedOptions = { ...this.defaultOptions, ...options };
        const cacheKey = `${entryPoint}:${JSON.stringify(mergedOptions)}`;
        // Check cache
        const cached = this.bundleCache.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }
        try {
            const entryFilePath = path.resolve(this.projectPath, entryPoint);
            const dependencies = await this.resolveDependencies(entryFilePath, mergedOptions);
            if (dependencies.size === 0) {
                throw new Error(`No dependencies found for ${entryPoint}`);
            }
            const chunks = [];
            if (mergedOptions.target !== 'server') {
                chunks.push(this.generateModuleSystem());
            }
            for (const dep of dependencies) {
                const content = await fs.readFile(dep, 'utf-8');
                const relativePath = path.relative(this.projectPath, dep);
                if (mergedOptions.comments) {
                    chunks.push(`\n// File: ${relativePath}`);
                }
                if (mergedOptions.target !== 'server') {
                    chunks.push(`
            __modules__.set("${relativePath}", function(module, exports, require) {
              ${content}
            });
          `);
                }
                else {
                    chunks.push(content);
                }
            }
            if (mergedOptions.target !== 'server') {
                const relativeEntryPoint = path.relative(this.projectPath, entryFilePath);
                chunks.push(`\nrequire("${relativeEntryPoint}");`);
            }
            const code = chunks.join('\n');
            const minified = mergedOptions.minify ? this.minifyBundle(code) : code;
            const hash = this.generateHash(minified);
            const result = {
                code: minified,
                dependencies,
                hash
            };
            if (mergedOptions.hydration) {
                result.hydrationCode = this.generateHydrationCode(entryPoint);
            }
            // Cache the result
            this.bundleCache.set(cacheKey, JSON.stringify(result));
            return result;
        }
        catch (err) {
            throw new Error(`Failed to generate bundle from ${entryPoint}: ${err instanceof Error ? err.message : String(err)}`);
        }
    }
    clearCache() {
        this.bundleCache.clear();
        this.templateCache.clear();
    }
    getCacheStats() {
        return {
            size: Object.keys(this.bundleCache || {}).length,
            keys: Object.keys(this.bundleCache || {})
        };
    }
}

class AeroSSR {
    config;
    logger;
    bundler;
    distHandler;
    router;
    server = null;
    routes;
    middlewares;
    constructor(options = {}) {
        // Step 1: Initialize base configuration
        const baseConfig = this.initializeBaseConfig(options);
        // Step 2: Create required directories
        this.createRequiredDirectoriesSync(baseConfig.projectPath);
        // Step 3: Initialize logger early for error tracking
        this.logger = new Logger({
            logFilePath: baseConfig.logFilePath,
            ...baseConfig.loggerOptions
        });
        // Step 4: Initialize core components
        this.bundler = new AeroSSRBundler(baseConfig.projectPath);
        this.router = new Router(new DefaultRouteStrategy());
        this.routes = new Map();
        this.middlewares = [];
        // Step 5: Complete configuration with derived components
        this.config = this.initializeFullConfig(baseConfig, options);
        // Step 6: Initialize handlers
        this.distHandler = new DistRequestHandler(this.bundler, this.config, this.logger);
        // Step 7: Initialize static file handling
        this.initializeStaticFileHandling(options);
        // Step 8: Initialize CORS
        corsManager.updateDefaults(this.config.corsOrigins);
        // Step 9: Validate final configuration
        this.validateConfig();
    }
    initializeBaseConfig(options) {
        const projectPath = path__default.resolve(options.projectPath || process.cwd());
        return {
            projectPath,
            publicPath: path__default.resolve(projectPath, 'public'),
            port: options.port || 3000,
            compression: options.compression !== false,
            cacheMaxAge: options.cacheMaxAge || 3600,
            logFilePath: options.logFilePath || path__default.join(projectPath, 'logs', 'server.log'),
            loggerOptions: options.loggerOptions || {},
            corsOrigins: corsManager.normalizeCorsOptions(options.corsOrigins),
            defaultMeta: {
                title: 'AeroSSR App',
                description: 'Built with AeroSSR bundler',
                charset: 'UTF-8',
                viewport: 'width=device-width, initial-scale=1.0',
                ...options.defaultMeta,
            },
        };
    }
    initializeFullConfig(baseConfig, options) {
        return {
            ...baseConfig,
            bundleCache: options.bundleCache || createCache(),
            templateCache: options.templateCache || createCache(),
            errorHandler: options.errorHandler || ErrorHandler.handleErrorStatic,
            staticFileHandler: options.staticFileHandler || this.handleDefaultRequest.bind(this),
            bundleHandler: this.distHandler.handleDistRequest.bind(this.distHandler),
        };
    }
    createRequiredDirectoriesSync(projectPath) {
        const requiredDirs = [
            path__default.join(projectPath, 'public'),
            path__default.join(projectPath, 'logs'),
            path__default.join(projectPath, 'src')
        ];
        for (const dir of requiredDirs) {
            try {
                if (!fs$1.existsSync(dir)) {
                    fs$1.mkdirSync(dir, { recursive: true });
                }
            }
            catch (error) {
                // We'll log this later once logger is initialized
                console.warn(`Failed to create directory ${dir}: ${error}`);
            }
        }
    }
    setupStaticFileHandling(options) {
        const staticOptions = {
            root: path__default.join(this.config.projectPath, options.root || 'public'),
            maxAge: options.maxAge || 86400,
            index: options.index || ['index.html'],
            dotFiles: options.dotFiles || 'ignore',
            compression: options.compression ?? this.config.compression,
            etag: options.etag !== false
        };
        const staticFileMiddleware = new StaticFileMiddleware(staticOptions);
        this.use(staticFileMiddleware.middleware());
    }
    initializeStaticFileHandling(options) {
        if (!options.staticFileOptions && !options.staticFileHandler) {
            const defaultStaticOptions = {
                root: 'public',
                maxAge: 86400,
                index: ['index.html'],
                dotFiles: 'ignore',
                compression: this.config.compression,
                etag: true
            };
            this.setupStaticFileHandling(defaultStaticOptions);
        }
        else if (options.staticFileOptions) {
            this.setupStaticFileHandling(options.staticFileOptions);
        }
    }
    validateConfig() {
        if (this.config.port < 0 || this.config.port > 65535) {
            throw new Error('Invalid port number');
        }
        if (this.config.cacheMaxAge < 0) {
            throw new Error('Cache max age cannot be negative');
        }
        if (typeof this.config.errorHandler !== 'function') {
            throw new Error('Error handler must be a function');
        }
    }
    use(middleware) {
        if (typeof middleware !== 'function') {
            throw new Error('Middleware must be a function');
        }
        this.middlewares.push(middleware);
    }
    route(path, handler) {
        if (typeof path !== 'string' || !path) {
            throw new Error('Route path must be a non-empty string');
        }
        if (typeof handler !== 'function') {
            throw new Error('Route handler must be a function');
        }
        this.router.add(this.router.route(path).handler(handler));
    }
    clearCache() {
        this.config.bundleCache.clear();
        this.config.templateCache.clear();
        this.bundler.clearCache();
    }
    createContext(rawReq, rawRes) {
        const req = new Request(rawReq);
        const res = new Response(rawRes);
        return {
            req,
            res,
            params: {},
            query: {},
            state: {},
        };
    }
    async executeMiddlewares(context) {
        // Early return if no middlewares
        if (this.middlewares.length === 0) {
            return;
        }
        const chain = [...this.middlewares];
        let index = 0;
        const next = async () => {
            const middleware = chain[index];
            if (!middleware) {
                return;
            }
            try {
                // Create new context with next function for current middleware
                const middlewareContext = {
                    ...context,
                    req: context.req.raw,
                    next: async () => {
                        index++;
                        await next();
                    }
                };
                // Execute current middleware
                await middleware(context.req.raw, context.res.raw, next);
            }
            catch (error) {
                const middlewareError = new Error(`Middleware execution failed: ${error instanceof Error ? error.message : String(error)}`);
                if (error instanceof Error) {
                    middlewareError.cause = error;
                    middlewareError.stack = error.stack;
                }
                throw middlewareError;
            }
        };
        // Start the middleware chain
        await next();
    }
    async handleRequest(rawReq, rawRes) {
        try {
            this.logger.log(`Request received: ${rawReq.method} ${rawReq.url}`);
            const context = this.createContext(rawReq, rawRes);
            // Handle CORS preflight
            if (context.req.method === 'OPTIONS') {
                corsManager.handlePreflight(context.res.raw);
                return;
            }
            // Set CORS headers
            corsManager.setCorsHeaders(context.res.raw);
            // Execute middleware chain
            await this.executeMiddlewares(context);
            const parsedUrl = parse(rawReq.url || '', true);
            const pathname = parsedUrl.pathname || '/';
            // Special routes
            if (pathname === '/dist') {
                await this.handleBundle(context.req.raw, context.res.raw, parsedUrl.query);
                return;
            }
            // Route handling
            await this.router.handle(context.req.raw, context.res.raw);
        }
        catch (err) {
            const error = err;
            await ErrorHandler.handleErrorStatic(error, rawReq, rawRes, { logger: this.logger });
        }
    }
    async handleBundle(req, res, query) {
        try {
            const entryPoint = query.entryPoint || 'main.js';
            const bundle = await this.bundler.generateBundle(entryPoint, {
                minify: true,
                sourceMap: false
            });
            const etag = etagGenerator.generate(bundle.code);
            if (req.headers['if-none-match'] === etag) {
                res.writeHead(304);
                res.end();
                return;
            }
            const headers = {
                'Content-Type': 'application/javascript',
                'Cache-Control': `public, max-age=${this.config.cacheMaxAge}`,
                'ETag': etag,
            };
            if (this.config.compression && req.headers['accept-encoding']?.includes('gzip')) {
                const compressed = gzipAsync(bundle.code);
                headers['Content-Encoding'] = 'gzip';
                headers['Vary'] = 'Accept-Encoding';
                res.writeHead(200, headers);
                res.end(compressed);
            }
            else {
                res.writeHead(200, headers);
                res.end(bundle.code);
            }
        }
        catch (error) {
            const bundleError = new Error(`Bundle generation failed: ${error instanceof Error ? error.message : String(error)}`);
            if (error instanceof Error) {
                bundleError.cause = error;
            }
            throw bundleError;
        }
    }
    async handleDistRequest(req, res) {
        await this.distHandler.handleDistRequest(req, res);
    }
    async handleDefaultRequest(req, res) {
        try {
            const parsedUrl = parse(req.url || '', true);
            const pathname = parsedUrl.pathname || '/';
            // Template lookup
            const htmlPath = join(this.config.projectPath, 'public', 'index.html');
            let html = await promises.readFile(htmlPath, 'utf-8');
            // Meta tags
            const meta = {
                title: `Page - ${pathname}`,
                description: `Content for ${pathname}`,
                ...this.config.defaultMeta
            };
            // Inject meta tags
            html = htmlManager.injectMetaTags(html, meta);
            const headers = {
                'Content-Type': 'text/html',
                'Cache-Control': 'no-cache',
                'X-Content-Type-Options': 'nosniff'
            };
            if (!res.headersSent) {
                res.writeHead(200, headers);
            }
            res.end(html);
        }
        catch (error) {
            const requestError = new Error(`Default request handling failed: ${error instanceof Error ? error.message : String(error)}`);
            if (error instanceof Error) {
                requestError.cause = error;
                requestError.stack = error.stack;
            }
            throw requestError;
        }
    }
    async start() {
        return new Promise((resolve, reject) => {
            try {
                this.server = createServer((req, res) => this.handleRequest(req, res));
                this.server.on('error', (error) => {
                    this.logger.log(`Server error: ${error.message}`);
                    reject(error);
                });
                this.server.listen(this.config.port, () => {
                    this.logger.log(`Server is running on port ${this.config.port}`);
                    resolve(this.server);
                });
            }
            catch (error) {
                reject(error);
            }
        });
    }
    async stop() {
        if (!this.server) {
            return Promise.resolve();
        }
        return new Promise((resolve) => {
            this.server?.close(() => {
                this.logger.log('Server stopped');
                this.server = null;
                resolve();
            });
        });
    }
    listen(port) {
        if (port < 0 || port > 65535) {
            throw new Error('Invalid port number');
        }
        this.config.port = port;
        this.start().catch(error => {
            this.logger.log(`Failed to start server: ${error.message}`);
        });
    }
}
function gzipAsync(code) {
    throw new Error('Function not implemented.');
}

class AeroSSRCommands {
    logger;
    defaultHeaders = {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'SAMEORIGIN',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
    };
    constructor(logger) {
        this.logger = logger || new Logger();
    }
    /**
     * Find the project root directory
     */
    async findProjectRoot(startDir) {
        let currentDir = startDir;
        const rootDir = path__default.parse(currentDir).root;
        while (currentDir !== rootDir) {
            try {
                const pkgPath = path__default.join(currentDir, 'package.json');
                await promises.access(pkgPath);
                return currentDir;
            }
            catch {
                currentDir = path__default.dirname(currentDir);
            }
        }
        return startDir;
    }
    /**
     * Verify directory exists or create it
     */
    async ensureDirectory(dir) {
        try {
            await promises.access(dir);
        }
        catch {
            await promises.mkdir(dir, { recursive: true });
        }
    }
    /**
     * Create project directory structure
     */
    async createProjectStructure(targetDir) {
        const dirs = {
            public: path__default.join(targetDir, 'public'),
            logs: path__default.join(targetDir, 'logs'),
            config: path__default.join(targetDir, 'config'),
            styles: path__default.join(targetDir, 'public', 'styles'),
            dist: path__default.join(targetDir, 'public', 'dist')
        };
        await Promise.all(Object.values(dirs).map(dir => this.ensureDirectory(dir)));
        return dirs;
    }
    /**
     * Create default project files
     */
    async createProjectFiles(dirs) {
        const files = {
            html: {
                path: path__default.join(dirs.public, 'index.html'),
                content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-Content-Type-Options" content="nosniff">
    <title>AeroSSR App</title>
    <link rel="stylesheet" href="/styles/main.css">
</head>
<body>
    <div id="app">
        <h1>Welcome to AeroSSR</h1>
        <p>Edit public/index.html to get started</p>
    </div>
    <script type="module" src="/dist/main.js"></script>
</body>
</html>`
            },
            css: {
                path: path__default.join(dirs.styles, 'main.css'),
                content: `/* AeroSSR Default Styles */
:root {
    --primary-color: #2c3e50;
    --background-color: #ffffff;
    --text-color: #333333;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    margin: 0;
    padding: 2rem;
    background-color: var(--background-color);
    color: var(--text-color);
}

#app {
    max-width: 800px;
    margin: 0 auto;
}

h1 {
    color: var(--primary-color);
}`
            },
            log: {
                path: path__default.join(dirs.logs, 'server.log'),
                content: ''
            }
        };
        await Promise.all(Object.entries(files).map(async ([_, file]) => {
            try {
                await promises.writeFile(file.path, file.content.trim(), 'utf-8');
            }
            catch (error) {
                throw new Error(`Failed to create file ${file.path}: ${error instanceof Error ? error.message : String(error)}`);
            }
        }));
    }
    /**
     * Initialize new AeroSSR project
     */
    async initializeProject(directory) {
        const startTime = Date.now();
        try {
            const projectRoot = await this.findProjectRoot(process.cwd());
            const targetDir = path__default.resolve(projectRoot, directory);
            this.logger.log(`Initializing AeroSSR project in ${targetDir}`);
            const dirs = await this.createProjectStructure(targetDir);
            await this.createProjectFiles(dirs);
            const duration = Date.now() - startTime;
            this.logger.log(`Project initialization completed successfully in ${duration}ms`);
        }
        catch (error) {
            const message = `Failed to initialize project: ${error instanceof Error ? error.message : String(error)}`;
            this.logger.log(message);
            throw new Error(message);
        }
    }
    /**
     * Create logging middleware
     */
    createLoggingMiddleware() {
        return async (req, _res, next) => {
            const requestId = Math.random().toString(36).substring(7);
            const start = Date.now();
            try {
                await next();
            }
            finally {
                const duration = Date.now() - start;
                this.logger.log(`[${requestId}] ${req.method} ${req.url} - ${duration}ms`);
            }
        };
    }
    /**
     * Create error handling middleware
     */
    createErrorMiddleware() {
        return async (req, res, next) => {
            try {
                await next();
            }
            catch (error) {
                const errorId = Math.random().toString(36).substring(7);
                this.logger.log(`[${errorId}] Server error: ${error instanceof Error ? error.stack : String(error)}`);
                if (!res.headersSent) {
                    res.writeHead(500, {
                        'Content-Type': 'text/plain',
                        ...this.defaultHeaders
                    });
                    res.end(`Internal Server Error (ID: ${errorId})`);
                }
            }
        };
    }
    /**
     * Validate middleware module exports
     */
    validateMiddlewareExports(exports, config) {
        if (!exports || typeof exports !== 'object') {
            throw new Error(`Invalid middleware module: ${config.path}`);
        }
        if (typeof exports[config.name] !== 'function') {
            throw new Error(`Middleware ${config.name} not found in ${config.path}`);
        }
    }
    /**
     * Load custom middleware
     */
    async loadCustomMiddleware(config, projectRoot) {
        const middlewarePath = path__default.resolve(projectRoot, config.path);
        try {
            await promises.access(middlewarePath);
            const customMiddleware = require(middlewarePath);
            this.validateMiddlewareExports(customMiddleware, config);
            const middleware = customMiddleware[config.name](config.options);
            if (typeof middleware !== 'function') {
                throw new Error(`Middleware ${config.name} factory must return a function`);
            }
            return middleware;
        }
        catch (error) {
            throw new Error(`Failed to load middleware ${config.name}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Configure middleware for AeroSSR instance
     */
    async configureMiddleware(app, config) {
        if (!app) {
            throw new Error('AeroSSR instance is required');
        }
        // Configure static file middleware
        const staticMiddleware = new StaticFileMiddleware({
            root: 'public',
            maxAge: 86400,
            index: ['index.html'],
            dotFiles: 'deny',
            compression: true,
            etag: true,
            headers: this.defaultHeaders
        });
        app.use(staticMiddleware.middleware());
        app.use(this.createLoggingMiddleware());
        app.use(this.createErrorMiddleware());
        if (config) {
            try {
                const projectRoot = await this.findProjectRoot(process.cwd());
                const middleware = await this.loadCustomMiddleware(config, projectRoot);
                app.use(middleware);
                this.logger.log(`Successfully configured middleware: ${config.name}`);
            }
            catch (error) {
                const message = `Middleware configuration failed: ${error instanceof Error ? error.message : String(error)}`;
                this.logger.log(message);
                throw new Error(message);
            }
        }
    }
    /**
     * Clean up project resources
     */
    async cleanup() {
        try {
            await this.logger.clear();
        }
        catch (error) {
            console.error('Cleanup failed:', error instanceof Error ? error.message : String(error));
        }
    }
}
// Export singleton instance
const aeroCommands = new AeroSSRCommands();

class AeroSSRCLI {
    static CONFIG_FILE = 'aerossr.config.json';
    static DEFAULT_CONFIG = {
        port: 3000,
        logPath: 'logs/server.log',
        middleware: []
    };
    program;
    logger;
    constructor(logger) {
        this.program = new Command();
        this.logger = logger || new Logger();
        this.setupProgram();
    }
    /**
     * Find configuration file in directory hierarchy
     */
    async findConfigFile(startDir) {
        let currentDir = startDir;
        while (currentDir !== resolve(currentDir, '..')) {
            const configPath = join(currentDir, AeroSSRCLI.CONFIG_FILE);
            if (existsSync(configPath)) {
                return configPath;
            }
            currentDir = resolve(currentDir, '..');
        }
        return null;
    }
    /**
     * Load configuration from file or return defaults
     */
    async loadConfig() {
        try {
            const configPath = await this.findConfigFile(process.cwd());
            if (configPath) {
                const content = await promises.readFile(configPath, 'utf-8');
                const config = JSON.parse(content);
                return {
                    ...AeroSSRCLI.DEFAULT_CONFIG,
                    ...config
                };
            }
        }
        catch (error) {
            this.logger.log(`Warning: Could not load config file: ${error instanceof Error ? error.message : String(error)}`);
        }
        return { ...AeroSSRCLI.DEFAULT_CONFIG };
    }
    /**
     * Save configuration to file
     */
    async saveConfig(config) {
        try {
            const configDir = process.cwd();
            await promises.mkdir(configDir, { recursive: true });
            const formattedConfig = JSON.stringify(config, null, 2);
            await promises.writeFile(AeroSSRCLI.CONFIG_FILE, formattedConfig, 'utf-8');
        }
        catch (error) {
            throw new Error(`Failed to save config: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Setup CLI program and commands
     */
    setupProgram() {
        this.program
            .name('aerossr')
            .version('0.1.1')
            .description('AeroSSR CLI for managing server-side rendering configurations');
        // Init command
        this.program
            .command('init')
            .description('Initialize a new AeroSSR project')
            .option('-d, --directory <path>', 'Project directory path', '.')
            .option('-p, --port <number>', 'Server port number', '3000')
            .action(async (options) => {
            try {
                const directory = resolve(options.directory);
                await aeroCommands.initializeProject(directory);
                const config = {
                    ...AeroSSRCLI.DEFAULT_CONFIG,
                    port: parseInt(options.port, 10),
                    logPath: join(directory, 'logs/server.log')
                };
                await this.saveConfig(config);
                this.logger.log('Successfully initialized AeroSSR project');
            }
            catch (error) {
                this.logger.log(`Initialization failed: ${error instanceof Error ? error.message : String(error)}`);
                process.exit(1);
            }
        });
        // Middleware command
        this.program
            .command('middleware')
            .description('Configure AeroSSR middleware')
            .requiredOption('-n, --name <name>', 'Middleware name')
            .requiredOption('-p, --path <path>', 'Middleware path')
            .option('-o, --options <json>', 'Middleware options as JSON')
            .action(async (options) => {
            try {
                const config = await this.loadConfig();
                const app = new AeroSSR({
                    port: config.port,
                    logFilePath: config.logPath,
                    projectPath: process.cwd(),
                    logger: this.logger
                });
                const middlewareConfig = {
                    name: options.name,
                    path: resolve(options.path),
                    options: options.options ? JSON.parse(options.options) : undefined
                };
                await aeroCommands.configureMiddleware(app, middlewareConfig);
                config.middleware.push(middlewareConfig);
                await this.saveConfig(config);
                this.logger.log(`Successfully configured middleware: ${options.name}`);
            }
            catch (error) {
                this.logger.log(`Middleware configuration failed: ${error instanceof Error ? error.message : String(error)}`);
                process.exit(1);
            }
        });
        // Config command
        this.program
            .command('config')
            .description('Manage AeroSSR configuration')
            .option('-u, --update <key=value>', 'Update configuration')
            .option('-l, --list', 'List current configuration')
            .option('-r, --reset', 'Reset configuration to defaults')
            .action(async (options) => {
            try {
                let config = await this.loadConfig();
                if (options.reset) {
                    config = { ...AeroSSRCLI.DEFAULT_CONFIG };
                    await this.saveConfig(config);
                    this.logger.log('Configuration reset to defaults');
                }
                else if (options.update) {
                    const [key, value] = options.update.split('=');
                    if (!key || value === undefined) {
                        throw new Error('Invalid key-value format');
                    }
                    config[key] = isNaN(Number(value)) ? value : Number(value);
                    await this.saveConfig(config);
                    this.logger.log(`Updated configuration: ${key}=${value}`);
                }
                else if (options.list) {
                    this.logger.log('Current configuration:');
                    this.logger.log(JSON.stringify(config, null, 2));
                }
            }
            catch (error) {
                this.logger.log(`Configuration failed: ${error instanceof Error ? error.message : String(error)}`);
                process.exit(1);
            }
        });
    }
    /**
     * Parse command line arguments and execute
     */
    async run(args = process.argv) {
        try {
            await this.program.parseAsync(args);
        }
        catch (error) {
            this.logger.log(`CLI execution failed: ${error instanceof Error ? error.message : String(error)}`);
            process.exit(1);
        }
        finally {
            await aeroCommands.cleanup();
        }
    }
}
// Create and export CLI instance
const cli = new AeroSSRCLI();
// Add default export for direct usage
async function runCLI() {
    await cli.run();
}

export { AeroSSRCLI, cli, runCLI as default };
//# sourceMappingURL=index.mjs.map
