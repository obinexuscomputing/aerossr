#!/usr/bin/env node
'use strict';

var fs = require('fs');
var path = require('path');
require('./index2.js');
var StaticFileMiddleware = require('./index3.js');
require('fs/promises');
require('crypto');

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
    const staticMiddleware = new StaticFileMiddleware.StaticFileMiddleware({
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

exports.configureMiddleware = configureMiddleware;
exports.initializeSSR = initializeSSR;
//# sourceMappingURL=index4.js.map
