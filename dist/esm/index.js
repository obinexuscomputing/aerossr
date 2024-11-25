import { createServer } from 'http';
import fs, { promises } from 'fs';
import { parse } from 'url';
import path, { join } from 'path';
import { gzip } from 'zlib';
import { promisify } from 'util';
import crypto from 'crypto';
import fs$1 from 'fs/promises';

class Logger {
    constructor(options = {}) {
        this.logFilePath = options.logFilePath || null;
        if (this.logFilePath) {
            try {
                const logDir = path.dirname(this.logFilePath);
                if (!fs.existsSync(logDir)) {
                    fs.mkdirSync(logDir, { recursive: true });
                }
                fs.accessSync(this.logFilePath, fs.constants.W_OK | fs.constants.R_OK);
            }
            catch (error) {
                console.error(`Logger initialization failed for path: ${this.logFilePath} - ${error.message}`);
                this.logFilePath = null;
            }
        }
    }
    log(message) {
        const logMessage = `[${new Date().toISOString()}] ${message}`;
        console.log(logMessage);
        if (this.logFilePath) {
            fs.appendFile(this.logFilePath, `${logMessage}\n`, (err) => {
                if (err) {
                    console.error(`Failed to write to log file: ${err.message}`);
                }
            });
        }
    }
    logRequest(req) {
        const { method, url } = req;
        this.log(`${method} ${url}`);
    }
}

function createCache() {
    const cache = new Map();
    return {
        get: (key) => cache.get(key),
        set: (key, value) => { cache.set(key, value); },
        clear: () => cache.clear()
    };
}

function setCorsHeaders(res, origins = '*') {
    res.setHeader('Access-Control-Allow-Origin', origins);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400');
}

function generateETag(content) {
    return crypto.createHash('md5').update(content).digest('hex');
}

function generateErrorPage(statusCode, message) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Error ${statusCode}</title>
        <style>
            body { font-family: system-ui; padding: 2rem; max-width: 600px; margin: 0 auto; }
            .error { background: #f8d7da; border: 1px solid #f5c6cb; padding: 1rem; border-radius: 4px; }
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
async function handleError(error, _req, res) {
    console.error('Server error:', error);
    const statusCode = error.statusCode || 500;
    const errorPage = generateErrorPage(statusCode, error.message);
    res.writeHead(statusCode, {
        'Content-Type': 'text/html',
        'Cache-Control': 'no-store',
    });
    res.end(errorPage);
}

function injectMetaTags(html, meta = {}, defaultMeta = {}) {
    const finalMeta = { ...defaultMeta, ...meta };
    const metaTags = `
      <meta charset="${finalMeta.charset}">
      <meta name="viewport" content="${finalMeta.viewport}">
      <meta name="description" content="${finalMeta.description}">
      <title>${finalMeta.title}</title>
    `;
    return html.replace('</head>', `${metaTags}</head>`);
}

async function resolveDependencies(filePath, deps = new Set()) {
    if (deps.has(filePath))
        return deps;
    deps.add(filePath);
    const content = await fs$1.readFile(filePath, 'utf-8');
    const importMatches = content.match(/(?:require|import)\s*\(['"]([^'"]+)['"]\)/g);
    if (importMatches) {
        for (const match of importMatches) {
            const depPath = match.match(/['"]([^'"]+)['"]/)?.[1];
            if (depPath) {
                const fullPath = path.resolve(path.dirname(filePath), depPath);
                if (fullPath.endsWith('.js') || fullPath.endsWith('.ts')) {
                    await resolveDependencies(fullPath, deps);
                }
            }
        }
    }
    return deps;
}
function minifyBundle(code) {
    return code
        .replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '') // Remove comments
        .replace(/\s+/g, ' ') // Reduce multiple spaces to single space
        .replace(/^\s+|\s+$/gm, ''); // Trim line starts and ends
}
async function generateBundle(projectPath, entryPoint) {
    const entryFilePath = path.join(projectPath, entryPoint);
    const dependencies = await resolveDependencies(entryFilePath);
    let bundle = '';
    for (const dep of dependencies) {
        const content = await fs$1.readFile(dep, 'utf-8');
        bundle += `\n// File: ${path.relative(projectPath, dep)}\n${content}\n`;
    }
    return minifyBundle(bundle);
}

const gzipAsync = promisify(gzip);
class AeroSSR {
    constructor(config = {}) {
        this.config = {
            port: config.port || 3000,
            cacheMaxAge: config.cacheMaxAge || 3600,
            corsOrigins: config.corsOrigins || '*',
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
        await this.middlewares[index](req, res, () => this.executeMiddlewares(req, res, index + 1));
    }
    async handleRequest(_req, res) {
        try {
            this.logger.logRequest(_req);
            await this.executeMiddlewares(_req, res);
            const parsedUrl = parse(_req.url || '', true);
            const pathname = parsedUrl.pathname || '/';
            if (_req.method === 'OPTIONS') {
                setCorsHeaders(res, this.config.corsOrigins);
                res.writeHead(204);
                res.end();
                return;
            }
            const routeHandler = this.routes.get(pathname);
            if (routeHandler) {
                await routeHandler(_req, res);
                return;
            }
            if (pathname === '/dist') {
                await this.handleDistRequest(_req, res, parsedUrl.query);
                return;
            }
            await this.handleDefaultRequest(_req, res, pathname);
        }
        catch (error) {
            await handleError(error instanceof Error ? error : new Error('Unknown error'), _req, res);
        }
    }
    async handleDistRequest(_req, res, query) {
        const projectPath = query.projectPath || './';
        const entryPoint = query.entryPoint || 'main.js';
        const bundle = await generateBundle(projectPath, entryPoint);
        const etag = generateETag(bundle);
        if (_req.headers['if-none-match'] === etag) {
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
        const acceptEncoding = _req.headers['accept-encoding'] || '';
        if (this.config.compression && acceptEncoding.includes('gzip')) {
            const compressed = await gzipAsync(bundle);
            res.setHeader('Content-Encoding', 'gzip');
            res.end(compressed);
        }
        else {
            res.end(bundle);
        }
    }
    async handleDefaultRequest(_req, res, pathname) {
        const htmlPath = join(__dirname, 'index.html');
        let html = await promises.readFile(htmlPath, 'utf-8');
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
            this.server = createServer((req, res) => this.handleRequest(req, res));
            this.server.listen(this.config.port, () => {
                this.logger.log(`AeroSSR server running on port ${this.config.port}`);
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
}

export { AeroSSR as default };
//# sourceMappingURL=index.js.map
