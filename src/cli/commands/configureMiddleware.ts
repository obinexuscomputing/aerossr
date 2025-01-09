//src/cli/commands/configureMiddleware.ts
import { AeroSSR } from '@/core/AeroSSR';
import { AeroSSRConfig, MiddlewareConfig } from '@/types/aerossr';
import { BundleHandler } from '@/types';
import { Logger } from '@/utils/logging';
import path from 'path';

interface InitOptions {
  projectPath: string;
  port: number;
  logPath: string;
}

export async function configureMiddleware(
  app: AeroSSR,
  middlewareConfig: MiddlewareConfig
): Promise<void> {
  try {
    const middleware = require(middlewareConfig.path);
    
    if (typeof middleware[middlewareConfig.name] !== 'function') {
      throw new Error(`Middleware ${middlewareConfig.name} not found in ${middlewareConfig.path}`);
    }

    app.use(middleware[middlewareConfig.name](middlewareConfig.options));
  } catch (error) {
    throw new Error(`Failed to configure middleware ${middlewareConfig.name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function initializeMiddleware(options: InitOptions): Promise<AeroSSR> {
  const logger = new Logger({
    logFilePath: options.logPath,
    logLevel: 'info'
  });

  const config: AeroSSRConfig = {
    projectPath: options.projectPath,
    publicPath: path.join(options.projectPath, 'public'),
    port: options.port,
    logFilePath: options.logPath,
    logger: logger
  };

  return new AeroSSR(config);
}

// Helper to create AeroSSRConfig
export function createAeroConfig(
  projectPath: string, 
  logger: Logger, 
  options: Partial<AeroSSRConfig> = {}
): AeroSSRConfig {
  return {
    projectPath,
    publicPath: path.join(projectPath, 'public'),
    logger,
    ...options
  };
}