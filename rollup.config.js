import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import terser from '@rollup/plugin-terser';
import dts from 'rollup-plugin-dts';
import nodePolyfills from 'rollup-plugin-polyfill-node';
import analyze from 'rollup-plugin-analyzer';
import filesize from 'rollup-plugin-filesize';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync('./package.json'));
const isProduction = process.env.NODE_ENV === 'production';

const builtins = [
  'path', 'fs', 'http', 'crypto', 'zlib', 'util', 'url', 'fs/promises'
];

const external = [
  ...builtins,
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.peerDependencies || {})
];

const createTypescriptPlugin = (outDir) => typescript({
  tsconfig: './tsconfig.build.json',
  declaration: true,
  declarationMap: true,
  outDir,
  rootDir: 'src',
  incremental: true,
  tsBuildInfoFile: `./buildcache/${outDir.replace('dist/', '')}.tsbuildinfo`
});

const commonPlugins = [
  resolve({ 
    preferBuiltins: true,
    browser: false
  }),
  commonjs(),
  json(),
  nodePolyfills(),
  analyze({ 
    summaryOnly: true,
    limit: 10
  }),
  filesize(),
  isProduction && terser({
    compress: {
      drop_console: true,
      pure_funcs: ['console.log'],
      passes: 2
    },
    format: {
      comments: false
    }
  })
].filter(Boolean);

export default defineConfig([
  // ESM build
  {
    input: 'src/index.ts',
    output: {
      dir: 'dist/esm',
      format: 'esm',
      preserveModules: true,
      sourcemap: true,
      exports: 'named',
      manualChunks: {
        'vendor': external,
        'utils': ['src/utils/*']
      }
    },
    external,
    plugins: [
      createTypescriptPlugin('dist/esm'),
      ...commonPlugins
    ],
    watch: {
      clearScreen: false,
      exclude: 'node_modules/**'
    }
  },

  // CJS build
  {
    input: 'src/index.ts',
    output: {
      dir: 'dist/cjs',
      format: 'cjs',
      preserveModules: true,
      sourcemap: true,
      exports: 'named',
      manualChunks: {
        'vendor': external,
        'utils': ['src/utils/*']
      }
    },
    external,
    plugins: [
      createTypescriptPlugin('dist/cjs'),
      ...commonPlugins
    ],
    watch: {
      clearScreen: false,
      exclude: 'node_modules/**'
    }
  },

  // Types build
  {
    input: 'src/index.ts',
    output: [{ 
      file: 'dist/types/index.d.ts', 
      format: 'es' 
    }],
    external,
    plugins: [dts()],
    watch: {
      clearScreen: false,
      exclude: 'node_modules/**'
    }
  }
], {
  cache: true,
  perf: true
});