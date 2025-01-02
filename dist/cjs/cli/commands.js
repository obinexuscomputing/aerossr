'use strict';

var require$$3 = require('fs');
var path = require('path');
require('../AeroSSR.js');
var StaticFileMiddleware = require('../middlewares/StaticFileMiddleware.js');
require('fs/promises');
require('crypto');

/**
 * Initialize a new AeroSSR project in the specified directory
 */
async function initializeSSR(directory) {
    const projectRoot = path.resolve(directory);
    const publicDir = path.join(projectRoot, 'public');
    const logDir = path.join(projectRoot, 'logs');
    const logFilePath = path.join(logDir, 'server.log');
    // Ensure directories exist
    await require$$3.promises.mkdir(publicDir, { recursive: true });
    await require$$3.promises.mkdir(logDir, { recursive: true });
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
    await require$$3.promises.writeFile(indexHtmlPath, defaultHtmlContent, 'utf-8');
    await require$$3.promises.writeFile(logFilePath, '', 'utf-8');
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
    const staticMiddleware = new StaticFileMiddleware.StaticFileMiddleware({
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

exports.configureMiddleware = configureMiddleware;
exports.initializeSSR = initializeSSR;
//# sourceMappingURL=commands.js.map
