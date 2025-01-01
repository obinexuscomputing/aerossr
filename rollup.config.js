import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import terser from '@rollup/plugin-terser';
import  dts from 'rollup-plugin-dts';
import nodePolyfills from 'rollup-plugin-polyfill-node';
import alias from '@rollup/plugin-alias';
import { resolve as _resolve } from 'path';
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
    { find: /^@\/(.*)/, replacement: _resolve(process.cwd(), 'src/$1') },
    { find: /^@utils\/(.*)/, replacement: _resolve(process.cwd(), 'src/utils/$1') },
    { find: /^@types\/(.*)/, replacement: _resolve(process.cwd(), 'src/types/$1') },
    { find: '@', replacement: _resolve(process.cwd(), 'src') },
    { find: '@utils', replacement: _resolve(process.cwd(), 'src/utils') },
    { find: '@types', replacement: _resolve(process.cwd(), 'src/types') }
  ]
};

// Common plugins used across all builds
const commonPlugins = [
  alias(aliasEntries),
  typescript({
    tsconfig: './tsconfig.json',
    sourceMap: true
  }),
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
    plugins: commonPlugins
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
    plugins: commonPlugins
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
      dts.default({
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