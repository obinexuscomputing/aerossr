"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateBundle = exports.minifyBundle = exports.resolveDependencies = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
async function resolveDependencies(filePath, deps = new Set()) {
    if (deps.has(filePath))
        return deps;
    deps.add(filePath);
    const content = await promises_1.default.readFile(filePath, 'utf-8');
    const importMatches = content.match(/(?:require|import)\s*\(['"]([^'"]+)['"]\)/g);
    if (importMatches) {
        for (const match of importMatches) {
            const depPath = match.match(/['"]([^'"]+)['"]/)?.[1];
            if (depPath) {
                const fullPath = path_1.default.resolve(path_1.default.dirname(filePath), depPath);
                if (fullPath.endsWith('.js') || fullPath.endsWith('.ts')) {
                    await resolveDependencies(fullPath, deps);
                }
            }
        }
    }
    return deps;
}
exports.resolveDependencies = resolveDependencies;
function minifyBundle(code) {
    return code
        .replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '') // Remove comments
        .replace(/\s+/g, ' ') // Reduce multiple spaces to single space
        .replace(/^\s+|\s+$/gm, ''); // Trim line starts and ends
}
exports.minifyBundle = minifyBundle;
async function generateBundle(projectPath, entryPoint) {
    const entryFilePath = path_1.default.join(projectPath, entryPoint);
    const dependencies = await resolveDependencies(entryFilePath);
    let bundle = '';
    for (const dep of dependencies) {
        const content = await promises_1.default.readFile(dep, 'utf-8');
        bundle += `\n// File: ${path_1.default.relative(projectPath, dep)}\n${content}\n`;
    }
    return minifyBundle(bundle);
}
exports.generateBundle = generateBundle;
//# sourceMappingURL=bundler.js.map