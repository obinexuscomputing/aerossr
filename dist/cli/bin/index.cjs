#!/usr/bin/env node

'use strict';

var commander = require('commander');
var http = require('http');
var fs = require('fs');
var url = require('url');
var path = require('path');
var zlib = require('zlib');
var util = require('util');
var fs$1 = require('fs/promises');
var crypto = require('crypto');

function _interopNamespaceDefault(e) {
    var n = Object.create(null);
    if (e) {
        Object.keys(e).forEach(function (k) {
            if (k !== 'default') {
                var d = Object.getOwnPropertyDescriptor(e, k);
                Object.defineProperty(n, k, d.get ? d : {
                    enumerable: true,
                    get: function () { return e[k]; }
                });
            }
        });
    }
    n.default = e;
    return Object.freeze(n);
}

var path__namespace = /*#__PURE__*/_interopNamespaceDefault(path);
var fs__namespace = /*#__PURE__*/_interopNamespaceDefault(fs$1);
var crypto__namespace = /*#__PURE__*/_interopNamespaceDefault(crypto);

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
        this.options = { ...Logger.DEFAULT_OPTIONS, ...options };
        this.logFilePath = this.options.logFilePath;
        if (this.logFilePath) {
            this.initializeLogFile();
        }
    }
    initializeLogFile() {
        try {
            const logDir = path.dirname(this.logFilePath);
            if (!fs.existsSync(logDir)) {
                fs.mkdirSync(logDir, { recursive: true });
            }
        }
        catch (error) {
            console.error(`Logger initialization failed for path: ${this.logFilePath} - ${error.message}`);
            this.logFilePath = null;
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
                await fs__namespace.appendFile(this.logFilePath, formattedMessage, 'utf-8');
            }
            catch (error) {
                console.error(`Failed to write to log file: ${error.message}`);
            }
        }
    }
    logRequest(req) {
        const { method = 'undefined', url = 'undefined', headers = {} } = req;
        const userAgent = headers['user-agent'] || 'unknown';
        const logMessage = `${method} ${url} - ${userAgent}`;
        this.log(logMessage);
    }
    async clear() {
        if (this.logFilePath && fs.existsSync(this.logFilePath)) {
            try {
                await fs__namespace.writeFile(this.logFilePath, '', 'utf-8');
            }
            catch (error) {
                console.error(`Failed to clear log file: ${error.message}`);
            }
        }
    }
}

function createCache(defaultOptions = {}) {
    const { maxSize = Infinity, ttl } = defaultOptions;
    const cache = new Map();
    function evictOldest() {
        if (cache.size <= 0)
            return;
        let oldestKey = '';
        let oldestAccess = Infinity;
        for (const [key, item] of cache.entries()) {
            if (item.lastAccessed < oldestAccess) {
                oldestAccess = item.lastAccessed;
                oldestKey = key;
            }
        }
        if (oldestKey) {
            cache.delete(oldestKey);
        }
    }
    function isExpired(item) {
        return item.expires !== undefined && item.expires <= Date.now();
    }
    return {
        get(key) {
            const item = cache.get(key);
            if (!item) {
                return undefined;
            }
            if (isExpired(item)) {
                cache.delete(key);
                return undefined;
            }
            // Update last accessed time
            item.lastAccessed = Date.now();
            return item.value;
        },
        set(key, value, options = {}) {
            // Handle max size - remove oldest if needed
            if (cache.size >= maxSize) {
                evictOldest();
            }
            const itemTtl = options.ttl ?? ttl;
            const expires = itemTtl ? Date.now() + itemTtl : undefined;
            cache.set(key, {
                value,
                expires,
                lastAccessed: Date.now()
            });
        },
        clear() {
            cache.clear();
        }
    };
}

function setCorsHeaders(res, options = {}) {
    const { origins = '*', methods = ['GET', 'POST', 'OPTIONS', 'HEAD'], allowedHeaders = ['Content-Type', 'Authorization'], exposedHeaders = [], credentials = false, maxAge = 86400 } = options;
    res.setHeader('Access-Control-Allow-Origin', Array.isArray(origins) ? origins.join(',') : origins);
    res.setHeader('Access-Control-Allow-Methods', methods.join(', '));
    res.setHeader('Access-Control-Allow-Headers', allowedHeaders.join(', '));
    if (exposedHeaders.length) {
        res.setHeader('Access-Control-Expose-Headers', exposedHeaders.join(', '));
    }
    if (credentials) {
        res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    res.setHeader('Access-Control-Max-Age', maxAge.toString());
}

function generateETag(content, options = {}) {
    const hash = crypto__namespace.createHash('md5').update(content).digest('hex');
    return options.weak ? `W/"${hash}"` : `"${hash}"`;
}

function generateErrorPage(statusCode, message, error, options = {}) {
    const { styles = `
      body { font-family: system-ui; padding: 2rem; max-width: 600px; margin: 0 auto; }
      .error { background: #f8d7da; border: 1px solid #f5c6cb; padding: 1rem; border-radius: 4px; }
      .details { margin-top: 1rem; font-family: monospace; white-space: pre-wrap; }
    `, showStack = process.env.NODE_ENV !== 'production', showDetails = process.env.NODE_ENV !== 'production' } = options;
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
async function handleError(error, req, res) {
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
    const errorPage = generateErrorPage(statusCode, message, error);
    res.writeHead(statusCode, {
        'Content-Type': 'text/html',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff'
    });
    res.end(errorPage);
}

function injectMetaTags(html, meta = {}, defaultMeta = {}) {
    const finalMeta = {
        charset: 'utf-8',
        viewport: 'width=device-width, initial-scale=1.0',
        ...defaultMeta,
        ...meta
    };
    const metaTags = Object.entries(finalMeta)
        .filter(([_, value]) => value !== undefined)
        .map(([key, value]) => {
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
    })
        .join('\n    ');
    return html.replace('</head>', `    ${metaTags}\n  </head>`);
}

// src/utils/bundler.ts
/**
 * Resolves the full path of an import
 */
async function resolveFilePath(importPath, fromPath, extensions) {
    // Handle non-relative imports (e.g. package imports)
    if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
        return null;
    }
    // For test environment, simplify path resolution
    if (process.env.NODE_ENV === 'test') {
        return importPath;
    }
    const basePath = path__namespace.resolve(path__namespace.dirname(fromPath), importPath);
    // Check if path already has valid extension
    if (extensions.some(ext => importPath.endsWith(ext))) {
        try {
            await fs__namespace.access(basePath);
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
            await fs__namespace.access(fullPath);
            return fullPath;
        }
        catch {
            continue;
        }
    }
    // Try index files
    for (const ext of extensions) {
        const indexPath = path__namespace.join(basePath, `index${ext}`);
        try {
            await fs__namespace.access(indexPath);
            return indexPath;
        }
        catch {
            continue;
        }
    }
    return null;
}
/**
 * Resolves all dependencies for a given file
 */
async function resolveDependencies(filePath, deps = new Set(), options = {}) {
    const { extensions = ['.js', '.ts', '.jsx', '.tsx'], maxDepth = 100, ignorePatterns = ['node_modules'] } = options;
    if (ignorePatterns.some(pattern => filePath.includes(pattern))) {
        return deps;
    }
    async function resolve(currentPath, depth = 0) {
        if (depth > maxDepth || deps.has(currentPath)) {
            return;
        }
        deps.add(currentPath);
        try {
            const content = await fs__namespace.readFile(currentPath, 'utf-8');
            const importPatterns = [
                /require\s*\(['"]([^'"]+)['"]\)/g,
                /import\s+.*?from\s+['"]([^'"]+)['"]/g,
                /import\s*['"]([^'"]+)['"]/g,
                /import\s*\(.*?['"]([^'"]+)['"]\s*\)/g,
                /export\s+.*?from\s+['"]([^'"]+)['"]/g // export ... from '...'
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
                            const fullPath = await resolveFilePath(importPath, currentPath, extensions);
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
    }
    await resolve(filePath);
    return deps;
}
/**
 * Minifies JavaScript code while preserving important structures
 */
function minifyBundle(code) {
    if (!code.trim())
        return '';
    // First pass: Extract strings and replace with placeholders
    const strings = [];
    code.replace(/"([^"\\]|\\[^])*"|'([^'\\]|\\[^])*'/g, (match) => {
        strings.push(match);
        return `__STRING_${strings.length - 1}__`;
    });
    // State tracking for comments
    let result = '';
    let inString = false;
    let stringChar = '';
    let inComment = false;
    let inMultilineComment = false;
    let lastChar = '';
    for (let i = 0; i < code.length; i++) {
        const char = code[i];
        const nextChar = code[i + 1] || '';
        // Handle string literals
        if (inString) {
            result += char;
            if (char === stringChar && lastChar !== '\\') {
                inString = false;
            }
        }
        // Handle comments
        else if (inComment) {
            if (char === '\n') {
                inComment = false;
            }
        }
        else if (inMultilineComment) {
            if (char === '*' && nextChar === '/') {
                inMultilineComment = false;
                i++;
            }
        }
        // Start of comments
        else if (char === '/' && nextChar === '/') {
            inComment = true;
            i++;
        }
        else if (char === '/' && nextChar === '*') {
            inMultilineComment = true;
            i++;
        }
        // Start of strings
        else if (char === '"' || char === "'") {
            inString = true;
            stringChar = char;
            result += char;
        }
        // Handle whitespace
        else if (/\s/.test(char)) {
            const prevChar = result[result.length - 1];
            const nextNonSpaceChar = code.slice(i + 1).match(/\S/);
            if (prevChar && nextNonSpaceChar &&
                /[a-zA-Z0-9_$]/.test(prevChar) &&
                /[a-zA-Z0-9_$]/.test(nextNonSpaceChar[0])) {
                result += ' ';
            }
        }
        // All other characters
        else {
            result += char;
        }
        if (!inComment && !inMultilineComment) {
            lastChar = char;
        }
    }
    // Clean up operators and punctuation
    result = result
        .replace(/\s*([+\-*/%=<>!&|^~?:,;{}[\]()])\s*/g, '$1')
        .replace(/\s+/g, ' ')
        .trim();
    // Restore strings
    return result.replace(/__STRING_(\d+)__/g, (_, index) => strings[parseInt(index)]);
}
/**
 * Generates a bundled JavaScript file from an entry point
 */
async function generateBundle(projectPath, entryPoint, options = {}) {
    const { minify = true, comments = true, ...dependencyOptions } = options;
    try {
        const entryFilePath = path__namespace.resolve(projectPath, entryPoint);
        const dependencies = await resolveDependencies(entryFilePath, new Set(), {
            ...dependencyOptions,
            baseDir: projectPath
        });
        if (dependencies.size === 0) {
            throw new Error(`No dependencies found for ${entryPoint}`);
        }
        const chunks = [];
        for (const dep of dependencies) {
            const content = await fs__namespace.readFile(dep, 'utf-8');
            const relativePath = path__namespace.relative(projectPath, dep);
            if (comments) {
                chunks.push(`\n// File: ${relativePath}`);
            }
            chunks.push(content);
        }
        const bundle = chunks.join('\n');
        return minify ? minifyBundle(bundle) : bundle;
    }
    catch (err) {
        throw new Error(`Failed to generate bundle from ${entryPoint}: ${err instanceof Error ? err.message : String(err)}`);
    }
}

const gzipAsync$1 = util.promisify(zlib.gzip);
class AeroSSR {
    config;
    logger;
    server;
    routes;
    middlewares;
    constructor(config = {}) {
        const corsOptions = typeof config.corsOrigins === 'string'
            ? { origins: config.corsOrigins }
            : config.corsOrigins || { origins: '*' };
        this.config = {
            loggerOptions: config.loggerOptions || {},
            errorHandler: config.errorHandler || handleError,
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
        this.server = null;
        this.routes = new Map();
        this.middlewares = [];
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
            await this.executeMiddlewares(req, res);
            const parsedUrl = url.parse(req.url || '', true);
            const pathname = parsedUrl.pathname || '/';
            if (req.method === 'OPTIONS') {
                setCorsHeaders(res, this.config.corsOrigins);
                res.writeHead(204);
                res.end();
                return;
            }
            const routeHandler = this.routes.get(pathname);
            if (routeHandler) {
                await routeHandler(req, res);
                return;
            }
            if (pathname === '/dist') {
                await this.handleDistRequest(req, res, parsedUrl.query);
                return;
            }
            await this.handleDefaultRequest(req, res);
        }
        catch (error) {
            await handleError(error instanceof Error ? error : new Error('Unknown error'), req, res);
        }
    }
    async handleDistRequest(req, res, query) {
        const projectPath = query.projectPath || './';
        const entryPoint = query.entryPoint || 'main.js';
        const bundle = await generateBundle(projectPath, entryPoint);
        const etag = generateETag(bundle);
        if (req.headers['if-none-match'] === etag) {
            res.writeHead(304);
            res.end();
            return;
        }
        setCorsHeaders(res, this.config.corsOrigins);
        res.writeHead(200, {
            'Content-Type': 'application/javascript',
            'Cache-Control': `public, max-age=${this.config.cacheMaxAge}`,
            'ETag': etag,
        });
        if (this.config.compression && req.headers['accept-encoding']?.includes('gzip')) {
            const compressed = await gzipAsync$1(bundle);
            res.setHeader('Content-Encoding', 'gzip');
            res.end(compressed);
        }
        else {
            res.end(bundle);
        }
    }
    async handleDefaultRequest(req, res) {
        const parsedUrl = url.parse(req.url || '', true);
        const pathname = parsedUrl.pathname || '/';
        const htmlPath = path.join(__dirname, 'index.html');
        let html = await fs.promises.readFile(htmlPath, 'utf-8');
        const meta = {
            title: `Page - ${pathname}`,
            description: `Content for ${pathname}`,
        };
        html = injectMetaTags(html, meta, this.config.defaultMeta);
        res.writeHead(200, {
            'Content-Type': 'text/html',
            'Cache-Control': 'no-cache',
        });
        res.end(html);
    }
    async start() {
        return new Promise((resolve) => {
            this.server = http.createServer((req, res) => this.handleRequest(req, res));
            this.server.listen(this.config.port, () => {
                this.logger.log(`Server is running on port ${this.config.port}`);
                resolve(this.server);
            });
        });
    }
    async stop() {
        if (this.server) {
            return new Promise((resolve) => {
                this.server?.close(() => {
                    this.logger.log('Server stopped');
                    this.server = null;
                    resolve();
                });
            });
        }
        return Promise.resolve();
    }
    listen(port) {
        this.config.port = port;
        this.start().catch(error => {
            this.logger.log(`Failed to start server: ${error.message}`);
        });
    }
}

const gzipAsync = util.promisify(zlib.gzip);
class StaticFileMiddleware {
    root;
    maxAge;
    index;
    dotFiles;
    compression;
    etag;
    constructor(options) {
        this.root = path__namespace.resolve(options.root);
        this.maxAge = options.maxAge || 86400;
        this.index = options.index || ['index.html'];
        this.dotFiles = options.dotFiles || 'ignore';
        this.compression = options.compression !== false;
        this.etag = options.etag !== false;
    }
    async handleFile(filePath, req, res) {
        try {
            const stats = await fs$1.stat(filePath);
            if (stats.isFile()) {
                await this.serveFile(filePath, stats, req, res);
                return true;
            }
            if (stats.isDirectory()) {
                for (const indexFile of this.index) {
                    const indexPath = path__namespace.join(filePath, indexFile);
                    try {
                        const indexStats = await fs$1.stat(indexPath);
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
                const normalizedPath = path__namespace.normalize(urlPath);
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
                const fullPath = path__namespace.join(this.root, normalizedPath);
                const relative = path__namespace.relative(this.root, fullPath);
                if (relative.includes('..') || path__namespace.isAbsolute(relative)) {
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
        const mimeType = this.getMimeType(path__namespace.extname(filepath));
        const lastModified = stats.mtime.toUTCString();
        const etag = this.etag ? generateETag(`${stats.size}-${stats.mtime.getTime()}`) : null;
        // Handle conditional requests
        const ifModifiedSince = req.headers['if-modified-since'];
        const ifNoneMatch = req.headers['if-none-match'];
        if (ifNoneMatch && etag && ifNoneMatch === etag) {
            res.writeHead(304);
            res.end();
            return;
        }
        if (ifModifiedSince && new Date(ifModifiedSince) >= stats.mtime) {
            res.writeHead(304);
            res.end();
            return;
        }
        const headers = {
            'Content-Type': mimeType,
            'Cache-Control': `public, max-age=${this.maxAge}`,
            'Last-Modified': lastModified
        };
        if (etag) {
            headers['ETag'] = etag;
        }
        const acceptEncoding = req.headers['accept-encoding'];
        const shouldCompress = this.compression &&
            this.isCompressible(mimeType) &&
            acceptEncoding?.includes('gzip');
        if (shouldCompress) {
            headers['Content-Encoding'] = 'gzip';
            headers['Vary'] = 'Accept-Encoding';
        }
        res.writeHead(200, headers);
        // HEAD requests should only return headers
        if (req.method === 'HEAD') {
            res.end();
            return;
        }
        // Handle file serving
        if (stats.size > 1024 * 1024) { // 1MB threshold
            const stream = fs.createReadStream(filepath);
            if (shouldCompress) {
                const gzipStream = zlib.createGzip();
                stream
                    .on('error', () => res.end())
                    .pipe(gzipStream)
                    .on('error', () => res.end())
                    .pipe(res);
            }
            else {
                stream
                    .on('error', () => res.end())
                    .pipe(res);
            }
        }
        else {
            try {
                const content = await fs$1.readFile(filepath);
                if (shouldCompress) {
                    const compressed = await gzipAsync(content);
                    res.end(compressed);
                }
                else {
                    res.end(content);
                }
            }
            catch (error) {
                res.end();
            }
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

// src/cli/commands.ts
/**
 * Get the project root directory by looking for package.json
 */
async function findProjectRoot(startDir) {
    let currentDir = startDir;
    while (currentDir !== path.parse(currentDir).root) {
        try {
            const pkgPath = path.join(currentDir, 'package.json');
            await fs.promises.access(pkgPath);
            return currentDir;
        }
        catch {
            currentDir = path.dirname(currentDir);
        }
    }
    return startDir; // Fallback to start directory if no package.json found
}
/**
 * Initialize a new AeroSSR project structure
 */
async function initializeSSR(directory) {
    try {
        // Find project root
        const projectRoot = await findProjectRoot(process.cwd());
        const targetDir = path.resolve(projectRoot, directory);
        // Create required directories
        const publicDir = path.join(targetDir, 'public');
        const logDir = path.join(targetDir, 'logs');
        const configDir = path.join(targetDir, 'config');
        const logFilePath = path.join(logDir, 'server.log');
        await fs.promises.mkdir(publicDir, { recursive: true });
        await fs.promises.mkdir(logDir, { recursive: true });
        await fs.promises.mkdir(configDir, { recursive: true });
        // Create default HTML template
        const indexHtmlPath = path.join(publicDir, 'index.html');
        const defaultHtmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AeroSSR App</title>
    <link rel="stylesheet" href="/styles/main.css">
</head>
<body>
    <div id="app">
        <h1>Welcome to AeroSSR</h1>
        <p>Edit public/index.html to get started</p>
    </div>
    <script src="/dist/main.js"></script>
</body>
</html>`;
        // Create default CSS
        const stylesDir = path.join(publicDir, 'styles');
        await fs.promises.mkdir(stylesDir, { recursive: true });
        const defaultCssContent = `
body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    margin: 0;
    padding: 2rem;
}

#app {
    max-width: 800px;
    margin: 0 auto;
}

h1 {
    color: #2c3e50;
}`;
        // Create necessary files
        await fs.promises.writeFile(indexHtmlPath, defaultHtmlContent.trim(), 'utf-8');
        await fs.promises.writeFile(path.join(stylesDir, 'main.css'), defaultCssContent.trim(), 'utf-8');
        await fs.promises.writeFile(logFilePath, '', 'utf-8');
        // Create empty dist directory for bundled files
        const distDir = path.join(publicDir, 'dist');
        await fs.promises.mkdir(distDir, { recursive: true });
        console.log(`AeroSSR project initialized in ${targetDir}`);
    }
    catch (error) {
        throw new Error(`Failed to initialize project: ${error instanceof Error ? error.message : String(error)}`);
    }
}
/**
 * Create a logging middleware
 */
function createLoggingMiddleware() {
    return async (_req, _res, next) => {
        const start = Date.now();
        try {
            await next();
        }
        finally {
            const duration = Date.now() - start;
            console.log(`${_req.method} ${_req.url} - ${duration}ms`);
        }
    };
}
/**
 * Create an error handling middleware
 */
function createErrorMiddleware() {
    return async (_req, res, next) => {
        try {
            await next();
        }
        catch (error) {
            console.error('Server error:', error);
            if (!res.headersSent) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Internal Server Error');
            }
        }
    };
}
/**
 * Configure middleware for the AeroSSR instance
 */
async function configureMiddleware(app, config) {
    if (!app) {
        throw new Error('AeroSSR instance is required');
    }
    // Configure static file middleware with security defaults
    const staticMiddleware = new StaticFileMiddleware({
        root: 'public',
        maxAge: 86400,
        index: ['index.html'],
        dotFiles: 'deny',
        compression: true,
        etag: true,
    });
    app.use(staticMiddleware.middleware());
    app.use(createLoggingMiddleware());
    app.use(createErrorMiddleware());
    {
        try {
            const projectRoot = await findProjectRoot(process.cwd());
            const middlewarePath = path.resolve(projectRoot, config.path);
            // Verify middleware file exists
            await fs.promises.access(middlewarePath);
            const customMiddleware = require(middlewarePath);
            if (typeof customMiddleware[config.name] !== 'function') {
                throw new Error(`Middleware ${config.name} not found in ${config.path}`);
            }
            app.use(customMiddleware[config.name](config.options));
        }
        catch (error) {
            throw new Error(`Failed to configure middleware ${config.name}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}

// src/cli/index.ts
const CONFIG_FILE = 'aerossr.config.json';
/**
 * Load configuration from file or return defaults
 */
async function loadConfig() {
    try {
        // First try to find config in current directory
        if (fs.existsSync(CONFIG_FILE)) {
            const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
            return {
                port: config.port ?? 3000,
                logPath: config.logPath ?? 'logs/server.log',
                middleware: config.middleware ?? [],
                ...config
            };
        }
        // If not found, look for it in parent directories
        let currentDir = process.cwd();
        while (currentDir !== path.resolve(currentDir, '..')) {
            const configPath = path.join(currentDir, CONFIG_FILE);
            if (fs.existsSync(configPath)) {
                const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
                return {
                    port: config.port ?? 3000,
                    logPath: config.logPath ?? 'logs/server.log',
                    middleware: config.middleware ?? [],
                    ...config
                };
            }
            currentDir = path.resolve(currentDir, '..');
        }
        // If no config found, return defaults
        return {
            port: 3000,
            logPath: 'logs/server.log',
            middleware: []
        };
    }
    catch (error) {
        console.warn(`Warning: Could not load config file: ${error instanceof Error ? error.message : String(error)}`);
        return {
            port: 3000,
            logPath: 'logs/server.log',
            middleware: []
        };
    }
}
/**
 * Save configuration to file
 */
async function saveConfig(config) {
    try {
        // Ensure config directory exists
        const configDir = process.cwd();
        await fs.promises.mkdir(configDir, { recursive: true });
        // Format config for better readability
        const formattedConfig = JSON.stringify(config, null, 2);
        await fs.promises.writeFile(CONFIG_FILE, formattedConfig, 'utf-8');
    }
    catch (error) {
        throw new Error(`Failed to save config: ${error instanceof Error ? error.message : String(error)}`);
    }
}
// Initialize CLI program
const program = new commander.Command();
program
    .name('aerossr')
    .version('0.1.1')
    .description('AeroSSR CLI for managing server-side rendering configurations');
// Init command
program
    .command('init')
    .description('Initialize a new AeroSSR project')
    .option('-d, --directory <path>', 'Project directory path', '.')
    .option('-p, --port <number>', 'Server port number', '3000')
    .action(async (options) => {
    try {
        const directory = path.resolve(options.directory);
        await initializeSSR(directory);
        const config = {
            port: parseInt(options.port, 10),
            logPath: path.join(directory, 'logs/server.log'),
            middleware: []
        };
        await saveConfig(config);
        console.log('Successfully initialized AeroSSR project');
    }
    catch (error) {
        console.error('Initialization failed:', error instanceof Error ? error.message : String(error));
        process.exit(1);
    }
});
// Middleware command
program
    .command('middleware')
    .description('Configure AeroSSR middleware')
    .requiredOption('-n, --name <name>', 'Middleware name')
    .requiredOption('-p, --path <path>', 'Middleware path')
    .option('-o, --options <json>', 'Middleware options as JSON')
    .action(async (options) => {
    try {
        const config = await loadConfig();
        const app = new AeroSSR({
            port: config.port,
            logFilePath: config.logPath,
        });
        const middlewareConfig = {
            name: options.name,
            path: path.resolve(options.path),
            options: options.options ? JSON.parse(options.options) : undefined
        };
        await configureMiddleware(app, middlewareConfig);
        config.middleware.push(middlewareConfig);
        await saveConfig(config);
        console.log(`Successfully configured middleware: ${options.name}`);
    }
    catch (error) {
        console.error('Middleware configuration failed:', error instanceof Error ? error.message : String(error));
        process.exit(1);
    }
});
// Config command
program
    .command('config')
    .description('Manage AeroSSR configuration')
    .option('-u, --update <key=value>', 'Update configuration')
    .option('-l, --list', 'List current configuration')
    .option('-r, --reset', 'Reset configuration to defaults')
    .action(async (options) => {
    try {
        let config = await loadConfig();
        if (options.reset) {
            config = {
                port: 3000,
                logPath: 'logs/server.log',
                middleware: []
            };
            await saveConfig(config);
            console.log('Configuration reset to defaults');
        }
        else if (options.update) {
            const [key, value] = options.update.split('=');
            if (!key || value === undefined) {
                throw new Error('Invalid key-value format');
            }
            config[key] = isNaN(Number(value)) ? value : Number(value);
            await saveConfig(config);
            console.log(`Updated configuration: ${key}=${value}`);
        }
        else if (options.list) {
            console.log('Current configuration:');
            console.log(JSON.stringify(config, null, 2));
        }
    }
    catch (error) {
        console.error('Configuration failed:', error instanceof Error ? error.message : String(error));
        process.exit(1);
    }
});
// Parse command line arguments
program.parse(process.argv);
//# sourceMappingURL=index.cjs.map
