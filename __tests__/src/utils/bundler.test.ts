import * as fs from 'fs/promises';
import * as path from 'path';
import { AeroSSRBundler } from '../../../src/utils/Bundler';

// Mock external modules
jest.mock('fs/promises');
jest.mock('path', () => ({
  resolve: jest.fn(),
  dirname: jest.fn(),
  relative: jest.fn(),
  join: jest.fn()
}));

describe('AeroSSRBundler', () => {
  let bundler: AeroSSRBundler;
  const mockFs = jest.mocked(fs);
  const mockPath = jest.mocked(path);

  beforeEach(() => {
    jest.clearAllMocks();

    // Set up path mock implementations
    mockPath.resolve.mockImplementation((...parts: string[]) => parts.join('/'));
    mockPath.dirname.mockImplementation((p: string) => p.split('/').slice(0, -1).join('/'));
    mockPath.relative.mockImplementation((from: string, to: string) => to.replace(from + '/', ''));
    mockPath.join.mockImplementation((...parts: string[]) => parts.join('/'));

    bundler = new AeroSSRBundler('./test-project');
  });

  describe('Dependency Resolution', () => {
    it('should resolve direct dependencies', async () => {
      const mockContent = `
        import foo from './foo';
        import bar from './bar';
      `;
      mockFs.readFile.mockResolvedValue(mockContent);
      mockFs.access.mockResolvedValue(undefined);

      const result = await bundler.generateBundle('entry.js');
      
      expect(result.dependencies.size).toBe(3); // entry + 2 imports
      expect(result.code).toContain('foo');
      expect(result.code).toContain('bar');
    });

    it('should handle circular dependencies', async () => {
      const mockContentA = `import { b } from './b';`;
      const mockContentB = `import { a } from './a';`;
      
      mockFs.readFile
        .mockResolvedValueOnce(mockContentA)
        .mockResolvedValueOnce(mockContentB);
      mockFs.access.mockResolvedValue(undefined);

      const result = await bundler.generateBundle('a.js');
      
      expect(result.dependencies.size).toBe(2);
      expect(result.code).toContain('./b');
      expect(result.code).toContain('./a');
    });

    it('should respect maxDepth option', async () => {
      const mockContent = `import { next } from './next';`;
      mockFs.readFile.mockResolvedValue(mockContent);
      mockFs.access.mockResolvedValue(undefined);

      const result = await bundler.generateBundle('start.js', { maxDepth: 2 });
      
      expect(result.dependencies.size).toBeLessThanOrEqual(3); // start + max 2 levels deep
    });

    it('should handle various import patterns', async () => {
      const mockContent = `
        import defaultExport from './module1';
        import * as name from './module2';
        import { export1 } from './module3';
        require('./module4');
        import('./module5');
        export * from './module6';
      `;
      mockFs.readFile.mockResolvedValue(mockContent);
      mockFs.access.mockResolvedValue(undefined);

      const result = await bundler.generateBundle('entry.js');
      
      expect(result.dependencies.size).toBe(7); // entry + 6 imports
    });
  });

  describe('Code Minification', () => {
    it('should preserve string contents', async () => {
      const mockContent = `
        const str1 = "Hello world";
        const str2 = 'Hello "world"';
      `;
      mockFs.readFile.mockResolvedValue(mockContent);
      mockFs.access.mockResolvedValue(undefined);

      const result = await bundler.generateBundle('test.js', { minify: true });
      
      expect(result.code).toContain('"Hello world"');
      expect(result.code).toContain('\'Hello "world"\'');
    });

    it('should remove comments when minifying', async () => {
      const mockContent = `
        // Line comment
        const a = 1; /* Block comment */ const b = 2;
        /* Multiline
           comment */
        const c = 3;
      `;
      mockFs.readFile.mockResolvedValue(mockContent);
      mockFs.access.mockResolvedValue(undefined);

      const result = await bundler.generateBundle('test.js', { minify: true });
      
      expect(result.code).not.toContain('Line comment');
      expect(result.code).not.toContain('Block comment');
      expect(result.code).toContain('const a=1;const b=2;const c=3');
    });

    it('should preserve comments when minification is disabled', async () => {
      const mockContent = `
        // Line comment
        const value = 42;
      `;
      mockFs.readFile.mockResolvedValue(mockContent);
      mockFs.access.mockResolvedValue(undefined);

      const result = await bundler.generateBundle('test.js', { minify: false });
      
      expect(result.code).toContain('Line comment');
    });
  });

  describe('Bundle Generation', () => {
    it('should generate browser bundle with module system', async () => {
      const mockContent = `export const value = 42;`;
      mockFs.readFile.mockResolvedValue(mockContent);
      mockFs.access.mockResolvedValue(undefined);

      const result = await bundler.generateBundle('entry.js', { target: 'browser' });
      
      expect(result.code).toContain('__modules__');
      expect(result.code).toContain('__exports__');
      expect(result.code).toContain('require');
    });

    it('should generate server bundle without module system', async () => {
      const mockContent = `export const value = 42;`;
      mockFs.readFile.mockResolvedValue(mockContent);
      mockFs.access.mockResolvedValue(undefined);

      const result = await bundler.generateBundle('entry.js', { target: 'server' });
      
      expect(result.code).not.toContain('__modules__');
      expect(result.code).toContain('value = 42');
    });

    it('should include hydration code when specified', async () => {
      const mockContent = `export const value = 42;`;
      mockFs.readFile.mockResolvedValue(mockContent);
      mockFs.access.mockResolvedValue(undefined);

      const result = await bundler.generateBundle('entry.js', { 
        target: 'browser',
        hydration: true 
      });
      
      expect(result.hydrationCode).toBeDefined();
      expect(result.hydrationCode).toContain('__AEROSSR_HYDRATE__');
    });
  });

  describe('Caching', () => {
    it('should cache bundle results', async () => {
      const mockContent = `export const value = 42;`;
      mockFs.readFile.mockResolvedValue(mockContent);
      mockFs.access.mockResolvedValue(undefined);

      const result1 = await bundler.generateBundle('test.js');
      const result2 = await bundler.generateBundle('test.js');
      
      expect(mockFs.readFile).toHaveBeenCalledTimes(1);
      expect(result1.hash).toBe(result2.hash);
    });

    it('should clear cache when requested', async () => {
      const mockContent = `export const value = 42;`;
      mockFs.readFile.mockResolvedValue(mockContent);
      mockFs.access.mockResolvedValue(undefined);

      await bundler.generateBundle('test.js');
      bundler.clearCache();
      await bundler.generateBundle('test.js');
      
      expect(mockFs.readFile).toHaveBeenCalledTimes(2);
    });

    it('should provide accurate cache stats', async () => {
      const mockContent = `export const value = 42;`;
      mockFs.readFile.mockResolvedValue(mockContent);
      mockFs.access.mockResolvedValue(undefined);

      await bundler.generateBundle('test1.js');
      await bundler.generateBundle('test2.js');
      
      const stats = bundler.getCacheStats();
      expect(stats.size).toBe(2);
      expect(stats.keys).toHaveLength(2);
      expect(stats.keys[0]).toContain('test1.js');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing files', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File not found'));

      await expect(bundler.generateBundle('missing.js'))
        .rejects
        .toThrow('Failed to generate bundle');
    });

    it('should handle circular dependency errors', async () => {
      const mockContent = `import './circular';`;
      mockFs.readFile.mockResolvedValue(mockContent);
      mockFs.access.mockRejectedValue(new Error('Too deep'));

      const result = bundler.generateBundle('entry.js', { maxDepth: 1 });
      await expect(result).rejects.toThrow();
    });

    it('should handle invalid entry points', async () => {
      mockFs.access.mockRejectedValue(new Error('Invalid path'));

      const result = bundler.generateBundle('');
      await expect(result).rejects.toThrow();
    });
  });
});