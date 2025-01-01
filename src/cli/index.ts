import { Command } from 'commander';
import { initializeSSR, configureMiddleware } from './commands';

const program = new Command();

// Define CLI version and description
program
  .version('1.0.0')
  .description('AeroSSR CLI for managing server-side rendering configurations');

// Command to initialize a new SSR project
program
  .command('init')
  .description('Initialize a new AeroSSR project')
  .option('-d, --directory <path>', 'Specify the directory for the project', '.')
  .action((options) => {
    const directory = options.directory;
    initializeSSR(directory);
    console.log(`Initialized a new AeroSSR project in ${directory}`);
  });

// Command to configure middlewares
program
  .command('middleware')
  .description('Configure middlewares for AeroSSR')
  .option('-n, --name <name>', 'Specify middleware name')
  .option('-p, --path <path>', 'Specify middleware path')
  .action((options) => {
    const { name, path } = options;
    if (!name || !path) {
      console.error('Both middleware name and path are required.');
      return;
    }
    configureMiddleware(name, path);
    console.log(`Middleware ${name} configured at ${path}`);
  });

// Command to view configuration
program
  .command('config')
  .description('View or update AeroSSR configuration')
  .option('-u, --update <key=value>', 'Update a configuration key-value pair')
  .action((options) => {
    if (options.update) {
      const [key, value] = options.update.split('=');
      if (!key || !value) {
        console.error('Invalid key-value pair for configuration update.');
        return;
      }
      // Placeholder for updating the configuration
      console.log(`Configuration updated: ${key} = ${value}`);
    } else {
      // Placeholder for displaying the configuration
      console.log('Displaying current configuration...');
    }
  });

// Parse the CLI arguments
program.parse(process.argv);
