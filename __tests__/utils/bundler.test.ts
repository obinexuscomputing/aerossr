import { PathLike } from 'fs';
import { resolveDependencies, minifyBundle, generateBundle } from '../../src/utils/bundler';
import * as fs from 'fs/promises';
import * as path from 'path';

jest.mock('fs/promises');
jest.mock('path');

describe('Bundler', () => {
  const mockFs = fs as jest.Mocked<typeof fs>;
  const mockPath = path as jest.Mocked<typeof path>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPath.resolve.mockImplementation((...parts) => parts.join('/'));
    mockPath.dirname.mockImplementation((p) => p.split('/').slice(0, -1).join('/'));
    mockPath.relative.mockImplementation((from, to) => to.replace(from + '/', ''));
    mockPath.join.mockImplementation((...parts) => parts.join('/'));
  });

  describe('resolveDependencies', () => {
    it('should resolve direct dependencies', async () => {
      mockFs.readFile.mockImplementation(async (filePath) => {
        if (filePath === 'entry.js') {
          return `const dep = require('./dependency.js');\nconsole.log(dep);`;
        }
        return '';
      });

      mockFs.access.mockResolvedValue(undefined);

      const deps = await resolveDependencies('entry.js');
      expect(deps.has('entry.js')).toBe(true);
      expect(deps.has('dependency.js')).toBe(true);
    });

    it('should handle circular dependencies', async () => {
      mockFs.readFile.mockImplementation(async (filePath) => {
        if (filePath === 'a.js') {
          return `require('./b.js')`;
        }
        if (filePath === 'b.js') {
          return `require('./a.js')`;
        }
        return '';
      });

      mockFs.access.mockResolvedValue(undefined);

      const deps = await resolveDependencies('a.js');
      expect(deps.has('a.js')).toBe(true);
      expect(deps.has('b.js')).toBe(true);
      expect(deps.size).toBe(2);
    });

    it('should respect maxDepth option', async () => {
      mockFs.readFile.mockImplementation(async (filePath) => {
        const num = parseInt((filePath as string).match(/\d+/)?.[0] || '0');
        return `require('./dep${num + 1}.js')`;
      });

      mockFs.access.mockResolvedValue(undefined);

      const deps = await resolveDependencies('dep0.js', new Set(), { maxDepth: 2 });
      expect(deps.size).toBeLessThanOrEqual(3); // dep0.js, dep1.js, dep2.js
    });

    it('should handle various import patterns', async () => {
      const testCode = `
        import defaultExport from "./module1";
        import * as name from "./module2";
        import { export1 } from "./module3";
        require('./module4');
        import('./module5');
        export * from './module6';
      `;

      mockFs.readFile.mockImplementation(async () => testCode);
      mockFs.access.mockResolvedValue(undefined);

      const deps = await resolveDependencies('test.js');
      expect(deps.size).toBeGreaterThan(1);
    });
  });

  describe('minifyBundle', () => {
    it('should preserve string contents', () => {
      const code = `const str = "  spaces  in  string  ";`;
      const minified = minifyBundle(code);
      expect(minified).toContain('"  spaces  in  string  "');
    });

    it('should remove comments', () => {
      const code = `
        // Single line comment
        const a = 1;
        /* Multi-line
           comment */
        const b = 2;
      `;
      const minified = minifyBundle(code);
      expect(minified).not.toContain('comment');
      expect(minified).toContain('const a=1');
      expect(minified).toContain('const b=2');
    });

    it('should handle escaped quotes in strings', () => {
      const code = `const str = "string with \\"quotes\\"";`;
      const minified = minifyBundle(code);
      expect(minified).toContain('\\"quotes\\"');
    });

    it('should preserve necessary whitespace', () => {
      const code = `const a = 1; return a + b;`;
      const minified = minifyBundle(code);
      expect(minified).toContain('return a + b');
    });
  });

  describe('generateBundle', () => {
    it('should generate bundle with resolved dependencies', async () => {
      const mockDeps = new Map([
        ['index.js', `import { helper } from './helper';\nconsole.log(helper());`],
        ['helper.js', `export const helper = () => 'helper';`]
      ]);

      mockFs.readFile.mockImplementation(async (filePath: PathLike | fs.FileHandle) => {
        const key = Array.from(mockDeps.keys()).find(k => (filePath as string).endsWith(k));
        return key ? mockDeps.get(key)! : '';
      });

      mockFs.access.mockResolvedValue(undefined);

      const bundle = await generateBundle('/project', 'index.js');
      expect(bundle).toContain('helper');
      expect(bundle).toContain('console.log');
    });

    it('should handle bundle generation errors', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File not found'));

      await expect(generateBundle('/project', 'missing.js')).rejects.toThrow();
    });

    it('should respect minification option', async () => {
      mockFs.readFile.mockResolvedValue('const x = 1;\n\nconst y = 2;');
      mockFs.access.mockResolvedValue(undefined);

      const unminified = await generateBundle('/project', 'test.js', { minify: false });
      const minified = await generateBundle('/project', 'test.js', { minify: true });

      expect(unminified.length).toBeGreaterThan(minified.length);
      expect(unminified).toContain('\n');
      expect(minified).not.toContain('\n');
    });

    it('should respect comments option', async () => {
      mockFs.readFile.mockResolvedValue('const x = 1;');
      mockFs.access.mockResolvedValue(undefined);

      const withComments = await generateBundle('/project', 'test.js', { 
        comments: true,
        minify: false
      });
      const withoutComments = await generateBundle('/project', 'test.js', {
        comments: false,
        minify: false
      });

      expect(withComments).toContain('// File:');
      expect(withoutComments).not.toContain('// File:');
    });
  });
});