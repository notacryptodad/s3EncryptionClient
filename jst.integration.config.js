require('dotenv').config();

module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testMatch: ['**/tests/integration/**/*.integration.test.ts'],
    setupFiles: ['dotenv/config'],
    testTimeout: 30000
};