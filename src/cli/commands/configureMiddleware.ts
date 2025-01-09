import { AeroSSR } from '@/core/AeroSSR';
import { Logger } from '@/utils/logging';
import path from 'path';
import { MiddlewareConfig } from './commands';

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

export async function initializeMiddleware(options: {
  projectPath: string;
  port: number;
  logPath: string;
}): Promise<AeroSSR> {
  const logger = new Logger({
    logFilePath: options.logPath,
    logLevel: 'info'
  });

  return new AeroSSR({
    projectPath: options.projectPath,
    publicPath: path.join(options.projectPath, 'public'),
    port: options.port,
    logFilePath: options.logPath,
    logger
  });
}