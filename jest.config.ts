// jest.config.ts
import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  roots: ['<rootDir>/src', '<rootDir>/__tests__'],
  
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.spec.ts',
    '**/__tests__/**/*.node.test.ts',
    '**/__tests__/**/*.dom.test.ts'
  ],
  
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },

  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.test.json'
    }]
  },

  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],

  collectCoverage: true,
  coverageDirectory: 'coverage',
  
  verbose: true,
  clearMocks: true,
  resetMocks: true,

  projects: [
    {
      displayName: 'node',
      testEnvironment: 'node',
      testMatch: ['**/__tests__/**/*.node.test.ts']
    },
    {
      displayName: 'dom',
      testEnvironment: 'jsdom',
      testMatch: ['**/__tests__/**/*.dom.test.ts']
    }
  ]
};

export default config;