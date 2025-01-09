import { AeroSSR } from '@obinexuscomputing/aerossr';
import { join } from 'path';
import { createReadStream, existsSync } from 'fs';
import { stat } from 'fs/promises';

// Initialize AeroSSR
const app = new AeroSSR({
    port: process.env.PORT || 3000,
    compression: true,
    logFilePath: join(process.cwd(), 'logs', 'server.log')
});

// Custom response wrapper middleware
app.use(async (req, res, next) => {
    // Initialize response methods if they don't exist
    if (!res.writeHead) {
        res.writeHead = function(statusCode, headers) {
            res.statusCode = statusCode;
            if (headers) {
                for (const [key, value] of Object.entries(headers)) {
                    res.setHeader(key, value);
                }
            }
        };
    }

    const start = Date.now();
    let ended = false;

    // Track original end method
    const originalEnd = res.end;
    res.end = function(...args) {
        if (!ended) {
            ended = true;
            const duration = Date.now() - start;
            app.logger.log(`${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
            return originalEnd.apply(this, args);
        }
    };

    try {
        await next();
    } catch (error) {
        app.logger.log(`Error handling request: ${error.message}`);
        if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Internal Server Error');
        }
    }
});

// CORS middleware
app.use(async (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }
    await next();
});

// Favicon handler
app.use(async (req, res, next) => {
    if (req.url === '/favicon.ico') {
        const faviconPath = join(process.cwd(), 'public', 'favicon.ico');
        if (existsSync(faviconPath)) {
            try {
                const stats = await stat(faviconPath);
                res.writeHead(200, {
                    'Content-Type': 'image/x-icon',
                    'Content-Length': stats.size,
                    'Cache-Control': 'public, max-age=31536000' // Cache for 1 year
                });
                createReadStream(faviconPath).pipe(res);
            } catch (err) {
                // Return 204 for missing favicon instead of 404
                res.writeHead(204);
                res.end();
            }
        } else {
            // Return 204 for missing favicon
            res.writeHead(204);
            res.end();
        }
        return;
    }
    await next();
});

// Static file handler
app.use(async (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
        return next();
    }

    const publicDir = join(process.cwd(), 'public');
    let filePath = join(publicDir, req.url === '/' ? 'index.html' : req.url);

    try {
        if (!existsSync(filePath)) {
            if (req.url.endsWith('/')) {
                filePath = join(filePath, 'index.html');
                if (!existsSync(filePath)) {
                    return next();
                }
            } else {
                return next();
            }
        }

        const stats = await stat(filePath);
        if (!stats.isFile()) {
            return next();
        }

        const ext = filePath.split('.').pop()?.toLowerCase();
        const mimeTypes = {
            'html': 'text/html',
            'css': 'text/css',
            'js': 'application/javascript',
            'json': 'application/json',
            'png': 'image/png',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'gif': 'image/gif',
            'ico': 'image/x-icon'
        };

        const headers = {
            'Content-Type': mimeTypes[ext] || 'application/octet-stream',
            'Content-Length': stats.size,
            'Cache-Control': 'public, max-age=86400'
        };

        const ifModifiedSince = req.headers['if-modified-since'];
        if (ifModifiedSince) {
            const lastModified = stats.mtime;
            if (new Date(ifModifiedSince) >= lastModified) {
                res.writeHead(304);
                res.end();
                return;
            }
            headers['Last-Modified'] = lastModified.toUTCString();
        }

        res.writeHead(200, headers);

        if (req.method === 'HEAD') {
            res.end();
            return;
        }

        createReadStream(filePath)
            .on('error', (err) => {
                app.logger.log(`Error streaming file: ${err.message}`);
                if (!res.headersSent) {
                    res.writeHead(500);
                    res.end('Internal Server Error');
                }
            })
            .pipe(res);

    } catch (error) {
        return next(error);
    }
});

// Default route handler
app.route('/', async (req, res) => {
    if (req.method === 'GET' && !res.headersSent) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Welcome to AeroSSR</title>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
            </head>
            <body>
                <h1>Welcome to AeroSSR</h1>
                <p>Server is running successfully!</p>
            </body>
            </html>
        `);
    }
});

// Shutdown handling
let isShuttingDown = false;
let shutdownTimer = null;

const shutdown = async (signal) => {
    if (isShuttingDown) {
        app.logger.log('Shutdown already in progress...');
        return;
    }

    if (shutdownTimer) {
        clearTimeout(shutdownTimer);
    }

    isShuttingDown = true;
    app.logger.log(`${signal} received, starting graceful shutdown...`);

    try {
        if (app.server) {
            app.server.closeAllConnections?.();
        }

        await app.stop();
        app.logger.log('Server stopped successfully');

        shutdownTimer = setTimeout(() => {
            app.logger.log('Forcing exit after timeout');
            process.exit(1);
        }, 5000);

        process.exit(0);
    } catch (err) {
        app.logger.log(`Error during shutdown: ${err.message}`);
        process.exit(1);
    }
};

// Handle shutdown signals
const signals = ['SIGTERM', 'SIGINT', 'SIGUSR2'];
signals.forEach(signal => {
    process.once(signal, () => shutdown(signal));
});

// Start server
try {
    await app.start();
    app.logger.log(`Server started on port ${app.config.port}`);
} catch (err) {
    app.logger.log(`Failed to start server: ${err.message}`);
    process.exit(1);
}

export default app;