import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import terser from '@rollup/plugin-terser';
import alias from '@rollup/plugin-alias';
import { resolve as _resolve } from 'path';
import { readFileSync, chmodSync } from 'fs';

const pkg = JSON.parse(readFileSync('./package.json'));
const isProduction = process.env.NODE_ENV === 'production';

const aliasEntries = {
  entries: [
    { find: /^@\/(.*)/, replacement: _resolve(process.cwd(), 'src/$1') },
    { find: '@', replacement: _resolve(process.cwd(), 'src') }
  ]
};

const external = [
  'path', 'fs', 'http', 'crypto', 'zlib', 'url', 'stream', 'os', 'util', 'events', 'buffer',
  'commander',
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.peerDependencies || {})
];

const configs = [
  {
    input: 'src/index.ts',
    output: {
      dir: 'dist/esm',
      format: 'esm',
      sourcemap: true,
      preserveModules: true,
      preserveModulesRoot: 'src'
    },
    external,
    plugins: [
      alias(aliasEntries),
      typescript({
        tsconfig: './tsconfig.json',
        outDir: 'dist/esm'
      }),
      resolve(),
      commonjs(),
      json(),
      isProduction && terser()
    ].filter(Boolean)
  },
  {
    input: 'src/index.ts', 
    output: {
      dir: 'dist/cjs',
      format: 'cjs',
      exports: 'named',
      sourcemap: true,
      preserveModules: true,
      preserveModulesRoot: 'src'
    },
    external,
    plugins: [
      alias(aliasEntries),
      typescript({
        tsconfig: './tsconfig.json',
        outDir: 'dist/cjs'
      }),
      resolve(),
      commonjs(),
      json(),
      isProduction && terser()
    ].filter(Boolean)
  },
  {
    input: 'src/cli/index.ts',
    output: {
      file: 'dist/cli/index.js',
      format: 'commonjs',
      banner: '#!/usr/bin/env node',
      sourcemap: true
    },
    external,
    plugins: [
      alias(aliasEntries),
      typescript({
        tsconfig: './tsconfig.json'
      }),
      resolve(),
      commonjs(),
      json(),
      isProduction && terser(),
      {
        name: 'make-executable',
        writeBundle() {
          chmodSync('dist/cli/index.js', 0o755);
        }
      }
    ].filter(Boolean)
  }
];

export default configs;