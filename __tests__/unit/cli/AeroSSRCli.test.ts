import { AeroSSRCLI, AeroConfig } from '@/cli';
import { aeroCommands } from '@/cli/commands/commands';
import { Logger } from '@/utils';
import { jest } from '@jest/globals';
import { promises as fs } from 'fs';
import path from 'path';

jest.mock('../../src/cli/commands', () => ({
  aeroCommands: {
    initializeProject: jest.fn(),
    configureMiddleware: jest.fn(),
    cleanup: jest.fn()
  }
}));

jest.mock('../../src', () => ({
  AeroSSR: jest.fn().mockImplementation(() => ({
    use: jest.fn()
  }))
}));

describe('AeroSSRCLI', () => {
  let mockLogger: jest.Mocked<Logger>;
  let cli: AeroSSRCLI;
  let tempDir: string;
  let originalCwd: string;

  beforeAll(() => {
    originalCwd = process.cwd();
  });

  beforeEach(async () => {
    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      clear: jest.fn(),
      logRequest: jest.fn()
    } as unknown as jest.Mocked<Logger>;

    // Create temporary test directory
    tempDir = path.join(process.cwd(), 'test-' + Math.random().toString(36).substring(7));
    await fs.mkdir(tempDir, { recursive: true });
    process.chdir(tempDir);

    cli = new AeroSSRCLI(mockLogger);
    
    // Reset all mocks
    jest.clearAllMocks();
    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    mockExit.mockClear();
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  });

  describe('Configuration Management', () => {
    const defaultConfig: AeroConfig = {
      port: 3000,
      logPath: 'logs/server.log',
      middleware: []
    };

    beforeEach(async () => {
      await fs.writeFile(
        path.join(tempDir, 'aerossr.config.json'),
        JSON.stringify(defaultConfig)
      );
    });

    it('should load default config when no file exists', async () => {
      // Delete config file for this test
      await fs.unlink(path.join(tempDir, 'aerossr.config.json'));
      
      const config = await cli['loadConfig']();
      expect(config).toEqual(defaultConfig);
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Warning: Could not load config file')
      );
    });

    it('should load config from file when it exists', async () => {
      const customConfig = {
        port: 4000,
        logPath: 'custom/logs',
        middleware: [],
        customSetting: 'test'
      };

      await fs.writeFile(
        path.join(tempDir, 'aerossr.config.json'),
        JSON.stringify(customConfig)
      );

      const config = await cli['loadConfig']();
      expect(config.port).toBe(4000);
      expect(config.customSetting).toBe('test');
    });

    it('should handle invalid JSON in config file', async () => {
      await fs.writeFile(
        path.join(tempDir, 'aerossr.config.json'),
        'invalid json'
      );

      const config = await cli['loadConfig']();
      expect(config).toEqual(defaultConfig);
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Warning: Could not load config file')
      );
    });

    it('should save config to file', async () => {
      const testConfig = { ...defaultConfig, port: 5000 };
      await cli['saveConfig'](testConfig);

      const saved = JSON.parse(
        await fs.readFile(path.join(tempDir, 'aerossr.config.json'), 'utf-8')
      );
      expect(saved).toEqual(testConfig);
    });
  });

  describe('Command Execution', () => {
    describe('Init Command', () => {
      it('should initialize project with default options', async () => {
        const args = ['node', 'aerossr', 'init'];
        await cli.run(args);

        // Verify directory structure
        const dirs = ['public', 'logs', 'config', 'public/styles', 'public/dist'];
        for (const dir of dirs) {
          const exists = await fs.access(path.join(tempDir, dir))
            .then(() => true)
            .catch(() => false);
          expect(exists).toBe(true);
        }

        // Verify config
        const configContent = await fs.readFile(
          path.join(tempDir, 'aerossr.config.json'),
          'utf-8'
        );
        const config = JSON.parse(configContent);
        expect(config.port).toBe(3000);
      });

      it('should initialize project with custom options', async () => {
        const args = ['node', 'aerossr', 'init', '-d', './test-proj', '-p', '4000'];
        await cli.run(args);

        const config = JSON.parse(
          await fs.readFile(
            path.join(tempDir, 'test-proj', 'aerossr.config.json'),
            'utf-8'
          )
        );
        expect(config.port).toBe(4000);
      });

      it('should handle initialization errors', async () => {
        const error = new Error('Init failed');
        (aeroCommands.initializeProject as jest.Mock).mockRejectedValue(error as never);

        const args = ['node', 'aerossr', 'init'];
        await cli.run(args);

        expect(mockLogger.log).toHaveBeenCalledWith(
          expect.stringContaining('Init failed')
        );
        expect(process.exit).toHaveBeenCalledWith(1);
      });
    });

    describe('Middleware Command', () => {
      beforeEach(async () => {
        await cli.run(['node', 'aerossr', 'init']);
      });

      it('should configure middleware with required options', async () => {
        const args = [
          'node', 'aerossr', 'middleware',
          '-n', 'test-middleware',
          '-p', './middleware/test.js'
        ];
        await cli.run(args);

        const config = JSON.parse(
          await fs.readFile(
            path.join(tempDir, 'aerossr.config.json'),
            'utf-8'
          )
        );
        expect(config.middleware).toHaveLength(1);
        expect(config.middleware[0].name).toBe('test-middleware');
      });

      it('should configure middleware with custom options', async () => {
        const args = [
          'node', 'aerossr', 'middleware',
          '-n', 'test-middleware',
          '-p', './middleware/test.js',
          '-o', '{"key":"value"}'
        ];
        await cli.run(args);

        const config = JSON.parse(
          await fs.readFile(
            path.join(tempDir, 'aerossr.config.json'),
            'utf-8'
          )
        );
        expect(config.middleware[0].options).toEqual({ key: 'value' });
      });

      it('should handle invalid JSON options', async () => {
        const args = [
          'node', 'aerossr', 'middleware',
          '-n', 'test-middleware',
          '-p', './middleware/test.js',
          '-o', 'invalid json'
        ];
        await cli.run(args);

        expect(mockLogger.log).toHaveBeenCalledWith(
          expect.stringContaining('Middleware configuration failed')
        );
        expect(process.exit).toHaveBeenCalledWith(1);
      });
    });

    describe('Config Command', () => {
      beforeEach(async () => {
        await cli.run(['node', 'aerossr', 'init']);
      });

      it('should list current configuration', async () => {
        const args = ['node', 'aerossr', 'config', '-l'];
        await cli.run(args);

        expect(mockLogger.log).toHaveBeenCalledWith('Current configuration:');
      });

      it('should update configuration value', async () => {
        const args = ['node', 'aerossr', 'config', '-u', 'port=4000'];
        await cli.run(args);

        const config = JSON.parse(
          await fs.readFile(
            path.join(tempDir, 'aerossr.config.json'),
            'utf-8'
          )
        );
        expect(config.port).toBe(4000);
      });

      it('should reset configuration to defaults', async () => {
        // First modify config
        await cli.run(['node', 'aerossr', 'config', '-u', 'port=5000']);
        
        // Then reset
        const args = ['node', 'aerossr', 'config', '-r'];
        await cli.run(args);

        const config = JSON.parse(
          await fs.readFile(
            path.join(tempDir, 'aerossr.config.json'),
            'utf-8'
          )
        );
        expect(config.port).toBe(3000);
      });
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete project workflow', async () => {
      // Initialize project
      await cli.run([
        'node', 'aerossr', 'init',
        '-d', './test-project',
        '-p', '5000'
      ]);

      // Add middleware
      await cli.run([
        'node', 'aerossr', 'middleware',
        '-n', 'test-middleware',
        '-p', './middleware/test.js',
        '-o', '{"compress":true}'
      ]);

      // Update config
      await cli.run(['node', 'aerossr', 'config', '-u', 'logLevel=debug']);

      // Verify final state
      const config = JSON.parse(
        await fs.readFile(
          path.join(tempDir, 'test-project', 'aerossr.config.json'),
          'utf-8'
        )
      );

      expect(config.port).toBe(5000);
      expect(config.logLevel).toBe('debug');
      expect(config.middleware).toHaveLength(1);
      expect(config.middleware[0].options).toEqual({ compress: true });
    });
  });
});