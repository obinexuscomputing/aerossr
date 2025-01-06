// src/cli/index.ts
import { Command } from 'commander';
import { AeroSSR } from '../';
import { initializeSSR, configureMiddleware, MiddlewareConfig } from './commands';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { promises as fs } from 'fs';
import { join, resolve } from 'path';

interface AeroConfig {
  port: number;
  logPath: string;
  middleware: MiddlewareConfig[];
  [key: string]: unknown;
}

const CONFIG_FILE = 'aerossr.config.json';

/**
 * Load configuration from file or return defaults
 */
async function loadConfig(): Promise<AeroConfig> {
  try {
    // First try to find config in current directory
    if (existsSync(CONFIG_FILE)) {
      const config = JSON.parse(readFileSync(CONFIG_FILE, 'utf-8'));
      return {
        port: config.port ?? 3000,
        logPath: config.logPath ?? 'logs/server.log',
        middleware: config.middleware ?? [],
        ...config
      };
    }

    // If not found, look for it in parent directories
    let currentDir = process.cwd();
    while (currentDir !== resolve(currentDir, '..')) {
      const configPath = join(currentDir, CONFIG_FILE);
      if (existsSync(configPath)) {
        const config = JSON.parse(readFileSync(configPath, 'utf-8'));
        return {
          port: config.port ?? 3000,
          logPath: config.logPath ?? 'logs/server.log',
          middleware: config.middleware ?? [],
          ...config
        };
      }
      currentDir = resolve(currentDir, '..');
    }

    // If no config found, return defaults
    return {
      port: 3000,
      logPath: 'logs/server.log',
      middleware: []
    };
  } catch (error) {
    console.warn(`Warning: Could not load config file: ${error instanceof Error ? error.message : String(error)}`);
    return {
      port: 3000,
      logPath: 'logs/server.log',
      middleware: []
    };
  }
}

/**
 * Save configuration to file
 */
async function saveConfig(config: AeroConfig): Promise<void> {
  try {
    // Ensure config directory exists
    const configDir = process.cwd();
    await fs.mkdir(configDir, { recursive: true });
    
    // Format config for better readability
    const formattedConfig = JSON.stringify(config, null, 2);
    await fs.writeFile(CONFIG_FILE, formattedConfig, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to save config: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Initialize CLI program
const program = new Command();

program
  .name('aerossr')
  .version('0.1.1')
  .description('AeroSSR CLI for managing server-side rendering configurations');

// Init command
program
  .command('init')
  .description('Initialize a new AeroSSR project')
  .option('-d, --directory <path>', 'Project directory path', '.')
  .option('-p, --port <number>', 'Server port number', '3000')
  .action(async (options) => {
    try {
      const directory = resolve(options.directory);
      await initializeSSR(directory);
      
      const config: AeroConfig = {
        port: parseInt(options.port, 10),
        logPath: join(directory, 'logs/server.log'),
        middleware: []
      };
      
      await saveConfig(config);
      console.log('Successfully initialized AeroSSR project');
    } catch (error) {
      console.error('Initialization failed:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// Middleware command
program
  .command('middleware')
  .description('Configure AeroSSR middleware')
  .requiredOption('-n, --name <name>', 'Middleware name')
  .requiredOption('-p, --path <path>', 'Middleware path')
  .option('-o, --options <json>', 'Middleware options as JSON')
  .action(async (options) => {
    try {
      const config = await loadConfig();
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
      await saveConfig(config);
      console.log(`Successfully configured middleware: ${options.name}`);
    } catch (error) {
      console.error('Middleware configuration failed:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// Config command
program
  .command('config')
  .description('Manage AeroSSR configuration')
  .option('-u, --update <key=value>', 'Update configuration')
  .option('-l, --list', 'List current configuration')
  .option('-r, --reset', 'Reset configuration to defaults')
  .action(async (options) => {
    try {
      let config = await loadConfig();

      if (options.reset) {
        config = {
          port: 3000,
          logPath: 'logs/server.log',
          middleware: []
        };
        await saveConfig(config);
        console.log('Configuration reset to defaults');
      }
      else if (options.update) {
        const [key, value] = options.update.split('=');
        if (!key || value === undefined) {
          throw new Error('Invalid key-value format');
        }

        config[key] = isNaN(Number(value)) ? value : Number(value);
        await saveConfig(config);
        console.log(`Updated configuration: ${key}=${value}`);
      }
      else if (options.list) {
        console.log('Current configuration:');
        console.log(JSON.stringify(config, null, 2));
      }
    } catch (error) {
      console.error('Configuration failed:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse(process.argv);