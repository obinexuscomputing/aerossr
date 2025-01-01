import { generateBundle, resolveDependencies, minifyBundle } from '../../src/utils/bundler';
import fs from 'fs/promises';
import path from 'path';

jest.mock('fs/promises');
jest.mock('path');

describe('Bundler', () => {
  const mockFs = fs as jest.Mocked<typeof fs>;
  const mockPath = path as jest.Mocked<typeof path>;
  
  const mockProjectPath = '/test/project';
  const mockIndexPath = '/test/project/index.js';
  const mockDependencyPath = '/test/project/dependency.js';
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockPath.resolve.mockImplementation((dir, file) => {
      if (typeof file === 'string' && file.includes('dependency')) return mockDependencyPath;
      return mockIndexPath;
    });
    
    mockPath.dirname.mockReturnValue(mockProjectPath);
    
    mockPath.join.mockImplementation((...args) => {
      const file = args[args.length - 1];
      if (file === 'index.js') return mockIndexPath;
      if (file === 'dependency.js') return mockDependencyPath;
      return args.join('/');
    });
    
    mockPath.relative.mockImplementation((from, to) => {
      if (to === mockDependencyPath) return 'dependency.js';
      if (to === mockIndexPath) return 'index.js';
      return String(to);
    });

    mockFs.readFile.mockImplementation(async (filePath) => {
      const path = String(filePath);
      if (path === mockIndexPath) {
        return `const dep = require('./dependency');\nconsole.log(dep);`;
      }
      if (path === mockDependencyPath) {
        return `module.exports = 'Hello from dependency';`;
      }
      throw new Error('File not found');
    });

    mockFs.access.mockImplementation(async (filePath) => {
      const path = String(filePath);
      if (path === mockIndexPath || path === mockDependencyPath) {
        return Promise.resolve();
      }
      return Promise.reject(new Error('File not found'));
    });
  });

  describe('resolveDependencies', () => {
    it('should resolve direct dependencies', async () => {
      const dependencies = await resolveDependencies(mockIndexPath);
      expect(Array.from(dependencies)).toEqual(
        expect.arrayContaining([mockIndexPath, mockDependencyPath])
      );
      expect(dependencies.size).toBe(2);
    });

    it('should handle circular dependencies', async () => {
      mockFs.readFile.mockImplementation(async (filePath) => {
        const path = String(filePath);
        if (path === mockIndexPath) {
          return `require('./circular')`;
        }
        if (path.includes('circular')) {
          return `require('./index')`;
        }
        throw new Error('File not found');
      });

      const dependencies = await resolveDependencies(mockIndexPath);
      expect(dependencies.size).toBe(2);
    });

    it('should handle invalid imports gracefully', async () => {
      mockFs.readFile.mockResolvedValue(`import { something } from "invalid"`);
      const dependencies = await resolveDependencies(mockIndexPath);
      expect(dependencies.size).toBe(1);
    });
  });

  describe('minifyBundle', () => {
    it('should remove comments and whitespace', () => {
      const code = `
        // Single line comment
        function test() {
          /* Multi-line
             comment */
          return true;
        }
      `;
      const minified = minifyBundle(code);
      expect(minified).toBe('function test() { return true; }');
    });

    it('should preserve string contents', () => {
      const code = 'const str = "  preserved  spaces  ";';
      const minified = minifyBundle(code);
      expect(minified).toBe('const str = "  preserved  spaces  ";');
    });

    it('should handle empty input', () => {
      expect(minifyBundle('')).toBe('');
    });
  });

  describe('generateBundle', () => {
    it('should generate bundle with dependencies', async () => {
      const bundle = await generateBundle(mockProjectPath, 'index.js');
      expect(bundle).toContain('Hello from dependency');
      expect(bundle).toContain('console.log');
    });

    it('should handle missing dependencies', async () => {
      mockFs.readFile.mockRejectedValueOnce(new Error('File not found'));
      await expect(generateBundle(mockProjectPath, 'missing.js'))
        .rejects.toThrow('File not found');
    });

    it('should include relative paths in comments', async () => {
      const bundle = await generateBundle(mockProjectPath, 'index.js');
      expect(bundle).toMatch(/\/\/ File: [^\/\\]+\.js/);
    });
  });
});