// jest.config.ts
import type { Config } from '@jest/types';
import { defaults as tsjPreset } from 'ts-jest/presets';
import { resolve } from 'path';

const config: Config.InitialOptions = {
  // Use ts-jest for TypeScript files
  ...tsjPreset,
  preset: 'ts-jest',
  testEnvironment: 'node',

  // Root directories for test discovery
  roots: [
    '<rootDir>/src',
    '<rootDir>/__tests__'
  ],

  // Test patterns
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.spec.ts'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
    '/.rollup/',
    '/buildcache/'
  ],

  // Module resolution
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1',
    '^@middlewares/(.*)$': '<rootDir>/src/middlewares/$1',
    '^@cli/(.*)$': '<rootDir>/src/cli/$1'
  },
  moduleDirectories: ['node_modules', 'src'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  // Transform configuration
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: resolve(__dirname, './tsconfig.test.json'),
      diagnostics: {
        warnOnly: true
      }
    }]
  },

  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage',
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/types/**',
    '!src/**/index.ts',
    '!**/node_modules/**'
  ],
  coverageReporters: ['text', 'lcov', 'clover', 'html'],
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80
    },
    './src/core/': {
      statements: 90,
      branches: 85,
      functions: 90,
      lines: 90
    }
  },

  // Setup and teardown
  setupFilesAfterEnv: [
    '<rootDir>/setupTests.ts'
  ],

  // Environment configuration
  testEnvironmentOptions: {
    url: 'http://localhost'
  },

  // Global configuration
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.test.json',
      diagnostics: false
    }
  },

  // Miscellaneous options
  verbose: true,
  testTimeout: 10000,
  maxConcurrency: 5,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  errorOnDeprecated: true,
  notify: true
};

export default config;