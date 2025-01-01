import * as fs from 'fs/promises';
import * as path from 'path';

interface DependencyOptions {
  extensions?: string[];
  maxDepth?: number;
  ignorePatterns?: string[];
}

type FileContent = string | Buffer;

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
    maxDepth = 100,
    ignorePatterns = []
  } = options;

  // Prevent infinite recursion and check ignore patterns
  if (depth > maxDepth || 
      deps.has(filePath) || 
      ignorePatterns.some(pattern => filePath.includes(pattern))) {
    return deps;
  }

  try {
    deps.add(filePath);
    const content = await fs.readFile(filePath, 'utf-8');

    // Match both require() and import statements
    const importMatches = content.match(
      /(?:require\s*\(['"]([^'"]+)['"]\)|import\s+.*?from\s+['"]([^'"]+)['"])/g
    ) || [];

    for (const match of importMatches) {
      const depPath = match.match(/['"]([^'"]+)['"]/)?.[1];
      if (!depPath) continue;

      try {
        const fullPath = await resolveFilePath(depPath, filePath, extensions);
        if (fullPath) {
          await resolveDependencies(fullPath, deps, options, depth + 1);
        }
      } catch (err) {
        if (process.env.NODE_ENV !== 'test') {
          console.warn(`Warning: Could not resolve dependency ${depPath} in ${filePath}`);
        }
      }
    }
  } catch (err) {
    throw new Error(`Error processing ${filePath}: ${err instanceof Error ? err.message : String(err)}`);
  }

  return deps;
}

async function resolveFilePath(
  importPath: string,
  fromPath: string,
  extensions: string[]
): Promise<string | null> {
  const basePath = path.resolve(path.dirname(fromPath), importPath);

  // Check if path already has a valid extension
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

  return null;
}

/**
 * Minifies JavaScript code while preserving string contents
 */
export function minifyBundle(code: string): string {
  if (!code.trim()) return '';

  let inString = false;
  let stringChar = '';
  let result = '';
  let i = 0;

  while (i < code.length) {
    if (!inString) {
      // Handle comments
      if (code[i] === '/' && code[i + 1] === '*') {
        i = code.indexOf('*/', i + 2) + 2;
        if (i === 1) i = code.length;
        continue;
      }
      if (code[i] === '/' && code[i + 1] === '/') {
        i = code.indexOf('\n', i) + 1;
        if (i === 0) i = code.length;
        continue;
      }

      // Handle strings
      if (code[i] === '"' || code[i] === "'") {
        inString = true;
        stringChar = code[i];
        result += code[i];
        i++;
        continue;
      }

      // Handle whitespace
      if (/\s/.test(code[i])) {
        result += ' ';
        while (i < code.length && /\s/.test(code[i])) i++;
        continue;
      }
    } else {
      // Handle string ending
      if (code[i] === stringChar && code[i - 1] !== '\\') {
        inString = false;
        stringChar = '';
      }
    }

    if (i < code.length) {
      result += code[i];
      i++;
    }
  }

  return result.trim().replace(/\s+/g, ' ');
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