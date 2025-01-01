import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import terser from '@rollup/plugin-terser';
import dts from 'rollup-plugin-dts';
import nodePolyfills from 'rollup-plugin-polyfill-node';
import alias from '@rollup/plugin-alias';
import { resolve as resolvePath } from 'path';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync('./package.json'));
const isProduction = process.env.NODE_ENV === 'production';

// Include all Node.js built-in modules
const builtins = [
  'path', 
  'fs', 
  'http', 
  'crypto', 
  'zlib', 
  'url', 
  'stream', 
  'os', 
  'util',
  'events',
  'buffer'
];

// External dependencies that shouldn't be bundled
const external = [
  ...builtins,
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.peerDependencies || {}),
  /@types\/.*/,  // Exclude all @types packages
];

// Alias configuration for path resolution
const aliasEntries = {
  entries: [
    { find: /^@\/(.*)/, replacement: resolvePath(process.cwd(), 'src/$1') },
    { find: /^@utils\/(.*)/, replacement: resolvePath(process.cwd(), 'src/utils/$1') },
    { find: /^@types\/(.*)/, replacement: resolvePath(process.cwd(), 'src/types/$1') },
    { find: '@', replacement: resolvePath(process.cwd(), 'src') },
    { find: '@utils', replacement: resolvePath(process.cwd(), 'src/utils') },
    { find: '@types', replacement: resolvePath(process.cwd(), 'src/types') }
  ]
};

// Common plugins used across all builds
const commonPlugins = [
  alias(aliasEntries),
  resolve({ 
    preferBuiltins: true,
    extensions: ['.ts', '.js', '.json'],
    resolveOnly: [/^(?!@types).+/]
  }),
  commonjs({
    include: /node_modules/,
    extensions: ['.js', '.ts']
  }),
  json(),
  nodePolyfills(),
  isProduction && terser()
].filter(Boolean);

// TypeScript configuration for different build targets
const createTypescriptPlugin = (outDir, declaration = true, declarationMap = true) => 
  typescript({
    tsconfig: './tsconfig.json',
    outDir,
    declaration,
    declarationMap,
    sourceMap: true,
    exclude: ['**/__tests__/**'],
    include: ['src/**/*'],
    moduleResolution: 'node'
  });

// Input files for all builds
const inputFiles = {
  'index': 'src/index.ts',
  'cli': 'src/cli/index.ts',
  'AeroSSR': 'src/AeroSSR.ts'
};

export default [
  // ESM Build
  {
    input: inputFiles,
    output: {
      dir: 'dist/esm',
      format: 'esm',
      sourcemap: true,
      preserveModules: true,
      preserveModulesRoot: 'src'
    },
    external,
    plugins: [...commonPlugins, createTypescriptPlugin('dist/esm')]
  },

  // CJS Build
  {
    input: inputFiles,
    output: {
      dir: 'dist/cjs',
      format: 'cjs',
      sourcemap: true,
      preserveModules: true,
      preserveModulesRoot: 'src',
      exports: 'named',
      interop: 'auto'
    },
    external,
    plugins: [...commonPlugins, createTypescriptPlugin('dist/cjs')]
  },

  // Type Definitions
  {
    input: inputFiles,
    output: {
      dir: 'dist/types',
      format: 'esm',
      preserveModules: true,
      preserveModulesRoot: 'src'
    },
    external,
    plugins: [
      alias(aliasEntries),
      dts({
        respectExternal: true,
        compilerOptions: {
          baseUrl: '.',
          paths: {
            '@/*': ['src/*'],
            '@utils/*': ['src/utils/*'],
            '@types/*': ['src/types/*']
          }
        }
      })
    ]
  }
];