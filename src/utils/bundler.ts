// src/utils/bundler.ts
import * as fs from 'fs/promises';
import * as path from 'path';

interface DependencyOptions {
  extensions?: string[];
  maxDepth?: number;
}

/**
 * Resolves all dependencies for a given file
 */
export async function resolveDependencies(
  filePath: string,
  deps: Set<string> = new Set(),
  options: DependencyOptions = {},
  depth = 0
): Promise<Set<string>> {
  const {
    extensions = ['.js', '.ts'],
    maxDepth = 100
  } = options;

  // Prevent infinite recursion
  if (depth > maxDepth || deps.has(filePath)) {
    return deps;
  }

  try {
    deps.add(filePath);
    const content = await fs.readFile(filePath, 'utf-8');

    // Match both require() and import statements
    const importMatches = content.match(/(?:require\s*\(['"]([^'"]+)['"]\)|import\s+.*?from\s+['"]([^'"]+)['"])/g) || [];

    for (const match of importMatches) {
      const depPath = match.match(/['"]([^'"]+)['"]/)?.[1];
      if (!depPath) continue;

      try {
        let fullPath = path.resolve(path.dirname(filePath), depPath);
        
        // Add extension if needed
        if (!extensions.some(ext => depPath.endsWith(ext))) {
          for (const ext of extensions) {
            try {
              await fs.access(fullPath + ext);
              fullPath += ext;
              break;
            } catch {
              continue;
            }
          }
        }

        if (extensions.some(ext => fullPath.endsWith(ext))) {
          await resolveDependencies(fullPath, deps, options, depth + 1);
        }
      } catch (err) {
        console.warn(`Warning: Could not resolve dependency ${depPath} in ${filePath}`);
      }
    }
  } catch (err) {
    throw new Error(`Error processing ${filePath}: ${err instanceof Error ? err.message : String(err)}`);
  }

  return deps;
}

/**
 * Minifies JavaScript code while preserving string contents
 */
export function minifyBundle(code: string): string {
  if (!code.trim()) return '';

  return code
    // Remove multi-line comments
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // Remove single-line comments (but not URLs in strings)
    .replace(/([^:]|^)\/\/[^\n]*/g, '$1')
    // Replace multiple spaces with single space (preserve string contents)
    .split(/"[^"]*"|'[^']*'/)
    .map((part, i) => i % 2 === 0 ? part.replace(/\s+/g, ' ').trim() : part)
    .join('')
    // Remove spaces around operators and brackets (outside strings)
    .replace(/\s*([+\-*/%=<>!&|^~?:,;{}[\]()])\s*/g, '$1')
    .trim();
}

/**
 * Generates a bundled JavaScript file from an entry point
 */
export async function generateBundle(projectPath: string, entryPoint: string): Promise<string> {
  const entryFilePath = path.join(projectPath, entryPoint);
  let bundle = '';

  try {
    const dependencies = await resolveDependencies(entryFilePath);
    
    for (const dep of dependencies) {
      const content = await fs.readFile(dep, 'utf-8');
      const relativePath = path.relative(projectPath, dep);
      bundle += `\n// File: ${relativePath}\n${content}\n`;
    }

    return minifyBundle(bundle);
  } catch (err) {
    throw new Error(
      `Failed to generate bundle from ${entryPoint}: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}