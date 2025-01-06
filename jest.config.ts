import type { Config } from '@jest/types';
import { defaults as tsjPreset } from 'ts-jest/presets';

const config: Config.InitialOptions = {
  ...tsjPreset,
  preset: 'ts-jest',
  testEnvironment: 'node',
  
  roots: ['<rootDir>/src', '<rootDir>/__tests__'],
  
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.spec.ts'
  ],
  
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^src/(.*)$': '<rootDir>/src/$1',
    '\\.txt$': '<rootDir>/__mocks__/fileMock.js',
    '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/__mocks__/fileMock.js'
  },

  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/coverage/', '/.rollup/', '/buildcache/'],
  moduleDirectories: ['node_modules', 'src'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node','test.ts'],

  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.test.json',
      diagnostics: { 
        warnOnly: true,
        ignoreCodes: [151001]
      }
    }]
  },

  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/types/**',
    '!**/*.test.ts',
    '!**/*.spec.ts'
  ],
  
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80
    }
  },

  setupFilesAfterEnv: ['<rootDir>/setupTests.ts'],

  globals: {
    'ts-jest': {
      isolatedModules: true
    }
  },

  verbose: true,
  testTimeout: 30000,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  
  modulePaths: ['<rootDir>'],
  rootDir: './',
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
  resolver: 'ts-jest-resolver',

  // Project-specific settings
  projects: [
    {
      displayName: 'node',
      testEnvironment: 'node',
      testMatch: ['**/__tests__/**/*.node.test.ts']
    },
    {
      displayName: 'jsdom',
      testEnvironment: 'jsdom',
      testMatch: ['**/__tests__/**/*.dom.test.ts'],
      testEnvironmentOptions: {
        url: 'http://localhost'
      }
    }
  ]
};

export default config;