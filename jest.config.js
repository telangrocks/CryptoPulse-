module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@config/(.*)$': '<rootDir>/backend/config/$1',
    '^@database/(.*)$': '<rootDir>/backend/database/$1',
    '^@routes/(.*)$': '<rootDir>/backend/routes/$1',
    '^@tests/(.*)$': '<rootDir>/backend/tests/$1',
    '^@utils/(.*)$': '<rootDir>/backend/$1'
  },
  coverageDirectory: '<rootDir>/coverage',
  collectCoverageFrom: ['<rootDir>/backend/**/*.ts'],
  watchPlugins: []
};