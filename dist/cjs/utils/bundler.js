/*!
 * @obinexuscomputing/aerossr v0.1.1
 * (c) 2025 OBINexus Computing
 * Released under the ISC License
 */
'use strict';

var fs = require('fs/promises');
var path = require('path');

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

/**
 * Resolves all dependencies for a given file
 */
async function resolveDependencies(filePath, deps = new Set(), options = {}) {
    const { extensions = ['.js', '.ts', '.jsx', '.tsx'], maxDepth = 100, ignorePatterns = ['node_modules'] } = options;
    async function resolve(currentPath, depth = 0) {
        if (depth > maxDepth || ignorePatterns.some(pattern => currentPath.includes(pattern))) {
            return;
        }
        // Add the file to dependencies before processing to handle circular dependencies
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
            for (const pattern of importPatterns) {
                let match;
                while ((match = pattern.exec(content)) !== null) {
                    const importPath = match[1];
                    if (!importPath)
                        continue;
                    try {
                        const fullPath = await resolveFilePath(importPath, currentPath, extensions);
                        if (fullPath && !deps.has(fullPath)) {
                            await resolve(fullPath, depth + 1);
                        }
                    }
                    catch (err) {
                        if (process.env.NODE_ENV !== 'test') {
                            console.warn(`Warning: Could not resolve dependency ${importPath} in ${currentPath}`);
                        }
                    }
                }
            }
        }
        catch (err) {
            throw new Error(`Error processing ${currentPath}: ${err instanceof Error ? err.message : String(err)}`);
        }
    }
    await resolve(filePath);
    return deps;
}
/**
 * Resolves the full path of an import
 */
async function resolveFilePath(importPath, fromPath, extensions) {
    // Handle package imports
    if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
        return null;
    }
    const basePath = path__namespace.resolve(path__namespace.dirname(fromPath), importPath);
    // Check if path has extension
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
        const fullPath = basePath + ext;
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
/**
 * Minifies JavaScript code while preserving important structures
 */
function minifyBundle(code) {
    if (!code.trim())
        return '';
    // Replace all line comments
    code = code.replace(/\/\/[^\n]*/g, '');
    // Replace all multiline comments
    code = code.replace(/\/\*[\s\S]*?\*\//g, '');
    // Handle string literals and operators
    let result = '';
    let inString = false;
    let stringChar = '';
    let lastChar = '';
    for (let i = 0; i < code.length; i++) {
        const char = code[i];
        if (inString) {
            result += char;
            if (char === stringChar && lastChar !== '\\') {
                inString = false;
            }
        }
        else if (char === '"' || char === "'") {
            inString = true;
            stringChar = char;
            result += char;
        }
        else if (char && /\s/.test(char)) {
            const prevChar = result[result.length - 1];
            const nextChar = code[i + 1];
            // Keep space only if needed for syntax
            if (prevChar && nextChar &&
                /[a-zA-Z0-9_$]/.test(prevChar) &&
                /[a-zA-Z0-9_$]/.test(nextChar)) {
                result += ' ';
            }
        }
        else {
            result += char;
        }
        lastChar = char;
    }
    // Clean up operators and punctuation
    return result
        .replace(/\s*([+\-*/%=<>!&|^~?:,;{}[\]()])\s*/g, '$1')
        .replace(/\s+/g, ' ')
        .trim();
}
/**
 * Generates a bundled JavaScript file from an entry point
 */
async function generateBundle(projectPath, entryPoint, options = {}) {
    const { minify = true, comments = true, ...dependencyOptions } = options;
    try {
        const entryFilePath = path__namespace.resolve(projectPath, entryPoint);
        const dependencies = await resolveDependencies(entryFilePath, new Set(), {
            ...dependencyOptions,
            baseDir: projectPath
        });
        if (dependencies.size === 0) {
            throw new Error(`No dependencies found for ${entryPoint}`);
        }
        let bundle = '';
        for (const dep of dependencies) {
            const content = await fs__namespace.readFile(dep, 'utf-8');
            const relativePath = path__namespace.relative(projectPath, dep);
            if (comments) {
                bundle += `\n// File: ${relativePath}\n`;
            }
            bundle += `${content}\n`;
        }
        return minify ? minifyBundle(bundle) : bundle;
    }
    catch (err) {
        throw new Error(`Failed to generate bundle from ${entryPoint}: ${err instanceof Error ? err.message : String(err)}`);
    }
}

exports.generateBundle = generateBundle;
exports.minifyBundle = minifyBundle;
exports.resolveDependencies = resolveDependencies;
/*!
 * End of bundle for @obinexuscomputing/aerossr
 */
//# sourceMappingURL=bundler.js.map
