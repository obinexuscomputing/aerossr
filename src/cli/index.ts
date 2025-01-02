import { Command } from 'commander';
import { AeroSSR } from '../';
import { initializeSSR, configureMiddleware, MiddlewareConfig } from './commands';
import { readFileSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';

interface AeroConfig {
  port: number;
  logPath: string;
  middleware: MiddlewareConfig[];
  [key: string]: unknown;
}

const CONFIG_FILE = 'aerossr.config.json';

function loadConfig(): AeroConfig {
  try {
    const config = JSON.parse(readFileSync(CONFIG_FILE, 'utf-8'));
    return {
      port: config.port ?? 3000,
      logPath: config.logPath ?? 'logs/server.log',
      middleware: config.middleware ?? [],
      ...config
    };
  } catch {
    return {
      port: 3000,
      logPath: 'logs/server.log',
      middleware: []
    };
  }
}

function saveConfig(config: AeroConfig): void {
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
}

const program = new Command();

program
  .version('1.0.0')
  .description('AeroSSR CLI for managing server-side rendering configurations');

program
  .command('init')
  .description('Initialize a new AeroSSR project')
  .option('-d, --directory <path>', 'Project directory path', '.')
  .action(async (options) => {
    try {
      const directory = resolve(options.directory);
      await initializeSSR(directory);
      
      const config: AeroConfig = {
        port: 3000,
        logPath: join(directory, 'logs/server.log'),
        middleware: []
      };
      saveConfig(config);
    } catch (error) {
      console.error('Initialization failed:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('middleware')
  .description('Configure AeroSSR middleware')
  .requiredOption('-n, --name <name>', 'Middleware name')
  .requiredOption('-p, --path <path>', 'Middleware path')
  .option('-o, --options <json>', 'Middleware options as JSON')
  .action(async (options: MiddlewareOptions) => {
    try {
      const config: AeroConfig = loadConfig();
      const app = new AeroSSR({
        port: config.port,
        logFilePath: config.logPath,
      });

      const middlewareConfig: MiddlewareConfig = {
        name: options.name,
        path: resolve(options.path),
        options: options.options ? JSON.parse(options.options) : undefined
      };

      await configureMiddleware(app, middlewareConfig);
      config.middleware.push(middlewareConfig);
      saveConfig(config);
    } catch (error) {
      console.error('Middleware configuration failed:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('config')
  .description('Manage AeroSSR configuration')
  .option('-u, --update <key=value>', 'Update configuration')
  .action((options) => {
    try {
      const config = loadConfig();

      if (options.update) {
        const [key, value] = options.update.split('=');
        if (!key || value === undefined) {
          throw new Error('Invalid key-value format');
        }

        config[key] = isNaN(Number(value)) ? value : Number(value);
        saveConfig(config);
      } else {
        console.log(JSON.stringify(config, null, 2));
      }
    } catch (error) {
      console.error('Configuration failed:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program.parse(process.argv);