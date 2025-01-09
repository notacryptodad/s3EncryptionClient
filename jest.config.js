module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/tests/integration/'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  }
};