import { promises } from 'fs';
import path__default from 'path';
import { StaticFileMiddleware } from '../middlewares/StaticFileMiddleware.js';

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
    // Create an empty log file
    await promises.writeFile(logFilePath, '', 'utf-8');
    console.log(`Initialized a new AeroSSR project in ${projectRoot}`);
}
function configureMiddleware(app, path) {
    // Add static file middleware
    app.use(new StaticFileMiddleware({
        root: 'public',
        maxAge: 86400,
        index: ['index.html'],
        dotFiles: 'ignore',
        compression: true,
        etag: true,
    }).middleware());
    // Add logging middleware
    app.use(async (req, res, next) => {
        const start = Date.now();
        await next();
        console.log(`${req.method} ${req.url} - ${Date.now() - start}ms`);
    });
    // Add error handling middleware
    app.use(async (req, res, next) => {
        try {
            await next();
        }
        catch (error) {
            console.error(error);
            res.writeHead(500);
            res.end('Internal Server Error');
        }
    });
}

export { configureMiddleware, initializeSSR };
//# sourceMappingURL=commands.js.map
