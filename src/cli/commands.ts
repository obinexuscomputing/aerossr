import { promises as fs } from 'fs';
import path from 'path';
import { AeroSSR, StaticFileMiddleware } from '../';
import type { IncomingMessage, ServerResponse } from 'http';
import type { Middleware } from '../types';

/**
 * Initialize a new AeroSSR project in the specified directory
 */
export async function initializeSSR(directory: string): Promise<void> {
    const projectRoot = path.resolve(directory);
    const publicDir = path.join(projectRoot, 'public');
    const logDir = path.join(projectRoot, 'logs');
    const logFilePath = path.join(logDir, 'server.log');

    // Ensure directories exist
    await fs.mkdir(publicDir, { recursive: true });
    await fs.mkdir(logDir, { recursive: true });

    // Create a default index.html file
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
</html>
`;

    await fs.writeFile(indexHtmlPath, defaultHtmlContent, 'utf-8');
    await fs.writeFile(logFilePath, '', 'utf-8');

    console.log(`Initialized a new AeroSSR project in ${projectRoot}`);
}

/**
 * Create a logging middleware
 */
function createLoggingMiddleware(): Middleware {
    return async (_req: IncomingMessage, _res: ServerResponse, next: () => Promise<void>) => {
        const start = Date.now();
        try {
            await next();
        } finally {
            const duration = Date.now() - start;
            console.log(`${_req.method} ${_req.url} - ${duration}ms`);
        }
    };
}

/**
 * Create an error handling middleware
 */
function createErrorMiddleware(): Middleware {
    return async (_req: IncomingMessage, res: ServerResponse, next: () => Promise<void>) => {
        try {
            await next();
        } catch (error) {
            console.error('Server error:', error);
            
            if (!res.headersSent) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Internal Server Error');
            }
        }
    };
}

/**
 * Configure middleware for an AeroSSR application
 */
export function configureMiddleware(app: AeroSSR, name?: string, customPath?: string): void {
    // Add static file middleware
    const staticMiddleware = new StaticFileMiddleware({
        root: 'public',
        maxAge: 86400, // Cache for 1 day
        index: ['index.html'],
        dotFiles: 'ignore',
        compression: true,
        etag: true,
    });
    
    app.use(staticMiddleware.middleware());

    // Add logging middleware
    app.use(createLoggingMiddleware());

    // Add error handling middleware
    app.use(createErrorMiddleware());

    // Add custom middleware if provided
    if (name && customPath) {
        const customMiddleware = require(customPath);
        app.use(customMiddleware[name]);
    }
}
