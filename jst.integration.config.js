module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testMatch: ['**/integration/**/*.test.ts'],
    transform: {
      '^.+\\.tsx?$': 'ts-jest'
    }
  };