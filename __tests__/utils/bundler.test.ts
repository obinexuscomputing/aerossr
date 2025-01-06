import { resolveDependencies, minifyBundle, generateBundle } from '../../src/utils/bundler';
import * as fs from 'fs/promises';
import * as path from 'path';

// Mock external modules
jest.mock('fs/promises');
jest.mock('path');

const mockFs = fs as jest.Mocked<typeof fs>;
const mockPath = path as jest.Mocked<typeof path>;

describe('Bundler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPath.resolve.mockImplementation((...parts) => parts.join('/'));
    mockPath.dirname.mockImplementation((p) => p.split('/').slice(0, -1).join('/'));
    mockPath.relative.mockImplementation((from, to) => to.replace(from + '/', ''));
    mockPath.join.mockImplementation((...parts) => parts.join('/'));
  });

  describe('resolveDependencies', () => {
    it('should resolve direct dependencies', async () => {
      const mockContent = `
        import foo from './foo';
        import bar from './bar';
      `;
      mockFs.readFile.mockResolvedValue(mockContent);
      mockFs.access.mockResolvedValue(undefined);

      const deps = await resolveDependencies('entry.js');
      
      expect(deps.size).toBe(3); // entry + 2 imports
      expect(deps.has('entry.js')).toBe(true);
      expect(deps.has('./foo')).toBe(true);
      expect(deps.has('./bar')).toBe(true);
    });

    it('should handle circular dependencies', async () => {
      const mockContentA = `import { b } from './b';`;
      const mockContentB = `import { a } from './a';`;
      
      mockFs.readFile
        .mockResolvedValueOnce(mockContentA)
        .mockResolvedValueOnce(mockContentB);
      mockFs.access.mockResolvedValue(undefined);

      const deps = await resolveDependencies('a.js');
      
      expect(deps.size).toBe(2);
      expect(deps.has('a.js')).toBe(true);
      expect(deps.has('./b')).toBe(true);
    });

    it('should respect maxDepth option', async () => {
      const mockContent = `import { next } from './next';`;
      mockFs.readFile.mockResolvedValue(mockContent);
      mockFs.access.mockResolvedValue(undefined);

      const deps = await resolveDependencies('start.js', new Set(), { maxDepth: 2 });
      
      expect(deps.size).toBe(3); // start + 2 levels deep
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

      const deps = await resolveDependencies('entry.js');
      
      expect(deps.size).toBe(7); // entry + 6 imports
    });
  });

  describe('minifyBundle', () => {
    it('should preserve string contents', () => {
      const code = `
        const str1 = "Hello world";
        const str2 = 'Hello "world"';
      `;
      const minified = minifyBundle(code);
      
      expect(minified).toContain('"Hello world"');
      expect(minified).toContain('\'Hello "world"\'');
    });

    it('should remove comments', () => {
      const code = `
        // Line comment
        const a = 1; /* Block comment */ const b = 2;
        /* Multiline
           comment */
        const c = 3;
      `;
      const minified = minifyBundle(code);
      
      expect(minified).not.toContain('Line comment');
      expect(minified).not.toContain('Block comment');
      expect(minified).toBe('const a=1;const b=2;const c=3');
    });

    it('should handle escaped quotes in strings', () => {
      const code = `
        const str = "Hello \\"world\\"";
        const str2 = 'Hello \\'world\\'';
      `;
      const minified = minifyBundle(code);
      
      expect(minified).toContain('"Hello \\"world\\""');
      expect(minified).toContain('\'Hello \\\'world\\\'\'');
    });

    it('should preserve necessary whitespace', () => {
      const code = `
        const a = 1;
        function add(x,y){return x+y}
        const b = add(1,2);
      `;
      const minified = minifyBundle(code);
      
      expect(minified).toContain('function add(x,y)');
      expect(minified).not.toContain('function add (x,y)');
    });
  });

  describe('generateBundle', () => {
    it('should generate bundle with resolved dependencies', async () => {
      const mockContent = `
        import { helper } from './helper';
        export const main = () => helper();
      `;
      const mockHelperContent = `
        export const helper = () => 'helped';
      `;

      mockFs.readFile
        .mockResolvedValueOnce(mockContent)
        .mockResolvedValueOnce(mockHelperContent);
      mockFs.access.mockResolvedValue(undefined);

      const bundle = await generateBundle('./', 'main.js');
      
      expect(bundle).toContain('helper');
      expect(bundle).toContain('helped');
    });

    it('should handle bundle generation errors', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File not found'));

      await expect(generateBundle('./', 'missing.js'))
        .rejects
        .toThrow('Failed to generate bundle');
    });

    it('should respect minification option', async () => {
      const mockContent = `
        const x = 1;
        // Comment
        const y = 2;
      `;
      mockFs.readFile.mockResolvedValue(mockContent);
      mockFs.access.mockResolvedValue(undefined);

      const bundleMinified = await generateBundle('./', 'file.js', { minify: true });
      const bundleUnminified = await generateBundle('./', 'file.js', { minify: false });
      
      expect(bundleMinified).not.toContain('Comment');
      expect(bundleUnminified).toContain('Comment');
    });

    it('should respect comments option', async () => {
      const mockContent = 'const x = 1;';
      mockFs.readFile.mockResolvedValue(mockContent);
      mockFs.access.mockResolvedValue(undefined);

      const bundleWithComments = await generateBundle('./', 'file.js', { comments: true });
      const bundleWithoutComments = await generateBundle('./', 'file.js', { comments: false });
      
      expect(bundleWithComments).toContain('// File:');
      expect(bundleWithoutComments).not.toContain('// File:');
    });
  });
});