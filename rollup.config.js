import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import terser from '@rollup/plugin-terser';
import dts from 'rollup-plugin-dts';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync('./package.json'));

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
  rootDir: 'src'
});

export default [
  {
    input: 'src/index.ts',
    output: {
      dir: 'dist/esm',
      format: 'esm',
      preserveModules: true,
      sourcemap: true,
      exports: 'named'
    },
    external,
    plugins: [
      resolve({ preferBuiltins: true, browser: false }),
      commonjs(),
      json(),
      createTypescriptPlugin('dist/esm'),
    ],
  },
  {
    input: 'src/index.ts',
    output: {
      dir: 'dist/cjs',
      format: 'cjs',
      preserveModules: true,
      sourcemap: true,
      exports: 'named'
    },
    external,
    plugins: [
      resolve({ preferBuiltins: true, browser: false }),
      commonjs(),
      json(),
      createTypescriptPlugin('dist/cjs'),
    ],
  },
  {
    input: 'src/index.ts',
    output: [{ file: 'dist/types/index.d.ts', format: 'es' }],
    external,
    plugins: [dts()],
  }
];