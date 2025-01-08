#!/usr/bin/env node

import { Command } from 'commander';
import { createServer } from 'http';
import { existsSync, mkdirSync, promises, createReadStream } from 'fs';
import { parse } from 'url';
import * as path from 'path';
import path__default, { join, resolve } from 'path';
import { gzip, createGzip } from 'zlib';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import { stat, readFile } from 'fs/promises';
import * as crypto from 'crypto';
import { createHash } from 'crypto';

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
        // Handle string argument for backward compatibility
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
            console.error(`Logger initialization failed for path: ${this.logFilePath} - ${error.message}`);
            throw error; // Propagate the error instead of silently failing
        }
    }
    getLogPath() {
        return this.logFilePath;
    }
    formatMessage(message) {
        const timestamp = new Date().toISOString();
        if (this.options.format === 'json') {
            return JSON.stringify({
                timestamp,
                message,
                level: this.options.logLevel
            }) + '\n';
        }
        return `[${timestamp}] ${message}\n`;
    }
    async log(message) {
        const formattedMessage = this.formatMessage(message);
        console.log(formattedMessage.trim());
        if (this.logFilePath) {
            try {
                await fs.appendFile(this.logFilePath, formattedMessage);
            }
            catch (error) {
                console.error(`Failed to write to log file: ${error.message}`);
                throw error; // Propagate the error instead of silently failing
            }
        }
    }
    logRequest(req) {
        const { method = 'undefined', url = 'undefined', headers = {} } = req;
        const userAgent = headers['user-agent'] || 'unknown';
        const logMessage = `${method} ${url} - ${userAgent}`;
        void this.log(logMessage);
    }
    async clear() {
        if (this.logFilePath && existsSync(this.logFilePath)) {
            try {
                await fs.writeFile(this.logFilePath, '');
            }
            catch (error) {
                console.error(`Failed to clear log file: ${error.message}`);
                throw error; // Propagate the error instead of silently failing
            }
        }
    }
}

// src/utils/cacheManager.ts
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

// src/utils/ETagGenerator.ts
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
// Export singleton instance
const etagGenerator = new ETagGenerator();

class ErrorHandler {
    defaultStyles;
    showStack;
    showDetails;
    static async handleError(error, req, res) {
        const statusCode = error.statusCode || 500;
        const message = error.message || 'Internal Server Error';
        console.error('Server error:', {
            statusCode,
            message,
            path: req.url,
            method: req.method,
            error: {
                name: error.name,
                code: error.code,
                stack: error.stack,
                details: error.details
            }
        });
        const errorPage = new ErrorHandler().generateErrorPage(statusCode, message, error);
        res.writeHead(statusCode, {
            'Content-Type': 'text/html',
            'Cache-Control': 'no-store',
            'X-Content-Type-Options': 'nosniff'
        });
        res.end(errorPage);
    }
    constructor(options = {}) {
        this.defaultStyles = options.styles || `
      body { font-family: system-ui; padding: 2rem; max-width: 600px; margin: 0 auto; }
      .error { background: #f8d7da; border: 1px solid #f5c6cb; padding: 1rem; border-radius: 4px; }
      .details { margin-top: 1rem; font-family: monospace; white-space: pre-wrap; }
    `;
        this.showStack = options.showStack ?? process.env.NODE_ENV !== 'production';
        this.showDetails = options.showDetails ?? process.env.NODE_ENV !== 'production';
    }
    generateErrorPage(statusCode, message, error, options = {}) {
        const styles = options.styles || this.defaultStyles;
        const showStack = options.showStack ?? this.showStack;
        const showDetails = options.showDetails ?? this.showDetails;
        const details = error && showDetails ? `
      <div class="details">
        <strong>Error Code:</strong> ${error.code || 'UNKNOWN'}<br>
        ${error.details ? `<strong>Details:</strong> ${JSON.stringify(error.details, null, 2)}` : ''}
        ${error.stack && showStack ? `<strong>Stack:</strong>\n${error.stack}` : ''}
      </div>
    ` : '';
        return `
      <!DOCTYPE html>
      <html>
      <head>
          <title>Error ${statusCode}</title>
          <style>${styles}</style>
      </head>
      <body>
          <h1>Error ${statusCode}</h1>
          <div class="error">
              <p>${message}</p>
              ${details}
          </div>
      </body>
      </html>
    `;
    }
    async handleError(error, req, res) {
        const statusCode = error.statusCode || 500;
        const message = error.message || 'Internal Server Error';
        console.error('Server error:', {
            statusCode,
            message,
            path: req.url,
            method: req.method,
            error: {
                name: error.name,
                code: error.code,
                stack: error.stack,
                details: error.details
            }
        });
        const errorPage = this.generateErrorPage(statusCode, message, error);
        res.writeHead(statusCode, {
            'Content-Type': 'text/html',
            'Cache-Control': 'no-store',
            'X-Content-Type-Options': 'nosniff'
        });
        res.end(errorPage);
    }
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
            return `<title>${value}</title>`;
        }
        if (key.startsWith('og')) {
            return `<meta property="og:${key.slice(2).toLowerCase()}" content="${value}">`;
        }
        if (key.startsWith('twitter')) {
            return `<meta name="twitter:${key.slice(7).toLowerCase()}" content="${value}">`;
        }
        if (key === 'charset') {
            return `<meta charset="${value}">`;
        }
        return `<meta name="${key}" content="${value}">`;
    }
    /**
     * Injects meta tags into HTML
     */
    injectMetaTags(html, meta = {}, defaultMeta) {
        const finalMeta = {
            ...this.defaultMeta,
            ...meta
        };
        const metaTags = Object.entries(finalMeta)
            .filter(([_, value]) => value !== undefined && value !== '')
            .map(([key, value]) => this.formatMetaTag(key, value))
            .join('\n    ');
        return html.replace('</head>', `    ${metaTags}\n  </head>`);
    }
    /**
     * Validates meta tags structure
     */
    validateMetaTags(meta) {
        // Basic validation rules
        const validations = {
            title: (value) => value.length <= 60,
            description: (value) => value.length <= 160,
            keywords: (value) => value.split(',').length <= 10,
            ogImage: (value) => /^https?:\/\/.+/.test(value),
            twitterImage: (value) => /^https?:\/\/.+/.test(value)
        };
        return Object.entries(meta).every(([key, value]) => {
            if (!value)
                return true;
            if (validations[key]) {
                return validations[key](value);
            }
            return true;
        });
    }
    /**
     * Sanitizes meta tag content
     */
    sanitizeContent(content) {
        return content
            .replace(/<\/?[^>]+(>|$)/g, '') // Remove HTML tags while preserving content
            .replace(/"/g, '&quot;') // Escape quotes
            .trim();
    }
    /**
     * Creates meta tags object with sanitized values
     */
    createMetaTags(meta) {
        return Object.entries(meta).reduce((acc, [key, value]) => {
            if (value !== undefined) {
                acc[key] = this.sanitizeContent(value);
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
    /**
     * Extracts existing meta tags from HTML
     */
    extractMetaTags(html) {
        const meta = {};
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (titleMatch) {
            meta.title = titleMatch[1];
        }
        const metaRegex = /<meta[^>]+>/g;
        const matches = html.match(metaRegex) || [];
        matches.forEach(match => {
            const nameMatch = match.match(/name="([^"]+)"/);
            const propertyMatch = match.match(/property="([^"]+)"/);
            const contentMatch = match.match(/content="([^"]+)"/);
            if (contentMatch) {
                let name;
                if (propertyMatch) {
                    // Handle OpenGraph tags
                    name = propertyMatch[1].replace('og:', 'og');
                }
                else if (nameMatch) {
                    // Handle Twitter and other meta tags
                    name = nameMatch[1].replace('twitter:', 'twitter');
                }
                if (name) {
                    // Convert kebab-case to camelCase for property names
                    const propertyName = name.replace(/-([a-z])/g, g => g[1].toUpperCase());
                    meta[propertyName] = contentMatch[1];
                }
            }
        });
        return meta;
    }
}
// Export singleton instance
const htmlManager = new HTMLManager();

// src/utils/bundler.ts
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

class AsyncUtils {
    defaultOptions;
    timeoutIds;
    constructor(options = {}) {
        this.defaultOptions = {
            timeout: 30000,
            retries: 0,
            backoff: 'fixed',
            backoffDelay: 1000,
            onRetry: () => { },
            ...options
        };
        this.timeoutIds = new Set();
    }
    /**
     * Type guard to check if a value is a Promise
     */
    isPromise(value) {
        return Boolean(value &&
            typeof value === 'object' &&
            'then' in value &&
            typeof value.then === 'function');
    }
    /**
     * Creates a timeout promise with cleanup
     */
    createTimeout(ms) {
        return new Promise((_, reject) => {
            const timeoutId = setTimeout(() => {
                this.timeoutIds.delete(timeoutId);
                reject(new Error(`Operation timed out after ${ms}ms`));
            }, ms);
            this.timeoutIds.add(timeoutId);
            timeoutId.unref?.();
        });
    }
    /**
     * Creates a delay promise with cleanup
     */
    delay(ms) {
        return new Promise(resolve => {
            const timeoutId = setTimeout(() => {
                this.timeoutIds.delete(timeoutId);
                resolve();
            }, ms);
            this.timeoutIds.add(timeoutId);
            timeoutId.unref?.();
        });
    }
    /**
     * Calculates backoff delay based on strategy
     */
    calculateBackoff(attempt, options) {
        if (options.backoff === 'exponential') {
            return options.backoffDelay * Math.pow(2, attempt);
        }
        return options.backoffDelay;
    }
    /**
     * Ensures a function returns a Promise
     */
    ensureAsync(fn, options = {}) {
        const mergedOptions = { ...this.defaultOptions, ...options };
        return async (...args) => {
            let lastError;
            for (let attempt = 0; attempt <= mergedOptions.retries; attempt++) {
                try {
                    const timeoutPromise = this.createTimeout(mergedOptions.timeout);
                    const resultPromise = Promise.resolve(fn(...args));
                    const result = await Promise.race([
                        resultPromise,
                        timeoutPromise
                    ]);
                    return result;
                }
                catch (error) {
                    lastError = error instanceof Error ? error : new Error(String(error));
                    if (attempt < mergedOptions.retries) {
                        await mergedOptions.onRetry(lastError, attempt + 1);
                        await this.delay(this.calculateBackoff(attempt, mergedOptions));
                        continue;
                    }
                    break;
                }
            }
            throw lastError || new Error('Operation failed');
        };
    }
    /**
     * Executes multiple promises with concurrency limit
     */
    async withConcurrency(tasks, concurrency) {
        const results = [];
        const executing = [];
        try {
            for (const task of tasks) {
                const execution = task().then(result => {
                    results.push(result);
                    executing.splice(executing.indexOf(execution), 1);
                });
                executing.push(execution);
                if (executing.length >= concurrency) {
                    await Promise.race(executing);
                }
            }
            await Promise.all(executing);
            return results;
        }
        catch (error) {
            this.clearTimeouts();
            throw error;
        }
    }
    /**
     * Creates a debounced version of an async function
     */
    debounceAsync(fn, wait) {
        let timeoutId;
        let pendingPromise = null;
        return (...args) => {
            if (pendingPromise) {
                clearTimeout(timeoutId);
                this.timeoutIds.delete(timeoutId);
            }
            return new Promise((resolve, reject) => {
                timeoutId = setTimeout(async () => {
                    this.timeoutIds.delete(timeoutId);
                    try {
                        const result = await fn(...args);
                        pendingPromise = null;
                        resolve(result);
                    }
                    catch (error) {
                        pendingPromise = null;
                        reject(error);
                    }
                }, wait);
                this.timeoutIds.add(timeoutId);
                timeoutId.unref?.();
            });
        };
    }
    /**
     * Cleans up any pending timeouts
     */
    clearTimeouts() {
        for (const timeoutId of this.timeoutIds) {
            clearTimeout(timeoutId);
        }
        this.timeoutIds.clear();
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
// Export singleton instance
new AsyncUtils();

const gzipAsync$1 = promisify(gzip);
class AeroSSR {
    config;
    logger;
    bundler;
    server;
    routes;
    middlewares;
    constructor(config = {
        projectPath: ''
    }) {
        // Normalize CORS options
        const corsOptions = corsManager.normalizeCorsOptions(config.corsOrigins);
        const projectPath = this.config.projectPath;
        this.config = {
            projectPath,
            loggerOptions: config.loggerOptions || {},
            errorHandler: config.errorHandler || ErrorHandler.handleError,
            staticFileHandler: config.staticFileHandler || this.handleDefaultRequest.bind(this),
            bundleHandler: config.bundleHandler || this.handleDistRequest.bind(this),
            port: config.port || 3000,
            cacheMaxAge: config.cacheMaxAge || 3600,
            corsOrigins: corsOptions,
            compression: config.compression !== false,
            logFilePath: config.logFilePath || null,
            bundleCache: config.bundleCache || createCache(),
            templateCache: config.templateCache || createCache(),
            defaultMeta: {
                title: 'AeroSSR App',
                description: 'Built with AeroSSR bundler',
                charset: 'UTF-8',
                viewport: 'width=device-width, initial-scale=1.0',
                ...config.defaultMeta,
            },
        };
        this.logger = new Logger({ logFilePath: this.config.logFilePath });
        this.bundler = new AeroSSRBundler(projectPath);
        this.server = null;
        this.routes = new Map();
        this.middlewares = [];
        // Update CORS manager defaults with configuration
        corsManager.updateDefaults(this.config.corsOrigins);
    }
    use(middleware) {
        this.middlewares.push(middleware);
    }
    route(path, handler) {
        this.routes.set(path, handler);
    }
    clearCache() {
        this.config.bundleCache.clear();
        this.config.templateCache.clear();
    }
    async executeMiddlewares(req, res, index = 0) {
        if (index >= this.middlewares.length) {
            return;
        }
        const chain = [...this.middlewares];
        let currentIndex = index;
        const next = async () => {
            const middleware = chain[currentIndex];
            if (middleware) {
                currentIndex++;
                await middleware(req, res, next);
            }
        };
        await next();
    }
    async handleRequest(req, res) {
        try {
            this.logger.log(`Request received: ${req.method} ${req.url}`);
            // Handle CORS preflight requests
            if (req.method === 'OPTIONS') {
                corsManager.handlePreflight(res, this.config.corsOrigins);
                return;
            }
            // Set CORS headers for regular requests
            corsManager.setCorsHeaders(res, this.config.corsOrigins);
            // Execute middleware chain
            await this.executeMiddlewares(req, res);
            const parsedUrl = parse(req.url || '', true);
            const pathname = parsedUrl.pathname || '/';
            // Route handling
            const routeHandler = this.routes.get(pathname);
            if (routeHandler) {
                await routeHandler(req, res);
                return;
            }
            // Special routes
            if (pathname === '/dist') {
                await this.handleDistRequest(req, res, parsedUrl.query);
                return;
            }
            // Default request handler
            await this.handleDefaultRequest(req, res);
        }
        catch (error) {
            await ErrorHandler.handleError(error instanceof Error ? error : new Error('Unknown error'), req, res);
        }
    }
    async handleDistRequest(req, res, query) {
        try {
            const projectPath = query.projectPath || './';
            const entryPoint = query.entryPoint || 'main.js';
            // Generate bundle
            const bundle = await this.bundler.generateBundle(entryPoint, {
                minify: true,
                sourceMap: false
            });
            // Generate ETag
            const etag = etagGenerator.generate(bundle.code);
            // Handle conditional requests
            if (req.headers['if-none-match'] === etag) {
                res.writeHead(304);
                res.end();
                return;
            }
            // Set response headers
            const headers = {
                'Content-Type': 'application/javascript',
                'Cache-Control': `public, max-age=${this.config.cacheMaxAge}`,
                'ETag': etag,
            };
            // Handle compression
            if (this.config.compression && req.headers['accept-encoding']?.includes('gzip')) {
                const compressed = await gzipAsync$1(bundle.code);
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
            throw new Error(`Bundle generation failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async handleDefaultRequest(req, res) {
        try {
            const parsedUrl = parse(req.url || '', true);
            const pathname = parsedUrl.pathname || '/';
            // Read and process HTML template
            const htmlPath = join(new URL('.', import.meta.url).pathname, 'index.html');
            let html = await promises.readFile(htmlPath, 'utf-8');
            // Generate meta tags
            const meta = {
                title: `Page - ${pathname}`,
                description: `Content for ${pathname}`,
            };
            // Inject meta tags
            html = htmlManager.injectMetaTags(html, meta, this.config.defaultMeta);
            // Set response headers
            res.writeHead(200, {
                'Content-Type': 'text/html',
                'Cache-Control': 'no-cache',
                'X-Content-Type-Options': 'nosniff'
            });
            res.end(html);
        }
        catch (error) {
            throw new Error(`Default request handling failed: ${error instanceof Error ? error.message : String(error)}`);
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
        this.config.port = port;
        this.start().catch(error => {
            this.logger.log(`Failed to start server: ${error.message}`);
        });
    }
}

const gzipAsync = promisify(gzip);
class StaticFileMiddleware {
    root;
    maxAge;
    index;
    dotFiles;
    compression;
    etag;
    constructor(options) {
        this.root = path.resolve(options.root);
        this.maxAge = options.maxAge || 86400;
        this.index = options.index || ['index.html'];
        this.dotFiles = options.dotFiles || 'ignore';
        this.compression = options.compression !== false;
        this.etag = options.etag !== false;
    }
    async handleFile(filePath, req, res) {
        try {
            const stats = await stat(filePath);
            if (stats.isFile()) {
                await this.serveFile(filePath, stats, req, res);
                return true;
            }
            if (stats.isDirectory()) {
                for (const indexFile of this.index) {
                    const indexPath = path.join(filePath, indexFile);
                    try {
                        const indexStats = await stat(indexPath);
                        if (indexStats.isFile()) {
                            await this.serveFile(indexPath, indexStats, req, res);
                            return true;
                        }
                    }
                    catch (error) {
                        if (error.code !== 'ENOENT') {
                            throw error;
                        }
                    }
                }
            }
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                return false;
            }
            throw error;
        }
        return false;
    }
    middleware() {
        return async (req, res, next) => {
            if (req.method !== 'GET' && req.method !== 'HEAD') {
                await next();
                return;
            }
            try {
                const urlPath = decodeURIComponent(req.url?.split('?')[0] || '/');
                const normalizedPath = path.normalize(urlPath);
                // Check for dot files
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
                // Resolve full path
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
    isDotFile(urlPath) {
        return urlPath.split('/').some(part => part.startsWith('.') && part !== '.' && part !== '..');
    }
    async serveFile(filepath, stats, req, res) {
        try {
            const mimeType = this.getMimeType(path.extname(filepath));
            const lastModified = stats.mtime.toUTCString();
            // Generate ETag using file size and modification time
            const etagContent = `${stats.size}-${stats.mtime.getTime()}`;
            const etag = this.etag ? etagGenerator.generate(etagContent, {
                weak: true,
                algorithm: 'sha1' // Use SHA1 for better collision resistance
            }) : null;
            // Handle conditional requests
            const ifModifiedSince = req.headers['if-modified-since'];
            const ifNoneMatch = req.headers['if-none-match'];
            const isNotModified = ((etag && ifNoneMatch && etagGenerator.compare(etag, ifNoneMatch)) ||
                (ifModifiedSince && new Date(ifModifiedSince) >= stats.mtime));
            if (isNotModified) {
                res.writeHead(304, {
                    'Cache-Control': `public, max-age=${this.maxAge}`,
                    'Last-Modified': lastModified,
                    'ETag': etag
                });
                res.end();
                return;
            }
            // Setup response headers
            const headers = {
                'Content-Type': mimeType,
                'Content-Length': stats.size.toString(),
                'Cache-Control': `public, max-age=${this.maxAge}`,
                'Last-Modified': lastModified,
                'X-Content-Type-Options': 'nosniff' // Security header
            };
            if (etag) {
                headers['ETag'] = etag;
            }
            // Determine if compression should be used
            const acceptEncoding = req.headers['accept-encoding'];
            const shouldCompress = this.compression &&
                this.isCompressible(mimeType) &&
                acceptEncoding?.includes('gzip') &&
                stats.size > 1024; // Only compress files larger than 1KB
            if (shouldCompress) {
                headers['Content-Encoding'] = 'gzip';
                headers['Vary'] = 'Accept-Encoding';
                delete headers['Content-Length']; // Remove content length as it will change after compression
            }
            res.writeHead(200, headers);
            // Handle HEAD requests
            if (req.method === 'HEAD') {
                res.end();
                return;
            }
            // Serve file content
            if (stats.size > 1024 * 1024) { // 1MB threshold for streaming
                await this.serveStreamedContent(filepath, shouldCompress, res);
            }
            else {
                await this.serveBufferedContent(filepath, shouldCompress, res);
            }
        }
        catch (error) {
            // Log error and cleanup
            console.error('Error serving file:', error);
            if (!res.headersSent) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Internal Server Error');
            }
            else {
                res.end();
            }
        }
    }
    /**
     * Serves file content using streams
     */
    async serveStreamedContent(filepath, shouldCompress, res) {
        return new Promise((resolve, reject) => {
            const fileStream = createReadStream(filepath);
            const handleError = (error) => {
                console.error('Stream error:', error);
                if (!res.headersSent) {
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('Internal Server Error');
                }
                else {
                    res.end();
                }
                reject(error);
            };
            if (shouldCompress) {
                const gzipStream = createGzip({
                    level: 6,
                    memLevel: 8 // Increased memory for better compression
                });
                fileStream
                    .on('error', handleError)
                    .pipe(gzipStream)
                    .on('error', handleError)
                    .pipe(res)
                    .on('finish', resolve)
                    .on('error', handleError);
            }
            else {
                fileStream
                    .pipe(res)
                    .on('finish', resolve)
                    .on('error', handleError);
            }
            // Handle client disconnect
            res.on('close', () => {
                fileStream.destroy();
            });
        });
    }
    /**
     * Serves file content using buffers
     */
    async serveBufferedContent(filepath, shouldCompress, res) {
        try {
            const content = await readFile(filepath);
            if (shouldCompress) {
                const compressed = await gzipAsync(content);
                res.end(compressed);
            }
            else {
                res.end(content);
            }
        }
        catch (error) {
            throw new Error(`Failed to serve buffered content: ${error instanceof Error ? error.message : String(error)}`);
        }
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
        return mimeTypes[ext.toLowerCase()] || 'application/octet-stream';
    }
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
                    projectPath: process.cwd()
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
