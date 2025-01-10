// __tests__/cli/index.test.ts
import { jest } from '@jest/globals';
import { promises as fs } from 'fs';
import path from 'path';
import { Command } from 'commander';
import { AeroSSRCLI, cli, AeroConfig } from '.';
import { Logger } from '../../src/utils/logger';
import { aeroCommands } from './commands';
import { AeroSSR } from '../../src';

// Mock dependencies
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    mkdir: jest.fn()
  }
}));

jest.mock('path', () => ({
  resolve: jest.fn((...args) => args.join('/')),
  join: jest.fn((...args) => args.join('/')),
  dirname: jest.fn(path => path.split('/').slice(0, -1).join('/')),
  parse: jest.fn(() => ({ root: '/' }))
}));

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
  let cliInstance: AeroSSRCLI;
  const mockFs = fs as jest.Mocked<typeof fs>;
  const mockExistsSync = jest.mocked(require('fs').existsSync);

  beforeEach(() => {
    mockLogger = {
      log: jest.fn(),
      clear: jest.fn(),
      logRequest: jest.fn()
    } as any;

    cliInstance = new AeroSSRCLI(mockLogger);
    jest.clearAllMocks();
    
    // Reset process.exit mock
    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    mockExit.mockClear();
  });

  describe('Configuration Management', () => {
    const defaultConfig: AeroConfig = {
      port: 3000,
      logPath: 'logs/server.log',
      middleware: []
    };

    it('should load default config when no file exists', async () => {
      mockExistsSync.mockReturnValue(false);
      const config = await cliInstance['loadConfig']();
      
      expect(config).toEqual(defaultConfig);
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Warning: Could not load config file')
      );
    });

    it('should load config from file when it exists', async () => {
      mockExistsSync.mockReturnValue(true);
      mockFs.readFile.mockResolvedValue(JSON.stringify({ 
        port: 4000, 
        customSetting: 'test' 
      }));

      const config = await cliInstance['loadConfig']();
      
      expect(config.port).toBe(4000);
      expect(config.customSetting).toBe('test');
      expect(config.middleware).toEqual([]);
      expect(config.logPath).toBe('logs/server.log');
    });

    it('should handle invalid JSON in config file', async () => {
      mockExistsSync.mockReturnValue(true);
      mockFs.readFile.mockResolvedValue('invalid json');

      const config = await cliInstance['loadConfig']();
      
      expect(config).toEqual(defaultConfig);
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Warning: Could not load config file')
      );
    });

    it('should save config to file', async () => {
      await cliInstance['saveConfig'](defaultConfig);
      
      expect(mockFs.mkdir).toHaveBeenCalledWith(
        process.cwd(),
        { recursive: true }
      );
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        'aerossr.config.json',
        JSON.stringify(defaultConfig, null, 2),
        'utf-8'
      );
    });

    it('should handle save errors', async () => {
      mockFs.writeFile.mockRejectedValue(new Error('Write failed'));

      await expect(cliInstance['saveConfig'](defaultConfig))
        .rejects.toThrow('Failed to save config');
    });

    it('should find config file in parent directories', async () => {
      mockExistsSync
        .mockReturnValueOnce(false)  // Current directory
        .mockReturnValueOnce(false)  // Parent directory
        .mockReturnValueOnce(true);  // Grandparent directory

      const configPath = await cliInstance['findConfigFile'](process.cwd());
      expect(configPath).toBeTruthy();
    });
  });

  describe('Command Execution', () => {
    describe('Init Command', () => {
      it('should initialize project with default options', async () => {
        const args = ['node', 'aerossr', 'init'];
        await cliInstance.run(args);

        expect(aeroCommands.initializeProject).toHaveBeenCalledWith('.');
        expect(mockFs.writeFile).toHaveBeenCalledWith(
          expect.any(String),
          expect.stringContaining('"port":3000'),
          'utf-8'
        );
      });

      it('should initialize project with custom directory and port', async () => {
        const args = ['node', 'aerossr', 'init', '-d', './test-dir', '-p', '4000'];
        await cliInstance.run(args);

        expect(aeroCommands.initializeProject).toHaveBeenCalledWith('test-dir');
        expect(mockFs.writeFile).toHaveBeenCalledWith(
          expect.any(String),
          expect.stringContaining('"port":4000'),
          'utf-8'
        );
      });

      it('should handle initialization errors', async () => {
        const error = new Error('Init failed');
        (aeroCommands.initializeProject as jest.Mock).mockRejectedValue(error);

        const args = ['node', 'aerossr', 'init'];
        await cliInstance.run(args);

        expect(mockLogger.log).toHaveBeenCalledWith(
          expect.stringContaining('Init failed')
        );
        expect(process.exit).toHaveBeenCalledWith(1);
      });
    });

    describe('Middleware Command', () => {
      beforeEach(() => {
        mockExistsSync.mockReturnValue(true);
        mockFs.readFile.mockResolvedValue(JSON.stringify({}));
      });

      it('should configure middleware with required options', async () => {
        const args = [
          'node', 'aerossr', 'middleware',
          '-n', 'testMiddleware',
          '-p', './middleware.js'
        ];
        await cliInstance.run(args);

        expect(aeroCommands.configureMiddleware).toHaveBeenCalledWith(
          expect.any(AeroSSR),
          {
            name: 'testMiddleware',
            path: 'middleware.js'
          }
        );
      });

      it('should configure middleware with JSON options', async () => {
        const args = [
          'node', 'aerossr', 'middleware',
          '-n', 'testMiddleware',
          '-p', './middleware.js',
          '-o', '{"key":"value"}'
        ];
        await cliInstance.run(args);

        expect(aeroCommands.configureMiddleware).toHaveBeenCalledWith(
          expect.any(AeroSSR),
          {
            name: 'testMiddleware',
            path: 'middleware.js',
            options: { key: 'value' }
          }
        );
      });

      it('should handle middleware configuration errors', async () => {
        (aeroCommands.configureMiddleware as jest.Mock).mockRejectedValue(new Error('Config failed'));

        const args = [
          'node', 'aerossr', 'middleware',
          '-n', 'testMiddleware',
          '-p', './middleware.js'
        ];
        await cliInstance.run(args);

        expect(mockLogger.log).toHaveBeenCalledWith(
          expect.stringContaining('Config failed')
        );
        expect(process.exit).toHaveBeenCalledWith(1);
      });

      it('should handle invalid JSON options', async () => {
        const args = [
          'node', 'aerossr', 'middleware',
          '-n', 'testMiddleware',
          '-p', './middleware.js',
          '-o', 'invalid json'
        ];
        await cliInstance.run(args);

        expect(mockLogger.log).toHaveBeenCalledWith(
          expect.stringContaining('Middleware configuration failed')
        );
        expect(process.exit).toHaveBeenCalledWith(1);
      });
    });

    describe('Config Command', () => {
      beforeEach(() => {
        mockExistsSync.mockReturnValue(true);
        mockFs.readFile.mockResolvedValue(JSON.stringify({}));
      });

      it('should list current configuration', async () => {
        const args = ['node', 'aerossr', 'config', '-l'];
        await cliInstance.run(args);

        expect(mockLogger.log).toHaveBeenCalledWith('Current configuration:');
        expect(mockLogger.log).toHaveBeenCalledWith(expect.any(String));
      });

      it('should update configuration value', async () => {
        const args = ['node', 'aerossr', 'config', '-u', 'port=4000'];
        await cliInstance.run(args);

        expect(mockFs.writeFile).toHaveBeenCalledWith(
          expect.any(String),
          expect.stringContaining('"port":4000'),
          'utf-8'
        );
        expect(mockLogger.log).toHaveBeenCalledWith(
          expect.stringContaining('Updated configuration: port=4000')
        );
      });

      it('should handle invalid update format', async () => {
        const args = ['node', 'aerossr', 'config', '-u', 'invalid'];
        await cliInstance.run(args);

        expect(mockLogger.log).toHaveBeenCalledWith(
          expect.stringContaining('Invalid key-value format')
        );
        expect(process.exit).toHaveBeenCalledWith(1);
      });

      it('should reset configuration to defaults', async () => {
        const args = ['node', 'aerossr', 'config', '-r'];
        await cliInstance.run(args);

        expect(mockFs.writeFile).toHaveBeenCalledWith(
          expect.any(String),
          expect.stringContaining('"port":3000'),
          'utf-8'
        );
        expect(mockLogger.log).toHaveBeenCalledWith(
          'Configuration reset to defaults'
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle unknown commands', async () => {
      const args = ['node', 'aerossr', 'unknown'];
      await cliInstance.run(args);

      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should handle missing required options', async () => {
      const args = ['node', 'aerossr', 'middleware'];
      await cliInstance.run(args);

      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should cleanup on successful execution', async () => {
      const args = ['node', 'aerossr', 'init'];
      await cliInstance.run(args);

      expect(aeroCommands.cleanup).toHaveBeenCalled();
    });

    it('should cleanup on error', async () => {
      (aeroCommands.initializeProject as jest.Mock).mockRejectedValue(new Error());
      
      const args = ['node', 'aerossr', 'init'];
      await cliInstance.run(args);

      expect(aeroCommands.cleanup).toHaveBeenCalled();
    });
  });

  describe('Integration Tests', () => {
    beforeEach(() => {
      mockExistsSync.mockReturnValue(true);
      mockFs.readFile.mockResolvedValue(JSON.stringify({}));
    });

    it('should handle complete project setup workflow', async () => {
      // Initialize project
      await cliInstance.run(['node', 'aerossr', 'init', '-d', './test-project']);
      
      // Configure middleware
      await cliInstance.run([
        'node', 'aerossr', 'middleware',
        '-n', 'testMiddleware',
        '-p', './middleware.js'
      ]);
      
      // Update configuration
      await cliInstance.run(['node', 'aerossr', 'config', '-u', 'port=4000']);

      expect(aeroCommands.initializeProject).toHaveBeenCalled();
      expect(aeroCommands.configureMiddleware).toHaveBeenCalled();
      expect(mockFs.writeFile).toHaveBeenCalledTimes(3);
      expect(aeroCommands.cleanup).toHaveBeenCalledTimes(3);
    });

    it('should handle project setup with custom options', async () => {
      // Initialize with custom options
      await cliInstance.run([
        'node', 'aerossr', 'init',
        '-d', './custom-project',
        '-p', '5000'
      ]);
      
      // Add middleware with options
      await cliInstance.run([
        'node', 'aerossr', 'middleware',
        '-n', 'customMiddleware',
        '-p', './middleware.js',
        '-o', '{"compress":true}'
      ]);
      
      // Update multiple config values
      await cliInstance.run(['node', 'aerossr', 'config', '-u', 'logLevel=debug']);
      await cliInstance.run(['node', 'aerossr', 'config', '-u', 'maxConnections=100']);

      expect(aeroCommands.initializeProject).toHaveBeenCalledWith('custom-project');
      expect(aeroCommands.configureMiddleware).toHaveBeenCalledWith(
        expect.any(AeroSSR),
        expect.objectContaining({
          options: { compress: true }
        })
      );
      expect(mockFs.writeFile).toHaveBeenCalledTimes(4);
    });
  });
});