// src/cli/commands.ts
import { promises as fs } from 'fs';
import path from 'path';
import { AeroSSR, StaticFileMiddleware } from '../';
import type { Middleware } from '../types';

export interface MiddlewareConfig {
  name: string;
  path: string;
  options?: Record<string, unknown>;
}

/**
 * Get the project root directory by looking for package.json
 */
async function findProjectRoot(startDir: string): Promise<string> {
  let currentDir = startDir;
  
  while (currentDir !== path.parse(currentDir).root) {
    try {
      const pkgPath = path.join(currentDir, 'package.json');
      await fs.access(pkgPath);
      return currentDir;
    } catch {
      currentDir = path.dirname(currentDir);
    }
  }
  
  return startDir; // Fallback to start directory if no package.json found
}

/**
 * Initialize a new AeroSSR project structure
 */
export async function initializeSSR(directory: string): Promise<void> {
    try {
        // Find project root
        const projectRoot = await findProjectRoot(process.cwd());
        const targetDir = path.resolve(projectRoot, directory);
        
        // Create required directories
        const publicDir = path.join(targetDir, 'public');
        const logDir = path.join(targetDir, 'logs');
        const configDir = path.join(targetDir, 'config');
        const logFilePath = path.join(logDir, 'server.log');

        await fs.mkdir(publicDir, { recursive: true });
        await fs.mkdir(logDir, { recursive: true });
        await fs.mkdir(configDir, { recursive: true });

        // Create default HTML template
        const indexHtmlPath = path.join(publicDir, 'index.html');
        const defaultHtmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AeroSSR App</title>
    <link rel="stylesheet" href="/styles/main.css">
</head>
<body>
    <div id="app">
        <h1>Welcome to AeroSSR</h1>
        <p>Edit public/index.html to get started</p>
    </div>
    <script src="/dist/main.js"></script>
</body>
</html>`;

        // Create default CSS
        const stylesDir = path.join(publicDir, 'styles');
        await fs.mkdir(stylesDir, { recursive: true });
        const defaultCssContent = `
body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    margin: 0;
    padding: 2rem;
}

#app {
    max-width: 800px;
    margin: 0 auto;
}

h1 {
    color: #2c3e50;
}`;

        // Create necessary files
        await fs.writeFile(indexHtmlPath, defaultHtmlContent.trim(), 'utf-8');
        await fs.writeFile(path.join(stylesDir, 'main.css'), defaultCssContent.trim(), 'utf-8');
        await fs.writeFile(logFilePath, '', 'utf-8');

        // Create empty dist directory for bundled files
        const distDir = path.join(publicDir, 'dist');
        await fs.mkdir(distDir, { recursive: true });

        console.log(`AeroSSR project initialized in ${targetDir}`);
    } catch (error) {
        throw new Error(`Failed to initialize project: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Create a logging middleware
 */
function createLoggingMiddleware(): Middleware {
    return async (_req, _res, next) => {
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
    return async (_req, res, next) => {
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
 * Configure middleware for the AeroSSR instance
 */
export async function configureMiddleware(
    app: AeroSSR,
    config?: MiddlewareConfig
): Promise<void> {
    if (!app) {
        throw new Error('AeroSSR instance is required');
    }

    // Configure static file middleware with security defaults
    const staticMiddleware = new StaticFileMiddleware({
        root: 'public',
        maxAge: 86400,
        index: ['index.html'],
        dotFiles: 'deny', // More secure default
        compression: true,
        etag: true,
    });
    
    app.use(staticMiddleware.middleware());
    app.use(createLoggingMiddleware());
    app.use(createErrorMiddleware());

    if (config) {
        try {
            const projectRoot = await findProjectRoot(process.cwd());
            const middlewarePath = path.resolve(projectRoot, config.path);
            
            // Verify middleware file exists
            await fs.access(middlewarePath);
            
            const customMiddleware = require(middlewarePath);
            if (typeof customMiddleware[config.name] !== 'function') {
                throw new Error(`Middleware ${config.name} not found in ${config.path}`);
            }
            
            app.use(customMiddleware[config.name](config.options));
        } catch (error) {
            throw new Error(`Failed to configure middleware ${config.name}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}