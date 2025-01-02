import { promises } from 'fs';
import path__default from 'path';
import '../AeroSSR.js';
import { StaticFileMiddleware } from '../middlewares/StaticFileMiddleware.js';
import 'fs/promises';
import 'crypto';

async function initializeSSR(directory) {
    const projectRoot = path__default.resolve(directory);
    const publicDir = path__default.join(projectRoot, 'public');
    const logDir = path__default.join(projectRoot, 'logs');
    const logFilePath = path__default.join(logDir, 'server.log');
    await promises.mkdir(publicDir, { recursive: true });
    await promises.mkdir(logDir, { recursive: true });
    const indexHtmlPath = path__default.join(publicDir, 'index.html');
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
    await promises.writeFile(indexHtmlPath, defaultHtmlContent, 'utf-8');
    await promises.writeFile(logFilePath, '', 'utf-8');
}
function createLoggingMiddleware() {
    return async (req, res, next) => {
        const start = Date.now();
        try {
            await next();
        }
        finally {
            const duration = Date.now() - start;
            console.log(`${req.method} ${req.url} - ${duration}ms`);
        }
    };
}
function createErrorMiddleware() {
    return async (req, res, next) => {
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

export { configureMiddleware, initializeSSR };
//# sourceMappingURL=commands.js.map
