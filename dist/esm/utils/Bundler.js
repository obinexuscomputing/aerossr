/*!
  @obinexuscomputing/aerossr v0.1.1
  (c) 2025 OBINexus Computing
  Released under the ISC License
 */
import * as fs from 'fs/promises';
import * as path from 'path';
import { createHash } from 'crypto';
import { createCache } from './CacheManager.js';

// src/utils/bundler.ts
class AeroSSRBundler {
    projectPath;
    bundleCache;
    templateCache;
    defaultOptions;
    constructor(projectPath, options = {}) {
        this.projectPath = path.resolve(projectPath);
        // Initialize caches
        this.bundleCache = options.bundleCache || createCache();
        this.templateCache = options.templateCache || createCache();
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
    generateHash(content) {
        return createHash('md5').update(content).digest('hex');
    }
    async resolveFilePath(importPath, fromPath, options = {}) {
        if (options.target === 'browser' && !importPath.startsWith('.') && !importPath.startsWith('/')) {
            return importPath;
        }
        const basePath = path.resolve(path.dirname(fromPath), importPath);
        const extensions = this.defaultOptions.extensions;
        if (extensions.some(ext => importPath.endsWith(ext))) {
            try {
                await fs.access(basePath);
                return basePath;
            }
            catch {
                return null;
            }
        }
        for (const ext of extensions) {
            const fullPath = `${basePath}${ext}`;
            try {
                await fs.access(fullPath);
                return fullPath;
            }
            catch {
                continue;
            }
        }
        for (const ext of extensions) {
            const indexPath = path.join(basePath, `index${ext}`);
            try {
                await fs.access(indexPath);
                return indexPath;
            }
            catch {
                continue;
            }
        }
        return null;
    }
    async resolveDependencies(filePath, options) {
        const deps = new Set();
        const { maxDepth, ignorePatterns, target } = { ...this.defaultOptions, ...options };
        if (ignorePatterns.some(pattern => filePath.includes(pattern))) {
            return deps;
        }
        const resolve = async (currentPath, depth = 0) => {
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
                    const matches = [];
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
            }
            catch (err) {
                throw new Error(`Error processing ${currentPath}: ${err instanceof Error ? err.message : String(err)}`);
            }
        };
        await resolve(filePath, 0);
        return deps;
    }
    minifyBundle(code) {
        if (!code.trim())
            return '';
        const strings = [];
        let stringPlaceholderCode = code.replace(/`(?:\\[\s\S]|[^\\`])*`|"(?:\\[\s\S]|[^\\"])*"|'(?:\\[\s\S]|[^\\'])*'/g, (match) => {
            strings.push(match);
            return `__STRING_${strings.length - 1}__`;
        });
        let result = '';
        let inComment = false;
        let inMultilineComment = false;
        for (let i = 0; i < stringPlaceholderCode.length; i++) {
            const char = stringPlaceholderCode[i];
            const nextChar = stringPlaceholderCode[i + 1] || '';
            if (inComment) {
                if (char === '\n')
                    inComment = false;
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
    generateHydrationCode(entryPoint) {
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
    generateModuleSystem() {
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
    async generateBundle(entryPoint, options = {}) {
        const mergedOptions = { ...this.defaultOptions, ...options };
        const cacheKey = `${entryPoint}:${JSON.stringify(mergedOptions)}`;
        const cached = this.bundleCache.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }
        try {
            const entryFilePath = path.resolve(this.projectPath, entryPoint);
            const dependencies = await this.resolveDependencies(entryFilePath, mergedOptions);
            if (dependencies.size === 0) {
                throw new Error(`No dependencies found for ${entryPoint}`);
            }
            const chunks = [];
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
                }
                else {
                    if (mergedOptions.comments) {
                        chunks.push(`\n// File: ${relativePath}`);
                    }
                    if (mergedOptions.target !== 'server') {
                        chunks.push(`
              __modules__.set("${relativePath}", function(module, exports, require) {
                ${content}
              });
            `);
                    }
                    else {
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
            const result = {
                code: minified,
                dependencies,
                hash
            };
            if (mergedOptions.hydration) {
                result.hydrationCode = this.generateHydrationCode(entryPoint);
            }
            this.bundleCache.set(cacheKey, JSON.stringify(result));
            return result;
        }
        catch (err) {
            throw new Error(`Failed to generate bundle from ${entryPoint}: ${err instanceof Error ? err.message : String(err)}`);
        }
    }
    clearCache() {
        this.bundleCache.clear();
        this.templateCache.clear();
    }
    getCacheStats() {
        return {
            bundles: this.bundleCache.size,
            templates: this.templateCache.size
        };
    }
}

export { AeroSSRBundler };
//# sourceMappingURL=Bundler.js.map
