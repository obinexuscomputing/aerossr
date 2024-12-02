import fs from 'fs/promises';
import path from 'path';
export async function resolveDependencies(filePath, deps = new Set()) {
    if (deps.has(filePath))
        return deps;
    deps.add(filePath);
    const content = await fs.readFile(filePath, 'utf-8');
    const importMatches = content.match(/(?:require|import)\s*\(['"]([^'"]+)['"]\)/g);
    if (importMatches) {
        for (const match of importMatches) {
            const depPath = match.match(/['"]([^'"]+)['"]/)?.[1];
            if (depPath) {
                const fullPath = path.resolve(path.dirname(filePath), depPath);
                if (fullPath.endsWith('.js') || fullPath.endsWith('.ts')) {
                    await resolveDependencies(fullPath, deps);
                }
            }
        }
    }
    return deps;
}
export function minifyBundle(code) {
    return code
        .replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '') // Remove comments
        .replace(/\s+/g, ' ') // Reduce multiple spaces to single space
        .replace(/^\s+|\s+$/gm, ''); // Trim line starts and ends
}
export async function generateBundle(projectPath, entryPoint) {
    const entryFilePath = path.join(projectPath, entryPoint);
    const dependencies = await resolveDependencies(entryFilePath);
    let bundle = '';
    for (const dep of dependencies) {
        const content = await fs.readFile(dep, 'utf-8');
        bundle += `\n// File: ${path.relative(projectPath, dep)}\n${content}\n`;
    }
    return minifyBundle(bundle);
}
//# sourceMappingURL=bundler.js.map