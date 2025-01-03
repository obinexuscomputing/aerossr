import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import terser from '@rollup/plugin-terser';
import alias from '@rollup/plugin-alias';
import copy from 'rollup-plugin-copy';
import { resolve as _resolve } from 'path';
import { readFileSync, chmodSync } from 'fs';

const pkg = JSON.parse(readFileSync('./package.json'));
const isProduction = process.env.NODE_ENV === 'production';

const banner = `/*!\n * @obinexuscomputing/aerossr v${pkg.version}\n * (c) ${new Date().getFullYear()} OBINexus Computing\n * Released under the ISC License\n */`;

const footer = `/*!\n * End of bundle for @obinexuscomputing/aerossr\n */`;

const aliasEntries = {
  entries: [
    { find: /^@\/(.*)/, replacement: _resolve(process.cwd(), 'src/$1') },
    { find: '@', replacement: _resolve(process.cwd(), 'src') },
  ],
};

const external = [
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
  'buffer',
  'commander',
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
  // ESM Build
  {
    input: 'src/index.ts',
    output: {
      dir: 'dist/esm',
      format: 'esm',
      sourcemap: true,
      preserveModules: true,
      preserveModulesRoot: 'src',
      banner,
      footer,
    },
    external,
    plugins: [
      ...basePlugins,
      typescript({
        tsconfig: './tsconfig.json',
        outDir: 'dist/esm',
        outputToFilesystem: false,
      }),
    ],
  },
  // CJS Build
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
      footer,
    },
    external,
    plugins: [
      ...basePlugins,
      typescript({
        tsconfig: './tsconfig.json',
        outDir: 'dist/cjs',
        outputToFilesystem: false,
      }),
    ],
  },
  // CLI Build
{
  input: 'src/cli/index.ts',
  output: [
    {
      format: 'cjs',
      sourcemap: true,
      banner: '#!/usr/bin/env node\n',
      file: 'dist/cli/bin/index.cjs',
    },
    {
      format: 'esm',
      sourcemap: true,
      banner: '#!/usr/bin/env node\n',
      file: 'dist/cli/bin/index.mjs',
    },
  ],
  
  external,
  plugins: [
    ...basePlugins,
    typescript({
      tsconfig: './tsconfig.json',
      declaration: true,
      declarationMap: true,
      sourceMap: true,
      outputToFilesystem: true,
      outDir: 'dist/cli/bin', // Ensure this is a valid directory
      declarationDir: 'dist/cli/bin/types', // Explicitly set declaration directory
    })
    ,
    
    {
      name: 'log-output',
      writeBundle(options, bundle) {
        console.log('Bundle:', bundle);
      },

    },
    copy({
      targets: [{ src: './package.json', dest: 'dist/' }], // Match the correct destination
      hook: 'writeBundle',
    }),
    
  ],
},

];

export default configs;
