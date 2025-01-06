// src/utils/bundler.ts
import * as fs from 'fs/promises';
import * as path from 'path';
import { createHash } from 'crypto';
import { CacheStoreBase } from '@/types';
import { createCache } from './CacheManager';

export interface DependencyOptions {
  extensions?: string[];
  maxDepth?: number;
  ignorePatterns?: string[];
  baseDir?: string;
}

export interface BundleOptions extends DependencyOptions {
  minify?: boolean;
  sourceMap?: boolean;
  comments?: boolean;
  target?: 'server' | 'browser' | 'universal';
  hydration?: boolean;
}

export interface BundleResult {
  code: string;
  map?: string;
  hydrationCode?: string;
  dependencies: Set<string>;
  hash: string;
}

export interface BundlerOptions extends BundleOptions {
  bundleCache?: CacheStoreBase<string>;
  templateCache?: CacheStoreBase<string>;
}

export class AeroSSRBundler {
  private readonly projectPath: string;
  private readonly bundleCache: CacheStoreBase<string>;
  private readonly templateCache: CacheStoreBase<string>;
  private readonly defaultOptions: Required<BundleOptions>;

  constructor(projectPath: string, options: BundlerOptions = {}) {
    this.projectPath = path.resolve(projectPath);

    // Initialize caches
    this.bundleCache = options.bundleCache || createCache<string>();
    this.templateCache = options.templateCache || createCache<string>();

    this.defaultOptions = {
      extensions: ['.js', '.ts', '.jsx', '.tsx'],
      maxDepth: 100,
      ignorePatterns: ['node_modules'],
      baseDir: this.projectPath,
      minify: true,
      sourceMap: false,
      comments: true,
      target: 'universal',
      hydration: false
    };
  }

  private generateHash(content: string): string {
    return createHash('md5').update(content).digest('hex');
  }

  private async resolveFilePath(
    importPath: string,
    fromPath: string,
    options: { target?: 'server' | 'browser' | 'universal' } = {}
  ): Promise<string | null> {
    if (options.target === 'browser' && !importPath.startsWith('.') && !importPath.startsWith('/')) {
      return importPath;
    }

    const basePath = path.resolve(path.dirname(fromPath), importPath);
    const extensions = this.defaultOptions.extensions;

    if (extensions.some(ext => importPath.endsWith(ext))) {
      try {
        await fs.access(basePath);
        return basePath;
      } catch {
        return null;
      }
    }

    for (const ext of extensions) {
      const fullPath = `${basePath}${ext}`;
      try {
        await fs.access(fullPath);
        return fullPath;
      } catch {
        continue;
      }
    }

    for (const ext of extensions) {
      const indexPath = path.join(basePath, `index${ext}`);
      try {
        await fs.access(indexPath);
        return indexPath;
      } catch {
        continue;
      }
    }

    return null;
  }

  private async resolveDependencies(
    filePath: string,
    options: BundleOptions
  ): Promise<Set<string>> {
    const deps = new Set<string>();
    const { maxDepth, ignorePatterns, target } = { ...this.defaultOptions, ...options };

    if (ignorePatterns.some(pattern => filePath.includes(pattern))) {
      return deps;
    }

    const resolve = async (currentPath: string, depth = 0): Promise<void> => {
      if (depth > maxDepth || deps.has(currentPath)) {
        return;
      }

      deps.add(currentPath);

      try {
        const content = await fs.readFile(currentPath, 'utf-8');
        const importPatterns = [
          /require\s*\(['"]([^'"]+)['"]\)/g,
          /import\s+.*?from\s+['"]([^'"]+)['"]/g,
          /import\s*['"]([^'"]+)['"]/g,
          /import\s*\(.*?['"]([^'"]+)['"]\s*\)/g,
          /export\s+.*?from\s+['"]([^'"]+)['"]/g
        ];

        const promises = importPatterns.flatMap(pattern => {
          const matches: string[] = [];
          let match;
          while ((match = pattern.exec(content)) !== null) {
            matches.push(match[1]);
          }
          return matches.map(importPath => this.resolveFilePath(importPath, currentPath, { target }));
        });

        const resolvedPaths = await Promise.all(promises);

        for (const resolved of resolvedPaths) {
          if (resolved) {
            await resolve(resolved, depth + 1);
          }
        }
      } catch (err) {
        throw new Error(`Error processing ${currentPath}: ${err instanceof Error ? err.message : String(err)}`);
      }
    };

    await resolve(filePath, 0);
    return deps;
  }

  private minifyBundle(code: string): string {
    if (!code.trim()) return '';

    const strings: string[] = [];
    let stringPlaceholderCode = code.replace(
      /`(?:\\[\s\S]|[^\\`])*`|"(?:\\[\s\S]|[^\\"])*"|'(?:\\[\s\S]|[^\\'])*'/g,
      (match) => {
        strings.push(match);
        return `__STRING_${strings.length - 1}__`;
      }
    );

    let result = '';
    let inComment = false;
    let inMultilineComment = false;

    for (let i = 0; i < stringPlaceholderCode.length; i++) {
      const char = stringPlaceholderCode[i];
      const nextChar = stringPlaceholderCode[i + 1] || '';

      if (inComment) {
        if (char === '\n') inComment = false;
        continue;
      }

      if (inMultilineComment) {
        if (char === '*' && nextChar === '/') {
          inMultilineComment = false;
          i++;
        }
        continue;
      }

      if (char === '/' && nextChar === '/') {
        inComment = true;
        i++;
        continue;
      }

      if (char === '/' && nextChar === '*') {
        inMultilineComment = true;
        i++;
        continue;
      }

      if (/\s/.test(char)) {
        const prevChar = result[result.length - 1];
        const nextNonSpaceChar = stringPlaceholderCode.slice(i + 1).match(/\S/);

        if (prevChar && nextNonSpaceChar && 
            /[a-zA-Z0-9_$]/.test(prevChar) && 
            /[a-zA-Z0-9_$]/.test(nextNonSpaceChar[0])) {
          result += ' ';
        }
        continue;
      }

      result += char;
    }

    result = result
      .replace(/\s*([+\-*/%=<>!&|^~?:,;{}[\]()])\s*/g, '$1')
      .replace(/\s+/g, ' ')
      .trim();

    return result.replace(/__STRING_(\d+)__/g, (_, index) => strings[parseInt(index)]);
  }

  private generateHydrationCode(entryPoint: string): string {
    return `
      (function() {
        window.__AEROSSR_HYDRATE__ = true;
        const script = document.createElement('script');
        script.type = 'module';
        script.src = '${entryPoint}';
        document.body.appendChild(script);
      })();
    `;
  }

  private generateModuleSystem(): string {
    return `
      const __modules__ = new Map();
      const __exports__ = new Map();
      
      function require(id) {
        if (!__exports__.has(id)) {
          const module = { exports: {} };
          __modules__.get(id)(module, module.exports, require);
          __exports__.set(id, module.exports);
        }
        return __exports__.get(id);
      }
    `;
  }

  public async generateBundle(
    entryPoint: string,
    options: Partial<BundleOptions> = {}
  ): Promise<BundleResult> {
    const mergedOptions = { ...this.defaultOptions, ...options };
    const cacheKey = `${entryPoint}:${JSON.stringify(mergedOptions)}`;

    const cached = this.bundleCache.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as BundleResult;
    }

    try {
      const entryFilePath = path.resolve(this.projectPath, entryPoint);
      const dependencies = await this.resolveDependencies(entryFilePath, mergedOptions);

      if (dependencies.size === 0) {
        throw new Error(`No dependencies found for ${entryPoint}`);
      }

      const chunks: string[] = [];

      if (mergedOptions.target !== 'server') {
        chunks.push(this.generateModuleSystem());
      }

      for (const dep of dependencies) {
        const content = await fs.readFile(dep, 'utf-8');
        const relativePath = path.relative(this.projectPath, dep);

        if (dep.endsWith('.html')) {
          const templateKey = `template:${relativePath}`;
          const cached = this.templateCache.get(templateKey) || content;
          this.templateCache.set(templateKey, cached);
          chunks.push(cached);
        } else {
          if (mergedOptions.comments) {
            chunks.push(`\n// File: ${relativePath}`);
          }

          if (mergedOptions.target !== 'server') {
            chunks.push(`
              __modules__.set("${relativePath}", function(module, exports, require) {
                ${content}
              });
            `);
          } else {
            chunks.push(content);
          }
        }
      }

      if (mergedOptions.target !== 'server') {
        const relativeEntryPoint = path.relative(this.projectPath, entryFilePath);
        chunks.push(`\nrequire("${relativeEntryPoint}");`);
      }

      const code = chunks.join('\n');
      const minified = mergedOptions.minify ? this.minifyBundle(code) : code;
      const hash = this.generateHash(minified);

      const result: BundleResult = {
        code: minified,
        dependencies,
        hash
      };

      if (mergedOptions.hydration) {
        result.hydrationCode = this.generateHydrationCode(entryPoint);
      }

      this.bundleCache.set(cacheKey, JSON.stringify(result));

      return result;
    } catch (err) {
      throw new Error(
        `Failed to generate bundle from ${entryPoint}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  public clearCache(): void {
    this.bundleCache.clear();
    this.templateCache.clear();
  }

  public getCacheStats(): { bundles: number; templates: number } {
    return {
      bundles: this.bundleCache.size,
      templates: this.templateCache.size
    };
  }
}
