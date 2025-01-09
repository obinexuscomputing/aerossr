import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import terser from '@rollup/plugin-terser';
import alias from '@rollup/plugin-alias';
import { resolve as _resolve } from 'path';
import { readFileSync, copyFileSync } from 'fs';
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
        declaration: true,
        declarationDir: 'dist/esm/types',
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
        declaration: true,
        declarationDir: 'dist/cjs/types',
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
        outDir: 'dist/cli/bin',
      }),
      {
        name: 'ensure-directories',
        async buildStart() {
          await mkdir('dist/cli/bin', { recursive: true });
        }
      },
      {
        name: 'copy-package',
        writeBundle: async () => {
          try {
            await mkdir('dist', { recursive: true });
            copyFileSync('package.json', 'dist/package.json');
            console.log('Copied package.json to dist/');
          } catch (err) {
            console.warn('Failed to copy package.json:', err.message);
          }
        }
      },
      {
        name: 'make-executable',
        async writeBundle() {
          if (process.platform === 'win32') return;

          const files = [
            'dist/cli/bin/index.cjs',
            'dist/cli/bin/index.mjs'
          ];

          for (const file of files) {
            try {
              await chmod(file, '755');
              console.log(`Made ${file} executable`);
            } catch (err) {
              console.warn(`Failed to make ${file} executable:`, err.message);
            }
          }
        }
      }
    ],
  }
];

export default configs;
