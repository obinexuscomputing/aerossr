import { c as commanderExports } from './_virtual/index.js';
import { AeroSSR } from './AeroSSR.js';
import './middlewares/StaticFileMiddleware.js';
import 'fs/promises';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import 'crypto';
import { initializeSSR, configureMiddleware } from './cli/commands.js';

const CONFIG_FILE = 'aerossr.config.json';
function loadConfig() {
    try {
        const config = readFileSync(CONFIG_FILE, 'utf-8');
        return JSON.parse(config);
    }
    catch {
        return {
            port: 3000,
            logPath: 'logs/server.log',
            middleware: []
        };
    }
}
function saveConfig(config) {
    writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
}
const program = new commanderExports.Command();
// Define CLI version and description
program
    .version('1.0.0')
    .description('AeroSSR CLI for managing server-side rendering configurations');
// Command to initialize a new SSR project
program
    .command('init')
    .description('Initialize a new AeroSSR project')
    .option('-d, --directory <path>', 'Specify the directory for the project', '.')
    .action(async (options) => {
    try {
        const directory = options.directory;
        await initializeSSR(directory);
        // Initialize config file
        const config = {
            port: 3000,
            logPath: join(directory, 'logs/server.log'),
            middleware: []
        };
        saveConfig(config);
        console.log(`Initialized a new AeroSSR project in ${directory}`);
    }
    catch (error) {
        console.error('Error initializing project:', error instanceof Error ? error.message : String(error));
        process.exit(1);
    }
});
// Command to configure middlewares
program
    .command('middleware')
    .description('Configure middlewares for AeroSSR')
    .option('-n, --name <name>', 'Specify middleware name')
    .option('-p, --path <path>', 'Specify middleware path')
    .action(async (options) => {
    try {
        const { name, path } = options;
        if (!name || !path) {
            console.error('Both middleware name and path are required.');
            process.exit(1);
        }
        const config = loadConfig();
        // Create AeroSSR instance with loaded config
        const app = new AeroSSR({
            port: config.port,
            logFilePath: config.logPath
        });
        // Configure middleware
        await configureMiddleware(app, name, path);
        // Update config
        config.middleware.push({ name, path });
        saveConfig(config);
    }
    catch (error) {
        console.error('Error configuring middleware:', error instanceof Error ? error.message : String(error));
        process.exit(1);
    }
});
// Command to view/update configuration
program
    .command('config')
    .description('View or update AeroSSR configuration')
    .option('-u, --update <key=value>', 'Update a configuration key-value pair')
    .action((options) => {
    try {
        const config = loadConfig();
        if (options.update) {
            const [key, value] = options.update.split('=');
            if (!key || value === undefined) {
                console.error('Invalid key-value pair for configuration update.');
                process.exit(1);
            }
            // Convert value to number if possible
            const numValue = Number(value);
            config[key] = isNaN(numValue) ? value : numValue;
            saveConfig(config);
            console.log(`Configuration updated: ${key} = ${value}`);
        }
        else {
            console.log('Current configuration:');
            console.log(JSON.stringify(config, null, 2));
        }
    }
    catch (error) {
        console.error('Error managing configuration:', error instanceof Error ? error.message : String(error));
        process.exit(1);
    }
});
// Add help command
program
    .command('help')
    .description('Display help information')
    .action(() => {
    program.outputHelp();
});
// Parse the CLI arguments
program.parse(process.argv);
//# sourceMappingURL=cli.js.map
