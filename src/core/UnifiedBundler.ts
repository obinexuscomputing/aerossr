// src/bundler/UnifiedBundler.ts
import * as fs from 'fs/promises';
import * as path from 'path';
import { createHash } from 'crypto';
import { gzip } from 'zlib';
import { promisify } from 'util';
import { IncomingMessage, ServerResponse } from 'http';
import { CacheStoreBase, Logger } from '@/types';
import { createCache } from '@/utils/cache/CacheManager';
import { etagGenerator } from '@/utils/security/ETagGenerator';

const gzipAsync = promisify(gzip);

export interface BundlerConfig {
  projectPath: string;
  bundleCache?: CacheStoreBase<string>;
  compression?: boolean;
  cacheMaxAge?: number;
  logger?: Logger;
}

export interface BundleOptions {
  minify?: boolean;
  sourceMap?: boolean;
  comments?: boolean;
  target?: 'server' | 'browser' | 'universal';
  hydration?: boolean;
  extensions?: string[];
  maxDepth?: number;
  ignorePatterns?: string[];
}

export interface BundleResult {
  code: string;
  map?: string;
  hydrationCode?: string;
  dependencies: Set<string>;
  hash: string;
}

export class UnifiedBundler {
  private readonly projectPath: string;
  private readonly bundleCache: CacheStoreBase<string>;
  private readonly compression: boolean;
  private readonly cacheMaxAge: number;
  private readonly logger?: Logger;
  private readonly defaultOptions: Required<BundleOptions>;

  constructor(config: BundlerConfig) {
    this.projectPath = path.resolve(config.projectPath);
    this.bundleCache = config.bundleCache || createCache<string>();
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
  public generateBootstrap(mainScript: string): string {
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
  public async handleDistRequest(
    req: IncomingMessage,
    res: ServerResponse,
    query: Record<string, string | string[] | undefined>
  ): Promise<void> {
    try {
      const entryPoint = (query.entryPoint as string) || 'main.js';

      const bundle = await this.generateBundle(entryPoint, {
        minify: true,
        target: 'browser'
      });

      const etag = etagGenerator.generate(bundle.code);

      if (req.headers['if-none-match'] === etag) {
        res.writeHead(304);
        res.end();
        return;
      }

      const headers: Record<string, string> = {
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
      } else {
        res.writeHead(200, headers);
        res.end(bundle.code);
      }
    } catch (error) {
      this.logger?.error(`Bundle generation failed: ${error}`);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
    }
  }

  // ... rest of existing AeroSSRBundler methods (resolveDependencies, minifyBundle, etc.) ...
  
  public async generateBundle(
    entryPoint: string,
    options: Partial<BundleOptions> = {}
  ): Promise<BundleResult> {
    const mergedOptions = { ...this.defaultOptions, ...options };
    const cacheKey = `${entryPoint}:${JSON.stringify(mergedOptions)}`;

    // Check cache
    const cached = this.bundleCache.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    try {
      const entryFilePath = path.resolve(this.projectPath, entryPoint);
      const dependencies = await this.resolveDependencies(entryFilePath, mergedOptions);

      const chunks: string[] = [];
      
      // Add module system for browser bundles
      if (mergedOptions.target === 'browser') {
        chunks.push(this.generateModuleSystem());
      }

      for (const dep of dependencies) {
        const content = await fs.readFile(dep, 'utf-8');
        const relativePath = path.relative(this.projectPath, dep);
        
        if (mergedOptions.comments) {
          chunks.push(`\n// File: ${relativePath}`);
        }

        if (mergedOptions.target === 'browser') {
          chunks.push(`
            __modules__.set("${relativePath}", function(module, exports, require) {
              ${content}
            });
          `);
        } else {
          chunks.push(content);
        }
      }

      if (mergedOptions.target === 'browser') {
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

      // Cache the result
      this.bundleCache.set(cacheKey, JSON.stringify(result));

      return result;
    } catch (err) {
      throw new Error(
        `Failed to generate bundle from ${entryPoint}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
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

  public clearCache(): void {
    this.bundleCache.clear();
  }

  public getCacheStats(): { size: number; keys: string[] } {
    return {
      size: Object.keys(this.bundleCache || {}).length,
      keys: Object.keys(this.bundleCache || {})
    };
  }

  private generateHash(content: string): string {
    return createHash('md5').update(content).digest('hex');
  }
}