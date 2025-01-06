import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import terser from '@rollup/plugin-terser';
import alias from '@rollup/plugin-alias';
import copy from 'rollup-plugin-copy';
import { resolve as _resolve } from 'path';
import { readFileSync } from 'fs';
import { mkdir, chmod } from 'fs/promises';

const pkg = JSON.parse(readFileSync('./package.json'));
const isProduction = process.env.NODE_ENV === 'production';
const banner = `/*!\n  @obinexuscomputing/aerossr v${pkg.version}\n  (c) ${new Date().getFullYear()} OBINexus Computing\n  Released under the ISC License\n */`;

const aliasEntries = {
  entries: [
    { find: /^@\/(.*)/, replacement: _resolve(process.cwd(), 'src/$1') },
    { find: '@', replacement: _resolve(process.cwd(), 'src') },
  ],
};

const external = [
  'path', 'fs', 'http', 'crypto', 'zlib', 'url', 'stream', 'os', 'util', 'events', 'buffer', 'commander',
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.peerDependencies || {}),
];

const basePlugins = [
  alias(aliasEntries),
  resolve(),
  commonjs(),
  json(),
  isProduction && terser(),
].filter(Boolean);

const configs = [
  {
    input: 'src/index.ts',
    output: {
      dir: 'dist/esm',
      format: 'esm',
      sourcemap: true,
      preserveModules: true,
      preserveModulesRoot: 'src',
      exports: 'named',
      banner,
    },
    external,
    plugins: [
      ...basePlugins,
      typescript({
        tsconfig: './tsconfig.json',
        outDir: 'dist/esm',
      }),
    ],
  },
  {
    input: 'src/index.ts',
    output: {
      dir: 'dist/cjs',
      format: 'cjs',
      sourcemap: true,
      preserveModules: true,
      preserveModulesRoot: 'src',
      exports: 'named',
      banner,
    },
    external,
    plugins: [
      ...basePlugins,
      typescript({
        tsconfig: './tsconfig.json',
        outDir: 'dist/cjs',
      }),
    ],
  },
  {
    input: 'src/cli/index.ts',
    output: [
      {
        file: 'dist/cli/bin/index.cjs',
        format: 'cjs',
        sourcemap: true,
        exports: 'named',
        banner: '#!/usr/bin/env node\n',
      },
      {
        file: 'dist/cli/bin/index.mjs',
        format: 'esm',
        sourcemap: true,
        exports: 'named',
        banner: '#!/usr/bin/env node\n',
      }
    ],
    external,
    plugins: [
      ...basePlugins,
      typescript({
        tsconfig: './tsconfig.json',
        declaration: true,
        declarationDir: 'dist/cli/bin/types',
      }),
      {
        name: 'ensure-directories',
        async buildStart() {
          await mkdir('dist/cli/bin', { recursive: true });
        }
      },
      copy({
        targets: [{ src: 'package.json', dest: 'dist' }],
        hook: 'writeBundle',
        flatten: false
      }),
      {
        name: 'make-executable',
        async writeBundle() {
          if (process.platform === 'win32') return;
          try {
            await chmod('dist/cli/bin/index.cjs', '755');
            await chmod('dist/cli/bin/index.mjs', '755');
            console.log('Made CLI files executable');
          } catch (err) {
            console.warn('Failed to make CLI files executable:', err);
          }
        }
      }
    ],
  }
];

export default configs;