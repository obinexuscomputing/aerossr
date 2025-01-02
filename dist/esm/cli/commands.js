import { promises } from 'fs';
import path__default from 'path';
import '../AeroSSR.js';
import { StaticFileMiddleware } from '../middlewares/StaticFileMiddleware.js';
import 'fs/promises';
import 'crypto';

/**
 * Initialize a new AeroSSR project in the specified directory
 */
async function initializeSSR(directory) {
    const projectRoot = path__default.resolve(directory);
    const publicDir = path__default.join(projectRoot, 'public');
    const logDir = path__default.join(projectRoot, 'logs');
    const logFilePath = path__default.join(logDir, 'server.log');
    // Ensure directories exist
    await promises.mkdir(publicDir, { recursive: true });
    await promises.mkdir(logDir, { recursive: true });
    // Create a default index.html file
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
</html>
`;
    await promises.writeFile(indexHtmlPath, defaultHtmlContent, 'utf-8');
    await promises.writeFile(logFilePath, '', 'utf-8');
    console.log(`Initialized a new AeroSSR project in ${projectRoot}`);
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
 * Configure middleware for an AeroSSR application
 */
function configureMiddleware(app, name, customPath) {
    // Add static file middleware
    const staticMiddleware = new StaticFileMiddleware({
        root: 'public',
        maxAge: 86400,
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

export { configureMiddleware, initializeSSR };
//# sourceMappingURL=commands.js.map
