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

const builtins = ['path', 'fs', 'http', 'crypto', 'zlib', 'url', 'stream', 'os'];

const external = [
  ...builtins,
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.peerDependencies || {})
];

const commonPlugins = [
  alias({
    entries: [
      { find: '@', replacement: resolvePath(process.cwd(), 'src') }
    ]
  }),
  resolve({ preferBuiltins: true }),
  commonjs(),
  json(),
  nodePolyfills(),
  isProduction && terser()
].filter(Boolean);

const createTypescriptPlugin = (outDir) => typescript({
  tsconfig: './tsconfig.json',
  outDir,
  declaration: false,
  sourceMap: true
});

export default [
  {
    input: ['src/index.ts', 'src/cli/index.ts', 'src/AeroSSR.ts'],
    output: {
      dir: 'dist/esm',
      format: 'esm',
      sourcemap: true
    },
    external,
    plugins: [...commonPlugins, createTypescriptPlugin('dist/esm')]
  },
  {
    input: ['src/index.ts', 'src/cli/index.ts', 'src/AeroSSR.ts'],
    output: {
      dir: 'dist/cjs',
      format: 'cjs',
      sourcemap: true
    },
    external,
    plugins: [...commonPlugins, createTypescriptPlugin('dist/cjs')]
  },
  {
    input: ['src/index.ts', 'src/cli/index.ts', 'src/AeroSSR.ts'],
    output: {
      dir: 'dist/types',
      format: 'es'
    },
    external,
    plugins: [
      dts({
        respectExternal: true
      })
    ]
  }
];
