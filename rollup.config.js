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

// Node.js built-ins and their namespaces
const builtins = [
  'path',
  'fs',
  'fs/promises',
  'http',
  'crypto',
  'zlib',
  'util',
  'url',
  'stream',
  'events',
  'os'
];

// External dependencies
const external = [
  ...builtins,
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.peerDependencies || {}),
  ...Object.keys(pkg.optionalDependencies || {})
];

// Path alias configuration
const createAliasPlugin = () => alias({
  entries: [
    { find: '@', replacement: resolvePath(process.cwd(), 'src') },
    { find: '@utils', replacement: resolvePath(process.cwd(), 'src/utils') },
    { find: '@types', replacement: resolvePath(process.cwd(), 'src/types') }
  ]
});

// Common build plugins
const commonPlugins = [
  createAliasPlugin(),
  resolve({
    preferBuiltins: true,
    browser: false,
    extensions: ['.ts', '.js', '.json']
  }),
  commonjs({
    transformMixedEsModules: true,
    include: /node_modules/
  }),
  json(),
  nodePolyfills({
    include: null
  }),
  isProduction && terser({
    compress: {
      drop_console: true,
      pure_funcs: ['console.log'],
      passes: 2,
      drop_debugger: true
    },
    format: {
      comments: false,
      ecma: 2020
    },
    mangle: true
  })
].filter(Boolean);

// TypeScript configuration for different build targets
const createTypescriptPlugin = (outDir) => typescript({
  tsconfig: './tsconfig.json',
  outDir,
  declaration: false,
  declarationMap: false,
  rootDir: 'src',
  incremental: true,
  tsBuildInfoFile: `./buildcache/${outDir.replace('dist/', '')}.tsbuildinfo`,
  outputToFilesystem: true,
  sourceMap: true,
  inlineSources: true
});

export default [
  // ESM build
  {
    input: ['src/index.ts', 'src/cli/index.ts', 'src/AeroSSR.ts'],
    output: {
      dir: 'dist/esm',
      format: 'esm',
      preserveModules: true,
      sourcemap: true,
      exports: 'named',
      generatedCode: {
        constBindings: true
      }
    },
    external,
    plugins: [
      ...commonPlugins,
      createTypescriptPlugin('dist/esm'),
    ],
    treeshake: {
      moduleSideEffects: false,
      propertyReadSideEffects: false
    }
  },
  // CJS build
  {
    input: ['src/index.ts', 'src/cli/index.ts', 'src/AeroSSR.ts'],
    output: {
      dir: 'dist/cjs',
      format: 'cjs',
      preserveModules: true,
      sourcemap: true,
      entryFileNames: '[name].cjs',
      exports: 'named',
      generatedCode: {
        constBindings: true
      }
    },
    external,
    plugins: [
      ...commonPlugins,
      createTypescriptPlugin('dist/cjs'),
    ],
    treeshake: {
      moduleSideEffects: false,
      propertyReadSideEffects: false
    }
  },
  // Type definitions
  {
    input: ['src/index.ts', 'src/cli/index.ts', 'src/AeroSSR.ts'],
    output: [
      {
        dir: 'dist/types',
        format: 'es',
        preserveModules: true
      }
    ],
    external,
    plugins: [
      dts({
        respectExternal: true,
        compilerOptions: {
          baseUrl: '.',
          paths: {
            "@/*": ["src/*"],
            "@utils/*": ["src/utils/*"],
            "@types/*": ["src/types/*"]
          }
        }
      })
    ]
  }
];
