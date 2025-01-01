import * as fs from 'fs/promises';
import * as path from 'path';

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
}

/**
 * Resolves all dependencies for a given file
 */
export async function resolveDependencies(
  filePath: string,
  deps: Set<string> = new Set(),
  options: DependencyOptions = {}
): Promise<Set<string>> {
  const {
    extensions = ['.js', '.ts', '.jsx', '.tsx'],
    maxDepth = 100,
    ignorePatterns = ['node_modules'],
    baseDir = process.cwd()
  } = options;

  const visited = new Set<string>();
  const resolved = new Set<string>();

  async function resolve(currentPath: string, depth = 0): Promise<void> {
    if (depth > maxDepth || visited.has(currentPath)) {
      return;
    }

    // Check ignore patterns
    if (ignorePatterns.some(pattern => currentPath.includes(pattern))) {
      return;
    }

    visited.add(currentPath);

    try {
      const content = await fs.readFile(currentPath, 'utf-8');
      deps.add(currentPath);

      // Match different import patterns
      const importPatterns = [
        /require\s*\(['"]([^'"]+)['"]\)/g,                    // require('...')
        /import\s+.*?from\s+['"]([^'"]+)['"]/g,              // import ... from '...'
        /import\s*['"]([^'"]+)['"]/g,                        // import '...'
        /import\s*\(.*?['"]([^'"]+)['"]\s*\)/g,              // import('...')
        /export\s+.*?from\s+['"]([^'"]+)['"]/g               // export ... from '...'
      ];

      for (const pattern of importPatterns) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          const importPath = match[1];
          const fullPath = await resolveFilePath(importPath, currentPath, extensions, baseDir);
          
          if (fullPath && !resolved.has(fullPath)) {
            resolved.add(fullPath);
            await resolve(fullPath, depth + 1);
          }
        }
      }
    } catch (err) {
      if (process.env.NODE_ENV !== 'test') {
        console.warn(`Warning: Could not process ${currentPath}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  await resolve(filePath);
  return deps;
}

/**
 * Resolves the full path of an import
 */
async function resolveFilePath(
  importPath: string,
  fromPath: string,
  extensions: string[],
  baseDir: string
): Promise<string | null> {
  // Handle package imports
  if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
    return null; // Skip external package imports
  }

  const basePath = path.resolve(path.dirname(fromPath), importPath);
  const relativePath = path.relative(baseDir, basePath);

  // Check if path has extension
  if (extensions.some(ext => importPath.endsWith(ext))) {
    try {
      await fs.access(basePath);
      return basePath;
    } catch {
      return null;
    }
  }

  // Try adding extensions
  for (const ext of extensions) {
    const fullPath = basePath + ext;
    try {
      await fs.access(fullPath);
      return fullPath;
    } catch {
      continue;
    }
  }

  // Try index files
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

/**
 * Minifies JavaScript code while preserving important structures
 */
export function minifyBundle(code: string): string {
  if (!code.trim()) return '';

  let inString = false;
  let stringChar = '';
  let inComment = false;
  let inMultilineComment = false;
  let result = '';
  let lastChar = '';
  
  for (let i = 0; i < code.length; i++) {
    const char = code[i];
    const nextChar = code[i + 1];

    if (inString) {
      result += char;
      if (char === stringChar && lastChar !== '\\') {
        inString = false;
      }
    } else if (inComment) {
      if (char === '\n') {
        inComment = false;
        result += ' ';
      }
    } else if (inMultilineComment) {
      if (char === '*' && nextChar === '/') {
        inMultilineComment = false;
        i++;
        result += ' ';
      }
    } else {
      if (char === '"' || char === "'") {
        inString = true;
        stringChar = char;
        result += char;
      } else if (char === '/' && nextChar === '/') {
        inComment = true;
        i++;
      } else if (char === '/' && nextChar === '*') {
        inMultilineComment = true;
        i++;
      } else if (/\s/.test(char)) {
        // Preserve necessary whitespace
        const prevChar = result[result.length - 1];
        const nextNonSpaceChar = code.slice(i + 1).match(/\S/);
        
        if (prevChar && nextNonSpaceChar && 
            /[^\s\{\(\[\+\-\*\/\%\<\>\&\|\,\;\:\?]/.test(prevChar) && 
            /[^\s\}\)\]\+\-\*\/\%\<\>\&\|\,\;\:\?]/.test(nextNonSpaceChar[0])) {
          result += ' ';
        }
      } else {
        result += char;
      }
    }
    lastChar = char;
  }

  return result.trim();
}

/**
 * Generates a bundled JavaScript file from an entry point
 */
export async function generateBundle(
  projectPath: string, 
  entryPoint: string,
  options: BundleOptions = {}
): Promise<string> {
  const {
    minify = true,
    comments = true,
    ...dependencyOptions
  } = options;

  const entryFilePath = path.resolve(projectPath, entryPoint);
  let bundle = '';

  try {
    const dependencies = await resolveDependencies(entryFilePath, new Set(), {
      ...dependencyOptions,
      baseDir: projectPath
    });
    
    for (const dep of dependencies) {
      const content = await fs.readFile(dep, 'utf-8');
      const relativePath = path.relative(projectPath, dep);
      
      if (comments) {
        bundle += `\n// File: ${relativePath}\n`;
      }
      
      bundle += `${content}\n`;
    }

    return minify ? minifyBundle(bundle) : bundle;
  } catch (err) {
    throw new Error(
      `Failed to generate bundle from ${entryPoint}: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}