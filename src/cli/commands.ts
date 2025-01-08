import { promises as fs } from 'fs';
import path from 'path';
import { AeroSSR, StaticFileMiddleware } from '..';
import type { Middleware } from '../types';
import { Logger } from '../utils/Logger';

export interface MiddlewareConfig {
  name: string;
  path: string;
  options?: Record<string, unknown>;
}

export interface ProjectStructure {
  public: string;
  logs: string;
  config: string;
  styles: string;
  dist: string;
}

export class AeroSSRCommands {
  private readonly logger: Logger;
  private readonly defaultHeaders = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
  };

  constructor(logger?: Logger) {
    this.logger = logger || new Logger();
  }

  /**
   * Find the project root directory
   */
  private async findProjectRoot(startDir: string): Promise<string> {
    let currentDir = startDir;
    const rootDir = path.parse(currentDir).root;
    
    while (currentDir !== rootDir) {
      try {
        const pkgPath = path.join(currentDir, 'package.json');
        await fs.access(pkgPath);
        return currentDir;
      } catch {
        currentDir = path.dirname(currentDir);
      }
    }
    
    return startDir;
  }

  /**
   * Verify directory exists or create it
   */
  private async ensureDirectory(dir: string): Promise<void> {
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  /**
   * Create project directory structure
   */
  private async createProjectStructure(targetDir: string): Promise<ProjectStructure> {
    const dirs: ProjectStructure = {
      public: path.join(targetDir, 'public'),
      logs: path.join(targetDir, 'logs'),
      config: path.join(targetDir, 'config'),
      styles: path.join(targetDir, 'public', 'styles'),
      dist: path.join(targetDir, 'public', 'dist')
    };

    await Promise.all(
      Object.values(dirs).map(dir => this.ensureDirectory(dir))
    );

    return dirs;
  }

  /**
   * Create default project files
   */
  private async createProjectFiles(dirs: ProjectStructure): Promise<void> {
    const files = {
      html: {
        path: path.join(dirs.public, 'index.html'),
        content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-Content-Type-Options" content="nosniff">
    <title>AeroSSR App</title>
    <link rel="stylesheet" href="/styles/main.css">
</head>
<body>
    <div id="app">
        <h1>Welcome to AeroSSR</h1>
        <p>Edit public/index.html to get started</p>
    </div>
    <script type="module" src="/dist/main.js"></script>
</body>
</html>`
      },
      css: {
        path: path.join(dirs.styles, 'main.css'),
        content: `/* AeroSSR Default Styles */
:root {
    --primary-color: #2c3e50;
    --background-color: #ffffff;
    --text-color: #333333;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    margin: 0;
    padding: 2rem;
    background-color: var(--background-color);
    color: var(--text-color);
}

#app {
    max-width: 800px;
    margin: 0 auto;
}

h1 {
    color: var(--primary-color);
}`
      },
      log: {
        path: path.join(dirs.logs, 'server.log'),
        content: ''
      }
    };

    await Promise.all(
      Object.entries(files).map(async ([_, file]) => {
        try {
          await fs.writeFile(file.path, file.content.trim(), 'utf-8');
        } catch (error) {
          throw new Error(`Failed to create file ${file.path}: ${error instanceof Error ? error.message : String(error)}`);
        }
      })
    );
  }

  /**
   * Initialize new AeroSSR project
   */
  public async initializeProject(directory: string): Promise<void> {
    const startTime = Date.now();
    
    try {
      const projectRoot = await this.findProjectRoot(process.cwd());
      const targetDir = path.resolve(projectRoot, directory);
      
      this.logger.log(`Initializing AeroSSR project in ${targetDir}`);

      const dirs = await this.createProjectStructure(targetDir);
      await this.createProjectFiles(dirs);

      const duration = Date.now() - startTime;
      this.logger.log(`Project initialization completed successfully in ${duration}ms`);
    } catch (error) {
      const message = `Failed to initialize project: ${error instanceof Error ? error.message : String(error)}`;
      this.logger.log(message);
      throw new Error(message);
    }
  }

  /**
   * Create logging middleware
   */
  private createLoggingMiddleware(): Middleware {
    return async (req, _res, next) => {
      const requestId = Math.random().toString(36).substring(7);
      const start = Date.now();
      
      try {
        await next();
      } finally {
        const duration = Date.now() - start;
        this.logger.log(`[${requestId}] ${req.method} ${req.url} - ${duration}ms`);
      }
    };
  }

  /**
   * Create error handling middleware
   */
  private createErrorMiddleware(): Middleware {
    return async (req, res, next) => {
      try {
        await next();
      } catch (error) {
        const errorId = Math.random().toString(36).substring(7);
        this.logger.log(`[${errorId}] Server error: ${error instanceof Error ? error.stack : String(error)}`);
        
        if (!res.headersSent) {
          res.writeHead(500, { 
            'Content-Type': 'text/plain',
            ...this.defaultHeaders
          });
          res.end(`Internal Server Error (ID: ${errorId})`);
        }
      }
    };
  }

  /**
   * Validate middleware module exports
   */
  private validateMiddlewareExports(exports: unknown, config: MiddlewareConfig): void {
    if (!exports || typeof exports !== 'object') {
      throw new Error(`Invalid middleware module: ${config.path}`);
    }

    if (typeof (exports as Record<string, unknown>)[config.name] !== 'function') {
      throw new Error(`Middleware ${config.name} not found in ${config.path}`);
    }
  }

  /**
   * Load custom middleware
   */
  private async loadCustomMiddleware(config: MiddlewareConfig, projectRoot: string): Promise<Middleware> {
    const middlewarePath = path.resolve(projectRoot, config.path);
    
    try {
      await fs.access(middlewarePath);
      
      const customMiddleware = require(middlewarePath);
      this.validateMiddlewareExports(customMiddleware, config);
      
      const middleware = customMiddleware[config.name](config.options);
      if (typeof middleware !== 'function') {
        throw new Error(`Middleware ${config.name} factory must return a function`);
      }
      
      return middleware;
    } catch (error) {
      throw new Error(
        `Failed to load middleware ${config.name}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Configure middleware for AeroSSR instance
   */
  public async configureMiddleware(
    app: AeroSSR,
    config?: MiddlewareConfig
  ): Promise<void> {
    if (!app) {
      throw new Error('AeroSSR instance is required');
    }

    // Configure static file middleware
    const staticMiddleware = new StaticFileMiddleware({
      root: 'public',
      maxAge: 86400,
      index: ['index.html'],
      dotFiles: 'deny',
      compression: true,
      etag: true,
      headers: this.defaultHeaders
    });
    
    app.use(staticMiddleware.middleware());
    app.use(this.createLoggingMiddleware());
    app.use(this.createErrorMiddleware());

    if (config) {
      try {
        const projectRoot = await this.findProjectRoot(process.cwd());
        const middleware = await this.loadCustomMiddleware(config, projectRoot);
        app.use(middleware);
        this.logger.log(`Successfully configured middleware: ${config.name}`);
      } catch (error) {
        const message = `Middleware configuration failed: ${error instanceof Error ? error.message : String(error)}`;
        this.logger.log(message);
        throw new Error(message);
      }
    }
  }

  /**
   * Clean up project resources
   */
  public async cleanup(): Promise<void> {
    try {
      await this.logger.clear();
    } catch (error) {
      console.error('Cleanup failed:', error instanceof Error ? error.message : String(error));
    }
  }
}

// Export singleton instance
export const aeroCommands = new AeroSSRCommands();