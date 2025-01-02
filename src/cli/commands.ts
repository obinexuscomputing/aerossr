import { promises as fs } from 'fs';
import path from 'path';
import { AeroSSR, StaticFileMiddleware } from '../';
import type { AeroSSRConfig, Middleware } from '../types';

export interface MiddlewareConfig {
  name: string;
  path: string;
  options?: Record<string, unknown>;
}

export async function initializeSSR(directory: string): Promise<void> {
    const projectRoot = path.resolve(directory);
    const publicDir = path.join(projectRoot, 'public');
    const logDir = path.join(projectRoot, 'logs');
    const logFilePath = path.join(logDir, 'server.log');

    await fs.mkdir(publicDir, { recursive: true });
    await fs.mkdir(logDir, { recursive: true });

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

    await fs.writeFile(indexHtmlPath, defaultHtmlContent, 'utf-8');
    await fs.writeFile(logFilePath, '', 'utf-8');
}

function createLoggingMiddleware(): Middleware {
    return async (req, res, next) => {
        const start = Date.now();
        try {
            await next();
        } finally {
            const duration = Date.now() - start;
            console.log(`${req.method} ${req.url} - ${duration}ms`);
        }
    };
}

function createErrorMiddleware(): Middleware {
    return async (req, res, next) => {
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

export async function configureMiddleware(
    app: AeroSSR,
    config?: MiddlewareConfig
): Promise<void> {
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

    if (config) {
        try {
            const customMiddleware = require(config.path);
            if (typeof customMiddleware[config.name] !== 'function') {
                throw new Error(`Middleware ${config.name} not found in ${config.path}`);
            }
            app.use(customMiddleware[config.name](config.options));
        } catch (error) {
            throw new Error(`Failed to configure middleware ${config.name}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}