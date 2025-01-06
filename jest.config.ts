import type { Config } from '@jest/types';
import { defaults as tsjPreset } from 'ts-jest/presets';

const config: Config.InitialOptions = {
  ...tsjPreset,
  preset: 'ts-jest',
  testEnvironment: 'node',
  
  roots: ['<rootDir>/src', '<rootDir>/__tests__'],
  
  testMatch: [
    '**/__tests__/**/*.(test|spec).ts',
    '**/__tests__/**/*.(test|spec).tsx',
    '**/?(*.)+(spec|test).[jt]s?(x)'
  ],
  
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^src/(.*)$': '<rootDir>/src/$1'
  },

  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
    '/.rollup/',
    '/buildcache/'
  ],

  moduleDirectories: ['node_modules', 'src', '__tests__'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  transform: {
    '^.+\\.[tj]sx?$': ['ts-jest', {
      tsconfig: 'tsconfig.test.json',
      diagnostics: { warnOnly: true }
    }]
  },

  collectCoverage: true,
  coverageDirectory: 'coverage',
  coveragePathIgnorePatterns: ['/node_modules/', '/dist/'],
  
  setupFilesAfterEnv: ['<rootDir>/setupTests.ts'],
  
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.test.json',
      isolatedModules: true
    }
  },

  verbose: true,
  testTimeout: 30000,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  projects: undefined,
  modulePathIgnorePatterns: ['<rootDir>/dist/']
};

export default config;