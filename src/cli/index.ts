import { Command } from 'commander';
import { existsSync } from 'fs';
import { promises as fs } from 'fs';
import { join, resolve } from 'path';
import { Logger } from '../../src/utils/';
import AeroSSR from '@/core/AeroSSR';
import { MiddlewareConfig, aeroCommands } from './commands/commands';

export interface AeroConfig {
  port: number;
  logPath: string;
  middleware: MiddlewareConfig[];
  [key: string]: unknown;
}

export class AeroSSRCLI {
  private static readonly CONFIG_FILE = 'aerossr.config.json';
  private static readonly DEFAULT_CONFIG: AeroConfig = {
    port: 3000,
    logPath: 'logs/server.log',
    middleware: []
  };

  private readonly program: Command;
  private readonly logger: Logger;

  constructor(logger?: Logger) {
    this.program = new Command();
    this.logger = logger || new Logger();
    this.setupProgram();
  }

  /**
   * Find configuration file in directory hierarchy
   */
  private async findConfigFile(startDir: string): Promise<string | null> {
    let currentDir = startDir;
    while (currentDir !== resolve(currentDir, '..')) {
      const configPath = join(currentDir, AeroSSRCLI.CONFIG_FILE);
      if (existsSync(configPath)) {
        return configPath;
      }
      currentDir = resolve(currentDir, '..');
    }
    return null;
  }

  /**
   * Load configuration from file or return defaults
   */
  private async loadConfig(): Promise<AeroConfig> {
    try {
      const configPath = await this.findConfigFile(process.cwd());
      if (configPath) {
        const content = await fs.readFile(configPath, 'utf-8');
        const config = JSON.parse(content);
        return {
          ...AeroSSRCLI.DEFAULT_CONFIG,
          ...config
        };
      }
    } catch (error) {
      this.logger.log(`Warning: Could not load config file: ${error instanceof Error ? error.message : String(error)}`);
    }
    return { ...AeroSSRCLI.DEFAULT_CONFIG };
  }

  /**
   * Save configuration to file
   */
  private async saveConfig(config: AeroConfig): Promise<void> {
    try {
      const configDir = process.cwd();
      await fs.mkdir(configDir, { recursive: true });
      const formattedConfig = JSON.stringify(config, null, 2);
      await fs.writeFile(AeroSSRCLI.CONFIG_FILE, formattedConfig, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to save config: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Setup CLI program and commands
   */
  private setupProgram(): void {
    this.program
      .name('aerossr')
      .version('0.1.1')
      .description('AeroSSR CLI for managing server-side rendering configurations');

    // Init command
    this.program
      .command('init')
      .description('Initialize a new AeroSSR project')
      .option('-d, --directory <path>', 'Project directory path', '.')
      .option('-p, --port <number>', 'Server port number', '3000')
      .action(async (options) => {
        try {
          const directory = resolve(options.directory);
          await aeroCommands.initializeProject(directory);
          
          const config: AeroConfig = {
            ...AeroSSRCLI.DEFAULT_CONFIG,
            port: parseInt(options.port, 10),
            logPath: join(directory, 'logs/server.log')
          };
          
          await this.saveConfig(config);
          this.logger.log('Successfully initialized AeroSSR project');
        } catch (error) {
          this.logger.log(`Initialization failed: ${error instanceof Error ? error.message : String(error)}`);
          process.exit(1);
        }
      });

    // Middleware command
    this.program
      .command('middleware')
      .description('Configure AeroSSR middleware')
      .requiredOption('-n, --name <name>', 'Middleware name')
      .requiredOption('-p, --path <path>', 'Middleware path')
      .option('-o, --options <json>', 'Middleware options as JSON')
      .action(async (options) => {
        try {
          const config = await this.loadConfig();
          const app = new AeroSSR({
            port: config.port,
            logFilePath: config.logPath,
            projectPath: process.cwd()
          });

          const middlewareConfig: MiddlewareConfig = {
            name: options.name,
            path: resolve(options.path),
            options: options.options ? JSON.parse(options.options) : undefined
          };

          await aeroCommands.configureMiddleware(app, middlewareConfig);
          config.middleware.push(middlewareConfig);
          await this.saveConfig(config);
          this.logger.log(`Successfully configured middleware: ${options.name}`);
        } catch (error) {
          this.logger.log(`Middleware configuration failed: ${error instanceof Error ? error.message : String(error)}`);
          process.exit(1);
        }
      });

    // Config command
    this.program
      .command('config')
      .description('Manage AeroSSR configuration')
      .option('-u, --update <key=value>', 'Update configuration')
      .option('-l, --list', 'List current configuration')
      .option('-r, --reset', 'Reset configuration to defaults')
      .action(async (options) => {
        try {
          let config = await this.loadConfig();

          if (options.reset) {
            config = { ...AeroSSRCLI.DEFAULT_CONFIG };
            await this.saveConfig(config);
            this.logger.log('Configuration reset to defaults');
          }
          else if (options.update) {
            const [key, value] = options.update.split('=');
            if (!key || value === undefined) {
              throw new Error('Invalid key-value format');
            }

            config[key] = isNaN(Number(value)) ? value : Number(value);
            await this.saveConfig(config);
            this.logger.log(`Updated configuration: ${key}=${value}`);
          }
          else if (options.list) {
            this.logger.log('Current configuration:');
            this.logger.log(JSON.stringify(config, null, 2));
          }
        } catch (error) {
          this.logger.log(`Configuration failed: ${error instanceof Error ? error.message : String(error)}`);
          process.exit(1);
        }
      });
  }

  /**
   * Parse command line arguments and execute
   */
  public async run(args: string[] = process.argv): Promise<void> {
    try {
      await this.program.parseAsync(args);
    } catch (error) {
      this.logger.log(`CLI execution failed: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    } finally {
      await aeroCommands.cleanup();
    }
  }
}

// Create and export CLI instance
export const cli = new AeroSSRCLI();

// Add default export for direct usage
export default async function runCLI(): Promise<void> {
  await cli.run();
}