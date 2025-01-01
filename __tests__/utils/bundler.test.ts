import { generateBundle, resolveDependencies, minifyBundle } from '../../src/utils/bundler';
import fs from 'fs/promises';

jest.mock('fs/promises');

const mockIndexPath = './test/index.js';
const mockDependencyPath = './test/dependency.js';
const mockFs = fs as jest.Mocked<typeof fs>;
const mockProjectPath = './test';

describe('Bundler', () => {
  test('should generate bundle', async () => {
    mockFs.readFile.mockResolvedValue('const test = true;');
    const bundle = await generateBundle('./test', 'index.js');
    expect(bundle).toBeDefined();
  });
  beforeEach(() => {
    mockFs.readFile.mockImplementation(async (path) => {
      path = path.toString();
      if (path === mockIndexPath) {
        return `const dep = require('./dependency');\nconsole.log(dep);`;
      }
      if (path === mockDependencyPath) {
        return `module.exports = 'Hello from dependency';`;
      }
      throw new Error('File not found');
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('resolveDependencies', () => {
    test('should resolve direct dependencies', async () => {
      const dependencies = await resolveDependencies(mockIndexPath);
      expect(dependencies.has(mockDependencyPath)).toBe(true);
      expect(dependencies.size).toBe(2); // index.js and dependency.js
    });

    test('should handle circular dependencies', async () => {
      mockFs.readFile.mockImplementation(async (path) => {
        path = path.toString();
        if (path.includes('index.js')) {
          return `require('./circular')`;
        }
        return `require('./index')`;
      });

      const dependencies = await resolveDependencies(mockIndexPath);
      expect(dependencies.size).toBe(2);
    });

    test('should handle invalid imports', async () => {
      mockFs.readFile.mockResolvedValue(`import { something } from "invalid"`);
      await expect(resolveDependencies(mockIndexPath)).resolves.toBeDefined();
    });
  });

  describe('minifyBundle', () => {
    test('should remove comments and whitespace', () => {
      const code = `
        // Single line comment
        function test() {
          /* Multi-line
             comment */
          return true;
        }
      `;
      const minified = minifyBundle(code);
      expect(minified).not.toContain('//');
      expect(minified).not.toContain('/*');
      expect(minified).toBe('function test() { return true; }');
    });

    test('should handle empty input', () => {
      expect(minifyBundle('')).toBe('');
    });

    test('should preserve string contents', () => {
      const code = `const str = "  preserved  spaces  ";`;
      const minified = minifyBundle(code);
      expect(minified).toBe('const str = "  preserved  spaces  ";');
    });
  });

  describe('generateBundle', () => {
    test('should generate bundle with dependencies', async () => {
      const bundle = await generateBundle(mockProjectPath, 'index.js');
      expect(bundle).toContain('Hello from dependency');
      expect(bundle).toContain('console.log');
    });

    test('should handle missing dependencies', async () => {
      mockFs.readFile.mockRejectedValueOnce(new Error('File not found'));
      await expect(generateBundle(mockProjectPath, 'missing.js')).rejects.toThrow();
    });

    test('should include relative paths in comments', async () => {
      const bundle = await generateBundle(mockProjectPath, 'index.js');
      expect(bundle).toContain('// File: dependency.js');
    });
  });
});
