/*!
  @obinexuscomputing/aerossr v0.1.1
  (c) 2025 OBINexus Computing
  Released under the ISC License
 */
'use strict';

var fs = require('fs/promises');
var path = require('path');
var crypto = require('crypto');
var zlib = require('zlib');
var util = require('util');
var CacheManager = require('../utils/cache/CacheManager.js');
var ETagGenerator = require('../utils/security/ETagGenerator.js');

function _interopNamespaceDefault(e) {
    var n = Object.create(null);
    if (e) {
        Object.keys(e).forEach(function (k) {
            if (k !== 'default') {
                var d = Object.getOwnPropertyDescriptor(e, k);
                Object.defineProperty(n, k, d.get ? d : {
                    enumerable: true,
                    get: function () { return e[k]; }
                });
            }
        });
    }
    n.default = e;
    return Object.freeze(n);
}

var fs__namespace = /*#__PURE__*/_interopNamespaceDefault(fs);
var path__namespace = /*#__PURE__*/_interopNamespaceDefault(path);

// src/bundler/UnifiedBundler.ts
const gzipAsync = util.promisify(zlib.gzip);
class UnifiedBundler {
    projectPath;
    bundleCache;
    compression;
    cacheMaxAge;
    logger;
    defaultOptions;
    constructor(config) {
        this.projectPath = path__namespace.resolve(config.projectPath);
        this.bundleCache = config.bundleCache || CacheManager.createCache();
        this.compression = config.compression !== false;
        this.cacheMaxAge = config.cacheMaxAge || 3600;
        this.logger = config.logger;
        this.defaultOptions = {
            minify: true,
            sourceMap: false,
            comments: true,
            target: 'universal',
            hydration: false,
            extensions: ['.js', '.ts', '.jsx', '.tsx'],
            maxDepth: 100,
            ignorePatterns: ['node_modules']
        };
    }
    // Client-side bootstrapping code
    generateBootstrap(mainScript) {
        return `
      window.__AEROSSR_LOAD__ = function() {
        const bundleEndpoint = '/dist?entryPoint=${encodeURIComponent(mainScript)}';
        console.log('Fetching bundle from:', bundleEndpoint);
        
        return fetch(bundleEndpoint)
          .then(response => response.text())
          .then(bundle => {
            if (window.__AEROSSR_HYDRATE__) {
              // Hydration mode
              new Function('window', bundle)(window);
            } else {
              // Regular mode
              new Function(bundle)();
            }
          })
          .catch(error => console.error('Error loading bundle:', error));
      };

      window.addEventListener('load', window.__AEROSSR_LOAD__);
    `;
    }
    // Server-side bundle handling
    async handleDistRequest(req, res, query) {
        try {
            const entryPoint = query.entryPoint || 'main.js';
            const bundle = await this.generateBundle(entryPoint, {
                minify: true,
                target: 'browser'
            });
            const etag = ETagGenerator.etagGenerator.generate(bundle.code);
            if (req.headers['if-none-match'] === etag) {
                res.writeHead(304);
                res.end();
                return;
            }
            const headers = {
                'Content-Type': 'application/javascript',
                'Cache-Control': `public, max-age=${this.cacheMaxAge}`,
                'ETag': etag,
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS'
            };
            if (this.compression && req.headers['accept-encoding']?.includes('gzip')) {
                const compressed = await gzipAsync(bundle.code);
                headers['Content-Encoding'] = 'gzip';
                headers['Vary'] = 'Accept-Encoding';
                res.writeHead(200, headers);
                res.end(compressed);
            }
            else {
                res.writeHead(200, headers);
                res.end(bundle.code);
            }
        }
        catch (error) {
            this.logger?.error(`Bundle generation failed: ${error}`);
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Internal Server Error');
        }
    }
    // ... rest of existing AeroSSRBundler methods (resolveDependencies, minifyBundle, etc.) ...
    async generateBundle(entryPoint, options = {}) {
        const mergedOptions = { ...this.defaultOptions, ...options };
        const cacheKey = `${entryPoint}:${JSON.stringify(mergedOptions)}`;
        // Check cache
        const cached = this.bundleCache.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }
        try {
            const entryFilePath = path__namespace.resolve(this.projectPath, entryPoint);
            const dependencies = await this.resolveDependencies(entryFilePath, mergedOptions);
            const chunks = [];
            // Add module system for browser bundles
            if (mergedOptions.target === 'browser') {
                chunks.push(this.generateModuleSystem());
            }
            for (const dep of dependencies) {
                const content = await fs__namespace.readFile(dep, 'utf-8');
                const relativePath = path__namespace.relative(this.projectPath, dep);
                if (mergedOptions.comments) {
                    chunks.push(`\n// File: ${relativePath}`);
                }
                if (mergedOptions.target === 'browser') {
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
            if (mergedOptions.target === 'browser') {
                const relativeEntryPoint = path__namespace.relative(this.projectPath, entryFilePath);
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
            // Cache the result
            this.bundleCache.set(cacheKey, JSON.stringify(result));
            return result;
        }
        catch (err) {
            throw new Error(`Failed to generate bundle from ${entryPoint}: ${err instanceof Error ? err.message : String(err)}`);
        }
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
    clearCache() {
        this.bundleCache.clear();
    }
    getCacheStats() {
        return {
            size: Object.keys(this.bundleCache || {}).length,
            keys: Object.keys(this.bundleCache || {})
        };
    }
    generateHash(content) {
        return crypto.createHash('md5').update(content).digest('hex');
    }
    async resolveDependencies(filePath, options) {
        const deps = new Set();
        const { maxDepth, ignorePatterns } = options;
        // Skip ignored patterns
        if (ignorePatterns?.some(pattern => filePath.includes(pattern))) {
            return deps;
        }
        async function resolve(currentPath, depth = 0) {
            if (depth > (maxDepth || this.defaultOptions.maxDepth) || deps.has(currentPath)) {
                return;
            }
            deps.add(currentPath);
            try {
                const content = await fs__namespace.readFile(currentPath, 'utf-8');
                // Match different import patterns
                const importPatterns = [
                    /require\s*\(['"]([^'"]+)['"]\)/g,
                    /import\s+.*?from\s+['"]([^'"]+)['"]/g,
                    /import\s*['"]([^'"]+)['"]/g,
                    /import\s*\(.*?['"]([^'"]+)['"]\s*\)/g,
                    /export\s+.*?from\s+['"]([^'"]+)['"]/g // export ... from '...'
                ];
                const promises = [];
                for (const pattern of importPatterns) {
                    let match;
                    while ((match = pattern.exec(content)) !== null) {
                        const importPath = match[1];
                        if (!importPath)
                            continue;
                        promises.push((async () => {
                            try {
                                const fullPath = await this.resolveFilePath(importPath, currentPath);
                                if (fullPath) {
                                    await resolve.call(this, fullPath, depth + 1);
                                }
                            }
                            catch (err) {
                                if (process.env.NODE_ENV !== 'test') {
                                    this.logger?.warn(`Could not resolve dependency ${importPath} in ${currentPath}`);
                                }
                            }
                        })());
                    }
                }
                await Promise.all(promises);
            }
            catch (err) {
                throw new Error(`Error processing ${currentPath}: ${err instanceof Error ? err.message : String(err)}`);
            }
        }
        await resolve.call(this, filePath);
        return deps;
    }
    async resolveFilePath(importPath, fromPath) {
        // Handle non-relative imports
        if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
            return null;
        }
        const basePath = path__namespace.resolve(path__namespace.dirname(fromPath), importPath);
        const extensions = this.defaultOptions.extensions;
        // Check if path already has extension
        if (extensions.some(ext => importPath.endsWith(ext))) {
            try {
                await fs__namespace.access(basePath);
                return basePath;
            }
            catch {
                return null;
            }
        }
        // Try adding extensions
        for (const ext of extensions) {
            const fullPath = `${basePath}${ext}`;
            try {
                await fs__namespace.access(fullPath);
                return fullPath;
            }
            catch {
                continue;
            }
        }
        // Try index files
        for (const ext of extensions) {
            const indexPath = path__namespace.join(basePath, `index${ext}`);
            try {
                await fs__namespace.access(indexPath);
                return indexPath;
            }
            catch {
                continue;
            }
        }
        return null;
    }
    minifyBundle(code) {
        if (!code.trim())
            return '';
        // Extract and preserve strings
        const strings = [];
        let stringPlaceholderCode = code.replace(/`(?:\\[\s\S]|[^\\`])*`|"(?:\\[\s\S]|[^\\"])*"|'(?:\\[\s\S]|[^\\'])*'/g, (match) => {
            strings.push(match);
            return `__STRING_${strings.length - 1}__`;
        });
        // Process code while preserving structure
        let result = '';
        let inComment = false;
        let inMultilineComment = false;
        for (let i = 0; i < stringPlaceholderCode.length; i++) {
            const char = stringPlaceholderCode[i];
            const nextChar = stringPlaceholderCode[i + 1] || '';
            // Handle comments
            if (inComment) {
                if (char === '\n') {
                    inComment = false;
                }
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
            // Handle whitespace
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
        // Clean up and restore strings
        result = result
            .replace(/\s*([+\-*/%=<>!&|^~?:,;{}[\]()])\s*/g, '$1')
            .replace(/\s+/g, ' ')
            .trim();
        return result.replace(/__STRING_(\d+)__/g, (_, index) => strings[parseInt(index)]);
    }
}

exports.UnifiedBundler = UnifiedBundler;
//# sourceMappingURL=UnifiedBundler.js.map
