#!/usr/bin/env node
/*!
 * @obinexuscomputing/aerossr v0.1.0
 * (c) 2025 OBINexus Computing
 * Released under the ISC License
 */
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

function createCache() {
    const cache = new Map();
    return {
        get: (key) => {
            const item = cache.get(key);
            if (!item)
                return undefined;
            if (item.expires && item.expires < Date.now()) {
                cache.delete(key);
                return undefined;
            }
            return item.value;
        },
        set: (key, value, itemTtl, ttl) => {
            const expires = itemTtl || ttl
                ? Date.now() + (itemTtl || ttl)
                : undefined;
            cache.set(key, { value, expires });
        },
        clear: () => cache.clear()
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

/**
 * Resolves all dependencies for a given file
 */
async function resolveDependencies(filePath, deps = new Set(), options = {}) {
    const { extensions = ['.js', '.ts', '.jsx', '.tsx'], maxDepth = 100, ignorePatterns = ['node_modules'] } = options;
    async function resolve(currentPath, depth = 0) {
        if (depth > maxDepth || ignorePatterns.some(pattern => currentPath.includes(pattern))) {
            return;
        }
        // Add the file to dependencies before processing to handle circular dependencies
        deps.add(currentPath);
        try {
            const content = await fs__namespace.readFile(currentPath, 'utf-8');
            // Match different import patterns
            const importPatterns = [
                /require\s*\(['"]([^'"]+)['"]\)/g,
                /import\s+.*?from\s+['"]([^'"]+)['"]/g,
                /import\s*['"]([^'"]+)['"]/g,
                /import\s*\(.*?['"]([^'"]+)['"]\s*\)/g,
                /export\s+.*?from\s+['"]([^'"]+)['"]/g // export ... from '...'
            ];
            for (const pattern of importPatterns) {
                let match;
                while ((match = pattern.exec(content)) !== null) {
                    const importPath = match[1];
                    if (!importPath)
                        continue;
                    try {
                        const fullPath = await resolveFilePath(importPath, currentPath, extensions);
                        if (fullPath && !deps.has(fullPath)) {
                            await resolve(fullPath, depth + 1);
                        }
                    }
                    catch (err) {
                        if (process.env.NODE_ENV !== 'test') {
                            console.warn(`Warning: Could not resolve dependency ${importPath} in ${currentPath}`);
                        }
                    }
                }
            }
        }
        catch (err) {
            throw new Error(`Error processing ${currentPath}: ${err instanceof Error ? err.message : String(err)}`);
        }
    }
    await resolve(filePath);
    return deps;
}
/**
 * Resolves the full path of an import
 */
async function resolveFilePath(importPath, fromPath, extensions) {
    // Handle package imports
    if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
        return null;
    }
    const basePath = path__namespace.resolve(path__namespace.dirname(fromPath), importPath);
    // Check if path has extension
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
        const fullPath = basePath + ext;
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
 * Minifies JavaScript code while preserving important structures
 */
function minifyBundle(code) {
    if (!code.trim())
        return '';
    // Replace all line comments
    code = code.replace(/\/\/[^\n]*/g, '');
    // Replace all multiline comments
    code = code.replace(/\/\*[\s\S]*?\*\//g, '');
    // Handle string literals and operators
    let result = '';
    let inString = false;
    let stringChar = '';
    let lastChar = '';
    for (let i = 0; i < code.length; i++) {
        const char = code[i];
        if (inString) {
            result += char;
            if (char === stringChar && lastChar !== '\\') {
                inString = false;
            }
        }
        else if (char === '"' || char === "'") {
            inString = true;
            stringChar = char;
            result += char;
        }
        else if (char && /\s/.test(char)) {
            const prevChar = result[result.length - 1];
            const nextChar = code[i + 1];
            // Keep space only if needed for syntax
            if (prevChar && nextChar &&
                /[a-zA-Z0-9_$]/.test(prevChar) &&
                /[a-zA-Z0-9_$]/.test(nextChar)) {
                result += ' ';
            }
        }
        else {
            result += char;
        }
        lastChar = char;
    }
    // Clean up operators and punctuation
    return result
        .replace(/\s*([+\-*/%=<>!&|^~?:,;{}[\]()])\s*/g, '$1')
        .replace(/\s+/g, ' ')
        .trim();
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
        let bundle = '';
        for (const dep of dependencies) {
            const content = await fs__namespace.readFile(dep, 'utf-8');
            const relativePath = path__namespace.relative(projectPath, dep);
            if (comments) {
                bundle += `\n// File: ${relativePath}\n`;
            }
            bundle += `${content}\n`;
        }
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
        this.root = options.root;
        this.maxAge = options.maxAge || 86400; // Default 24 hours
        this.index = options.index || ['index.html'];
        this.dotFiles = options.dotFiles || 'ignore';
        this.compression = options.compression !== false;
        this.etag = options.etag !== false;
    }
    isDotFile(urlPath) {
        return urlPath.split('/').some(part => part.startsWith('.'));
    }
    async handleDotFile(_req, res, next) {
        if (this.dotFiles === 'allow') {
            return false; // Continue processing
        }
        if (this.dotFiles === 'deny') {
            res.writeHead(403, { 'Content-Type': 'text/plain' });
            res.end('Forbidden');
            return true;
        }
        // ignore - pass to next middleware
        await next();
        return true;
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
            '.wasm': 'application/wasm',
        };
        return mimeTypes[ext] || 'application/octet-stream';
    }
    async serveFile(filepath, stats, req, res) {
        const mimeType = this.getMimeType(path__namespace.extname(filepath).toLowerCase());
        const lastModified = stats.mtime.toUTCString();
        // Handle conditional requests
        const ifModifiedSince = req.headers['if-modified-since'];
        const ifNoneMatch = req.headers['if-none-match'];
        const etag = this.etag ? generateETag(`${filepath}:${stats.mtime.toISOString()}`) : null;
        if (etag && ifNoneMatch === etag ||
            (ifModifiedSince && new Date(ifModifiedSince).getTime() >= stats.mtime.getTime())) {
            res.writeHead(304);
            res.end();
            return;
        }
        const headers = {
            'Content-Type': mimeType,
            'Cache-Control': `public, max-age=${this.maxAge}`,
            'Last-Modified': lastModified,
        };
        if (etag) {
            headers['ETag'] = etag;
        }
        // Handle compression for suitable files
        if (this.compression && this.isCompressible(mimeType) && stats.size > 1024) {
            const acceptEncoding = req.headers['accept-encoding'] || '';
            if (acceptEncoding.includes('gzip')) {
                headers['Content-Encoding'] = 'gzip';
                headers['Vary'] = 'Accept-Encoding';
                res.writeHead(200, headers);
                // Use streaming for large files
                if (stats.size > 1024 * 1024) { // 1MB threshold
                    const stream = fs.createReadStream(filepath).pipe(zlib.createGzip());
                    stream.pipe(res);
                    return;
                }
                else {
                    // Use buffer compression for smaller files
                    const content = await fs$1.readFile(filepath);
                    const compressed = await gzipAsync(content);
                    res.end(compressed);
                    return;
                }
            }
        }
        // Serve uncompressed
        res.writeHead(200, headers);
        if (stats.size > 1024 * 1024) { // 1MB threshold
            fs.createReadStream(filepath).pipe(res);
        }
        else {
            const content = await fs$1.readFile(filepath);
            res.end(content);
        }
    }
    middleware() {
        return async (_req, res, next) => {
            try {
                // Check request method
                if (_req.method !== 'GET' && _req.method !== 'HEAD') {
                    await next();
                    return;
                }
                // Safely handle URL parsing
                const rawUrl = _req.url ?? '';
                const queryIndex = rawUrl.indexOf('?');
                const urlWithoutQuery = queryIndex >= 0 ? rawUrl.slice(0, queryIndex) : rawUrl;
                const decodedUrl = decodeURIComponent(urlWithoutQuery);
                const urlPath = path__namespace.normalize(decodedUrl);
                // Security check for dotfiles
                if (this.isDotFile(urlPath)) {
                    const handled = await this.handleDotFile(_req, res, next);
                    if (handled)
                        return;
                }
                // Prevent directory traversal
                const fullPath = path__namespace.join(this.root, urlPath);
                if (!fullPath.startsWith(this.root)) {
                    res.writeHead(403);
                    res.end('Forbidden');
                    return;
                }
                try {
                    const stats = await fs$1.stat(fullPath);
                    if (stats.isDirectory()) {
                        for (const indexFile of this.index) {
                            const indexPath = path__namespace.join(fullPath, indexFile);
                            try {
                                const indexStats = await fs$1.stat(indexPath);
                                if (indexStats.isFile()) {
                                    await this.serveFile(indexPath, indexStats, _req, res);
                                    return;
                                }
                            }
                            catch {
                                continue;
                            }
                        }
                        await next();
                        return;
                    }
                    if (stats.isFile()) {
                        await this.serveFile(fullPath, stats, _req, res);
                        return;
                    }
                    await next();
                }
                catch (error) {
                    if (error.code === 'ENOENT') {
                        await next();
                    }
                    else {
                        throw error;
                    }
                }
            }
            catch (error) {
                res.writeHead(500);
                res.end('Internal Server Error');
            }
        };
    }
}

async function initializeSSR(directory) {
    const projectRoot = path.resolve(directory);
    const publicDir = path.join(projectRoot, 'public');
    const logDir = path.join(projectRoot, 'logs');
    const logFilePath = path.join(logDir, 'server.log');
    await fs.promises.mkdir(publicDir, { recursive: true });
    await fs.promises.mkdir(logDir, { recursive: true });
    const indexHtmlPath = path.join(publicDir, 'index.html');
    const defaultHtmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AeroSSR App</title>
</head>
<body>
    <h1>Welcome to AeroSSR</h1>
    <div id="app"></div>
</body>
</html>`;
    await fs.promises.writeFile(indexHtmlPath, defaultHtmlContent, 'utf-8');
    await fs.promises.writeFile(logFilePath, '', 'utf-8');
}
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
async function configureMiddleware(app, config) {
    if (!app) {
        throw new Error('AeroSSR instance is required');
    }
    const staticMiddleware = new StaticFileMiddleware({
        root: 'public',
        maxAge: 86400,
        index: ['index.html'],
        dotFiles: 'ignore',
        compression: true,
        etag: true,
    });
    app.use(staticMiddleware.middleware());
    app.use(createLoggingMiddleware());
    app.use(createErrorMiddleware());
    {
        try {
            const customMiddleware = require(config.path);
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

const CONFIG_FILE = 'aerossr.config.json';
function loadConfig() {
    try {
        const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
        return {
            port: config.port ?? 3000,
            logPath: config.logPath ?? 'logs/server.log',
            middleware: config.middleware ?? [],
            ...config
        };
    }
    catch {
        return {
            port: 3000,
            logPath: 'logs/server.log',
            middleware: []
        };
    }
}
function saveConfig(config) {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
}
const program = new commander.Command();
program
    .version('1.0.0')
    .description('AeroSSR CLI for managing server-side rendering configurations');
program
    .command('init')
    .description('Initialize a new AeroSSR project')
    .option('-d, --directory <path>', 'Project directory path', '.')
    .action(async (options) => {
    try {
        const directory = path.resolve(options.directory);
        await initializeSSR(directory);
        const config = {
            port: 3000,
            logPath: path.join(directory, 'logs/server.log'),
            middleware: []
        };
        saveConfig(config);
    }
    catch (error) {
        console.error('Initialization failed:', error instanceof Error ? error.message : String(error));
        process.exit(1);
    }
});
program
    .command('middleware')
    .description('Configure AeroSSR middleware')
    .requiredOption('-n, --name <name>', 'Middleware name')
    .requiredOption('-p, --path <path>', 'Middleware path')
    .option('-o, --options <json>', 'Middleware options as JSON')
    .action(async (options) => {
    try {
        const config = loadConfig();
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
        saveConfig(config);
    }
    catch (error) {
        console.error('Middleware configuration failed:', error instanceof Error ? error.message : String(error));
        process.exit(1);
    }
});
program
    .command('config')
    .description('Manage AeroSSR configuration')
    .option('-u, --update <key=value>', 'Update configuration')
    .action((options) => {
    try {
        const config = loadConfig();
        if (options.update) {
            const [key, value] = options.update.split('=');
            if (!key || value === undefined) {
                throw new Error('Invalid key-value format');
            }
            config[key] = isNaN(Number(value)) ? value : Number(value);
            saveConfig(config);
        }
        else {
            console.log(JSON.stringify(config, null, 2));
        }
    }
    catch (error) {
        console.error('Configuration failed:', error instanceof Error ? error.message : String(error));
        process.exit(1);
    }
});
program.parse(process.argv);
/*!
 * End of bundle for @obinexuscomputing/aerossr
 */
//# sourceMappingURL=index.js.map
