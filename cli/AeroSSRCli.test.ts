import { jest } from '@jest/globals';
import { promises as fs } from 'fs';
import * as path from 'path';
import { Command } from 'commander';
import { AeroSSR } from '../src/';

// Mock dependencies
jest.mock('fs', () => ({
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  promises: {
    mkdir: jest.fn(),
    writeFile: jest.fn()
  }
}));
jest.mock('path');
jest.mock('../src/AeroSSR');
jest.mock('commander');

describe('CLI Commands', () => {
  const mockFs = fs as jest.Mocked<typeof fs>;
  const mockPath = path as jest.Mocked<typeof path>;
  const mockReadFileSync = jest.spyOn(require('fs'), 'readFileSync');
  const mockWriteFileSync = jest.spyOn(require('fs'), 'writeFileSync');

  beforeEach(() => {
    jest.clearAllMocks();
    mockPath.resolve.mockImplementation((...parts) => parts.join('/'));
    mockPath.join.mockImplementation((...parts) => parts.join('/'));
    mockReadFileSync.mockImplementation(() => JSON.stringify({
      port: 3000,
      logPath: 'logs/server.log',
      middleware: []
    }));
  });

  describe('init command', () => {
    it('should initialize a new project with default directory', async () => {
      const directory = '.';
      
      await initializeSSR(directory);

      expect(mockFs.mkdir).toHaveBeenCalledWith(expect.stringContaining('public'), { recursive: true });
      expect(mockFs.mkdir).toHaveBeenCalledWith(expect.stringContaining('logs'), { recursive: true });
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('index.html'),
        expect.stringContaining('<!DOCTYPE html>'),
        'utf-8'
      );
    });

    it('should initialize a new project with custom directory', async () => {
      const directory = './custom-dir';
      
      await initializeSSR(directory);

      expect(mockFs.mkdir).toHaveBeenCalledWith(expect.stringContaining('custom-dir/public'), { recursive: true });
      expect(mockFs.mkdir).toHaveBeenCalledWith(expect.stringContaining('custom-dir/logs'), { recursive: true });
    });

    it('should handle initialization errors gracefully', async () => {
      const directory = '.';
      const error = new Error('Permission denied');
      mockFs.mkdir.mockRejectedValue(error);

      const consoleSpy = jest.spyOn(console, 'error');
      
      await expect(initializeSSR(directory)).rejects.toThrow();
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('middleware command', () => {
    it('should configure middleware with valid options', async () => {
      const app = new AeroSSR();
      const name = 'test-middleware';
      const middlewarePath = './middleware/test.js';

      await configureMiddleware(app, name, middlewarePath);

      expect(app.use).toHaveBeenCalled();
    });

    it('should add static file middleware by default', async () => {
      const app = new AeroSSR();
      
      await configureMiddleware(app);

      expect(app.use).toHaveBeenCalledTimes(3); // Static, logging, and error middleware
    });

    it('should handle middleware configuration errors', async () => {
      const app = new AeroSSR();
      const error = new Error('Invalid middleware');
      jest.spyOn(app, 'use').mockImplementation(() => {
        throw error;
      });

      const consoleSpy = jest.spyOn(console, 'error');
      
      await expect(configureMiddleware(app, 'test', './invalid.js')).rejects.toThrow();
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('config command', () => {
    it('should load default configuration when file does not exist', () => {
      mockReadFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });

      const config = loadConfig();
      
      expect(config).toEqual({
        port: 3000,
        logPath: 'logs/server.log',
        middleware: []
      });
    });

    it('should save configuration changes', () => {
      const config = {
        port: 4000,
        logPath: 'custom/log.txt',
        middleware: [{ name: 'test', path: './test.js' }]
      };

      saveConfig(config);

      expect(mockWriteFileSync).toHaveBeenCalledWith(
        'aerossr.config.json',
        JSON.stringify(config, null, 2),
        'utf-8'
      );
    });

    it('should update specific configuration values', () => {
      const currentConfig = loadConfig();
      const key = 'port';
      const value = '4000';

      const updatedConfig = {
        ...currentConfig,
        [key]: parseInt(value, 10)
      };

      saveConfig(updatedConfig);

      expect(mockWriteFileSync).toHaveBeenCalledWith(
        'aerossr.config.json',
        expect.stringContaining('"port": 4000'),
        'utf-8'
      );
    });
  });

  describe('Integration Tests', () => {
    it('should initialize project and configure middleware', async () => {
      const directory = './test-project';
      
      // Initialize project
      await initializeSSR(directory);
      
      // Create app instance
      const app = new AeroSSR();
      
      // Configure middleware
      await configureMiddleware(app, 'test', './middleware.js');

      // Verify configuration was saved
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        'aerossr.config.json',
        expect.stringContaining('middleware'),
        'utf-8'
      );
    });

    it('should handle the complete project setup flow', async () => {
      // Initialize project
      await initializeSSR('./test-project');

      // Load config
      const config = loadConfig();
      expect(config.port).toBe(3000);

      // Update config
      const updatedConfig = {
        ...config,
        port: 4000
      };
      saveConfig(updatedConfig);

      // Configure middleware
      const app = new AeroSSR();
      await configureMiddleware(app);

      // Verify everything was called correctly
      expect(mockFs.mkdir).toHaveBeenCalled();
      expect(mockWriteFileSync).toHaveBeenCalled();
      expect(app.use).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle file system errors', async () => {
      mockFs.mkdir.mockRejectedValue(new Error('Permission denied'));
      const consoleSpy = jest.spyOn(console, 'error');

      await expect(initializeSSR('.')).rejects.toThrow('Permission denied');
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should handle configuration read errors', () => {
      mockReadFileSync.mockImplementation(() => {
        throw new Error('Read error');
      });

      const config = loadConfig();
      expect(config).toEqual(expect.objectContaining({
        port: 3000
      }));
    });

    it('should handle configuration write errors', () => {
      mockWriteFileSync.mockImplementation(() => {
        throw new Error('Write error');
      });

      const consoleSpy = jest.spyOn(console, 'error');
      
      expect(() => saveConfig({ port: 3000, logPath: '', middleware: [] }))
        .toThrow('Write error');
      expect(consoleSpy).toHaveBeenCalled();
    });
  });
});