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
import path from 'path';

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


const createAliasPlugin = () => alias({
  entries: [
    { find: '@', replacement: resolvePath(process.cwd(), 'src') }, // '@' points to 'src'
    { find: '@utils', replacement: resolvePath(process.cwd(), 'src/utils') }, // '@utils' points to 'src/utils'
    { find: '@types', replacement: resolvePath(process.cwd(), 'src/@types') }, // '@types' points to 'src/@types'
  ],
});


const commonPlugins = [
  createAliasPlugin(),
  resolve({
    preferBuiltins: true,
    browser: false
  }),
  commonjs(),
  json(),
  nodePolyfills(),
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

const createTypescriptPlugin = (outDir) =>
  typescript({
    tsconfig: './tsconfig.json',
    declaration: true,
    declarationMap: true,
    declarationDir: `${outDir}/types`,
    rootDir: 'src',
    incremental: true,
    tsBuildInfoFile: `./buildcache/${outDir.replace('dist/', '')}.tsbuildinfo`,
  });

  export default [
    {
      input: 'src/index.ts',
      output: {
        dir: 'dist/esm',
        format: 'esm',
        preserveModules: true,
        sourcemap: true,
        exports: 'named',
      },
      external,
      plugins: [
        ...commonPlugins,
        createTypescriptPlugin('dist/esm'), // Matches Rollup dir
      ],
      watch: {
        clearScreen: false,
        exclude: 'node_modules/**',
      },
    },
    {
      input: 'src/index.ts',
      output: {
        dir: 'dist/cjs',
        format: 'cjs',
        preserveModules: true,
        sourcemap: true,
        entryFileNames: '[name].cjs',
        exports: 'named',
      },
      external,
      plugins: [
        ...commonPlugins,
        createTypescriptPlugin('dist/cjs'), // Matches Rollup dir
      ],
      watch: {
        clearScreen: false,
        exclude: 'node_modules/**',
      },
    },
    {
      input: 'src/index.ts',
      output: {
        dir: 'dist/types',
        format: 'es',
      },
      external,
      plugins: [
        createAliasPlugin(),
        dts({
          respectExternal: true,
          compilerOptions: {
            paths: {
              "@/*": ["src/*"],
              "@utils/*": ["src/utils/*"],
              "@types/*": ["src/@types/*"],
            },
          },
        }),
      ],
    },
  ];
  