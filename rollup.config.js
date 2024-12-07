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

const createTypescriptPlugin = (outDir) => typescript({
  tsconfig: './tsconfig.json',
  declaration: true,
  declarationMap: true,
  outDir,
  rootDir: 'src',
  declarationDir: path.join(outDir, 'types'),
  incremental: true,
  tsBuildInfoFile: `./buildcache/${outDir.replace('dist/', '')}.tsbuildinfo`,
  outputToFilesystem: true
});

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

export default [
  {
    input: 'src/index.ts',
    output: {
      dir: 'dist/esm', // Matches TypeScript's `outDir`
      format: 'esm',
      preserveModules: true,
      sourcemap: true,
      exports: 'named'
    },
    external,
    plugins: [
      typescript({
        tsconfig: './tsconfig.json',
        outDir: 'dist/esm' // Explicitly set to align with Rollup
      }),
      ...commonPlugins
    ]
  
,  
    watch: {
      clearScreen: false,
      exclude: 'node_modules/**'
    }
  },
  {
    input: 'src/index.ts',
    output: {
      dir: 'dist/cjs', // Matches Rollup's `dir`
      format: 'cjs',
      preserveModules: true,
      sourcemap: true,
      exports: 'named'
    },
    external,
    plugins: [
      typescript({
        tsconfig: './tsconfig.json',
        outDir: 'dist/cjs' // Explicitly set to align with Rollup
      }),
      ...commonPlugins
    ],
    watch: {
      clearScreen: false,
      exclude: 'node_modules/**'
    }
  },
  {
    input: 'src/index.ts',
    output: {
      format: 'es',
      preserveModules: true,
      dir: 'dist/types',
      format: 'es'
    },
    external,
    plugins: [
      createAliasPlugin(),
  typescript({
    tsconfig: './tsconfig.json'
  }),
  dts({
    respectExternal: true,
    
    compilerOptions: {
      declarationDir: 'dist/types',
      paths: {
        "@/*": ["src/*"],
        "@utils/*": ["src/utils/*"],
        "@types/*": ["src/@types/*"]
      }
    }
  })
    ]
  }
  
];
