'use strict';

const fs = require('fs/promises');
const path = require('path');

function _interopNamespaceDefault(e) {
    const n = Object.create(null);
    if (e) {
        for (const k in e) {
            if (k !== 'default') {
                const d = Object.getOwnPropertyDescriptor(e, k);
                Object.defineProperty(n, k, d.get ? d : {
                    enumerable: true,
                    get: function () { return e[k]; }
                });
            }
        }
    }
    n.default = e;
    return Object.freeze(n);
}

const fs__namespace = /*#__PURE__*/_interopNamespaceDefault(fs);
const path__namespace = /*#__PURE__*/_interopNamespaceDefault(path);

async function resolveDependencies(filePath, deps = new Set()) {
    if (deps.has(filePath))
        return deps;
    deps.add(filePath);
    const content = await fs__namespace.readFile(filePath, 'utf-8');
    const importMatches = content.match(/(?:require|import)\s*\(['"]([^'"]+)['"]\)/g);
    if (importMatches) {
        for (const match of importMatches) {
            const depPath = match.match(/['"]([^'"]+)['"]/)?.[1];
            if (depPath) {
                const fullPath = path__namespace.resolve(path__namespace.dirname(filePath), depPath);
                if (fullPath.endsWith('.js') || fullPath.endsWith('.ts')) {
                    await resolveDependencies(fullPath, deps);
                }
            }
        }
    }
    return deps;
}
function minifyBundle(code) {
    return code
        .replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '') // Remove comments
        .replace(/\s+/g, ' ') // Reduce multiple spaces to single space
        .replace(/^\s+|\s+$/gm, ''); // Trim line starts and ends
}
async function generateBundle(projectPath, entryPoint) {
    const entryFilePath = path__namespace.join(projectPath, entryPoint);
    const dependencies = await resolveDependencies(entryFilePath);
    let bundle = '';
    for (const dep of dependencies) {
        const content = await fs__namespace.readFile(dep, 'utf-8');
        bundle += `\n// File: ${path__namespace.relative(projectPath, dep)}\n${content}\n`;
    }
    return minifyBundle(bundle);
}

exports.generateBundle = generateBundle;
exports.minifyBundle = minifyBundle;
exports.resolveDependencies = resolveDependencies;
//# sourceMappingURL=bundler.cjs.map
