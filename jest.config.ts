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
    '^src/(.*)$': '<rootDir>/src/$1', // Add direct src mapping
    '\\.txt$': '<rootDir>/__mocks__/fileMock.js',
    '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/__mocks__/fileMock.js'
  },
  moduleDirectories: ['node_modules', 'src'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  // Transform configuration
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.test.json',
        diagnostics: {
          warnOnly: true,
          ignoreCodes: [151001]
        }
      }
    ]
  },

  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/types/**',
    '!**/*.test.ts',
    '!**/*.spec.ts',
    '!**/node_modules/**',
    '!dist/**',
    '!coverage/**'
  ],
  coverageReporters: ['text', 'lcov', 'clover', 'html'],
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80
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
      isolatedModules: true
    }
  },

  // Miscellaneous options
  verbose: true,
  testTimeout: 30000,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  errorOnDeprecated: true,
  notify: true,

  // Important: Add these to fix path resolution
  modulePaths: ['<rootDir>'],
  rootDir: './',
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
  
  // Add resolver for ts-jest
  resolver: 'ts-jest-resolver'
};

export default config;