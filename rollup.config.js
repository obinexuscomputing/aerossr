import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import terser from '@rollup/plugin-terser';
import alias from '@rollup/plugin-alias';
import { resolve as _resolve } from 'path';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync('./package.json'));
const isProduction = process.env.NODE_ENV === 'production';

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

const external = [
  'path', 'fs', 'http', 'crypto', 'zlib', 'url', 'stream', 'os', 'util', 'events', 'buffer',
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.peerDependencies || {}),
  /@types\/.*/
];

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
    plugins: [
      alias(aliasEntries),
      typescript({
        tsconfig: './tsconfig.json',
        sourceMap: true
      }),
      resolve({ 
        preferBuiltins: true,
        extensions: ['.ts', '.js', '.json']
      }),
      commonjs(),
      json(),
      isProduction && terser()
    ].filter(Boolean)
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
      exports: 'named'
    },
    external,
    plugins: [
      alias(aliasEntries),
      typescript({
        tsconfig: './tsconfig.json',
        sourceMap: true
      }),
      resolve({ 
        preferBuiltins: true,
        extensions: ['.ts', '.js', '.json']
      }),
      commonjs(),
      json(),
      isProduction && terser()
    ].filter(Boolean)
  }
];
