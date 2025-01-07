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

export class AeroSSRCommands {
  private readonly logger: Logger;

  constructor(logger?: Logger) {
    this.logger = logger || new Logger();
  }

  /**
   * Find the project root directory by looking for package.json
   */
  private async findProjectRoot(startDir: string): Promise<string> {
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
    
    return startDir;
  }

  /**
   * Create default project structure
   */
  private async createProjectStructure(targetDir: string): Promise<Record<string, string>> {
    const dirs = {
      public: path.join(targetDir, 'public'),
      logs: path.join(targetDir, 'logs'),
      config: path.join(targetDir, 'config'),
      styles: path.join(targetDir, 'public', 'styles'),
      dist: path.join(targetDir, 'public', 'dist')
    };

    // Create all directories
    await Promise.all(
      Object.values(dirs).map(dir => fs.mkdir(dir, { recursive: true }))
    );

    return dirs;
  }

  /**
   * Create default project files
   */
  private async createProjectFiles(dirs: Record<string, string>): Promise<void> {
    const files = {
      html: {
        path: path.join(dirs.public, 'index.html'),
        content: `<!DOCTYPE html>
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
</html>`
      },
      css: {
        path: path.join(dirs.styles, 'main.css'),
        content: `body {
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
}`
      },
      log: {
        path: path.join(dirs.logs, 'server.log'),
        content: ''
      }
    };

    // Create all files
    await Promise.all(
      Object.values(files).map(file => 
        fs.writeFile(file.path, file.content.trim(), 'utf-8')
      )
    );
  }

  /**
   * Initialize a new AeroSSR project
   */
  public async initializeProject(directory: string): Promise<void> {
    try {
      const projectRoot = await this.findProjectRoot(process.cwd());
      const targetDir = path.resolve(projectRoot, directory);
      
      this.logger.log(`Initializing AeroSSR project in ${targetDir}`);

      const dirs = await this.createProjectStructure(targetDir);
      await this.createProjectFiles(dirs);

      this.logger.log('Project initialization completed successfully');
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
      const start = Date.now();
      try {
        await next();
      } finally {
        const duration = Date.now() - start;
        this.logger.log(`${req.method} ${req.url} - ${duration}ms`);
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
        this.logger.log(`Server error: ${error instanceof Error ? error.message : String(error)}`);
        if (!res.headersSent) {
          res.writeHead(500, { 
            'Content-Type': 'text/plain',
            'X-Content-Type-Options': 'nosniff'
          });
          res.end('Internal Server Error');
        }
      }
    };
  }

  /**
   * Load custom middleware
   */
  private async loadCustomMiddleware(config: MiddlewareConfig, projectRoot: string): Promise<Middleware> {
    const middlewarePath = path.resolve(projectRoot, config.path);
    
    try {
      await fs.access(middlewarePath);
      
      const customMiddleware = require(middlewarePath);
      if (typeof customMiddleware[config.name] !== 'function') {
        throw new Error(`Middleware ${config.name} not found in ${config.path}`);
      }
      
      return customMiddleware[config.name](config.options);
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

    // Configure static file middleware with security defaults
    const staticMiddleware = new StaticFileMiddleware({
      root: 'public',
      maxAge: 86400,
      index: ['index.html'],
      dotFiles: 'deny',
      compression: true,
      etag: true,
      headers: {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'SAMEORIGIN'
      }
    });
    
    app.use(staticMiddleware.middleware());
    app.use(this.createLoggingMiddleware());
    app.use(this.createErrorMiddleware());

    if (config) {
      try {
        const projectRoot = await this.findProjectRoot(process.cwd());
        const middleware = await this.loadCustomMiddleware(config, projectRoot);
        app.use(middleware);
      } catch (error) {
        this.logger.log(`Middleware configuration failed: ${error instanceof Error ? error.message : String(error)}`);
        throw error;
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
      console.error('Cleanup failed:', error);
    }
  }
}

// Export singleton instance
export const aeroCommands = new AeroSSRCommands();