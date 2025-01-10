// __tests__/integration/cli/cli.node.test.ts
import { jest } from '@jest/globals';
import { promises as fs } from 'fs';
import path from 'path';
import { AeroConfig } from '@/cli';
import { setupCLITest, teardownCLITest, TestContext } from '../../unit/cli/setupCLI';

jest.mock('@/cli/commands', () => ({
  aeroCommands: {
    initializeProject: jest.fn(),
    configureMiddleware: jest.fn(),
    cleanup: jest.fn()
  }
}));

jest.mock('@/core/AeroSSR', () => ({
  AeroSSR: jest.fn().mockImplementation(() => ({
    use: jest.fn()
  }))
}));

describe('AeroSSR CLI Integration', () => {
  let context: TestContext;

  beforeEach(async () => {
    context = await setupCLITest();
  });

  afterEach(async () => {
    await teardownCLITest(context);
  });

  describe('Project Initialization', () => {
    it('should create complete project structure', async () => {
      await context.cli.run(['node', 'aerossr', 'init']);

      // Verify directory structure
      const dirs = ['public', 'logs', 'config', 'public/styles', 'public/dist'];
      for (const dir of dirs) {
        const exists = await fs.access(path.join(context.tempDir, dir))
          .then(() => true)
          .catch(() => false);
        expect(exists).toBe(true);
      }

      // Verify config and other files
      const configExists = await fs.access(path.join(context.tempDir, 'aerossr.config.json'))
        .then(() => true)
        .catch(() => false);
      expect(configExists).toBe(true);
    });
  });

  describe('Configuration Management', () => {
    beforeEach(async () => {
      await context.cli.run(['node', 'aerossr', 'init']);
    });

    it('should manage configuration through CLI commands', async () => {
      // Update config
      await context.cli.run(['node', 'aerossr', 'config', '-u', 'port=4000']);
      
      let config = JSON.parse(
        await fs.readFile(path.join(context.tempDir, 'aerossr.config.json'), 'utf-8')
      );
      expect(config.port).toBe(4000);

      // List config
      await context.cli.run(['node', 'aerossr', 'config', '-l']);
      expect(context.mockLogger.log).toHaveBeenCalledWith('Current configuration:');

      // Reset config
      await context.cli.run(['node', 'aerossr', 'config', '-r']);
      config = JSON.parse(
        await fs.readFile(path.join(context.tempDir, 'aerossr.config.json'), 'utf-8')
      );
      expect(config.port).toBe(3000);
    });
  });

  describe('Middleware Configuration', () => {
    beforeEach(async () => {
      await context.cli.run(['node', 'aerossr', 'init']);
    });

    it('should configure and validate middleware', async () => {
      await context.cli.run([
        'node', 'aerossr', 'middleware',
        '-n', 'test-middleware',
        '-p', './middleware/test.js',
        '-o', '{"compress":true}'
      ]);

      const config = JSON.parse(
        await fs.readFile(path.join(context.tempDir, 'aerossr.config.json'), 'utf-8')
      );
      
      expect(config.middleware).toHaveLength(1);
      expect(config.middleware[0]).toEqual({
        name: 'test-middleware',
        path: expect.stringContaining('middleware/test.js'),
        options: { compress: true }
      });
    });
  });

  describe('End-to-End Workflows', () => {
    it('should handle complete project setup', async () => {
      // Initialize with custom settings
      await context.cli.run([
        'node', 'aerossr', 'init',
        '-d', './test-project',
        '-p', '5000'
      ]);

      // Add middleware
      await context.cli.run([
        'node', 'aerossr', 'middleware',
        '-n', 'test-middleware',
        '-p', './middleware/test.js',
        '-o', '{"compress":true}'
      ]);

      // Update configuration
      await context.cli.run(['node', 'aerossr', 'config', '-u', 'logLevel=debug']);

      // Verify final state
      const config = JSON.parse(
        await fs.readFile(
          path.join(context.tempDir, 'test-project', 'aerossr.config.json'),
          'utf-8'
        )
      );

      expect(config).toEqual({
        port: 5000,
        logPath: expect.stringContaining('logs/server.log'),
        logLevel: 'debug',
        middleware: [{
          name: 'test-middleware',
          path: expect.stringContaining('middleware/test.js'),
          options: { compress: true }
        }]
      });
    });
  });
});