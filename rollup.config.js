import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import terser from '@rollup/plugin-terser';
import dts from 'rollup-plugin-dts';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync('./package.json'));

const external = [
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.peerDependencies || {}),
  'path',
  'fs',
  'http',
  'crypto',
  'zlib',
  'util'
];

const plugins = [
  resolve({
    preferBuiltins: true,
  }),
  commonjs(),
  json(),
  typescript({
    tsconfig: './tsconfig.build.json',
    declaration: false,
  }),
];

export default [
  {
    input: 'src/index.ts',
    output: [
      {
        file: pkg.module || 'dist/esm/index.js',
        format: 'esm',
        sourcemap: true,
      },
    ],
    external,
    plugins,
  },
  {
    input: 'src/index.ts',
    output: [
      {
        file: pkg.main || 'dist/cjs/index.js',
        format: 'cjs',
        sourcemap: true,
      },
    ],
    external,
    plugins,
  },
  {
    input: 'src/index.ts',
    output: [
      {
        file: 'dist/umd/index.js',
        format: 'umd',
        name: 'AeroSSR',
        sourcemap: true,
        globals: {
          path: 'path',
          fs: 'fs',
          http: 'http',
          crypto: 'crypto',
          zlib: 'zlib',
          util: 'util',
        },
      },
    ],
    external,
    plugins: [...plugins, terser()],
  },
  {
    input: 'src/index.ts',
    output: [{ file: 'dist/types/index.d.ts', format: 'es' }],
    plugins: [dts()],
  },
];