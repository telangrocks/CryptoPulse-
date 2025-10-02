// =============================================================================
// ESLint Configuration - Production Ready
// =============================================================================
// Modern ESLint configuration for CryptoPulse backend

const js = require('@eslint/js');

module.exports = [
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        // Node.js globals
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        setImmediate: 'readonly',
        clearImmediate: 'readonly',
        // Jest/Testing globals
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        jest: 'readonly'
      }
    },
    rules: {
      // Error prevention
      'no-console': 'warn',
      'no-debugger': 'error',
      'no-alert': 'error',
      'no-var': 'error',
      'prefer-const': 'error',
      'no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }],

      // Code quality
      'eqeqeq': ['error', 'always'],
      'curly': ['error', 'all'],
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',

      // Security
      'no-caller': 'error',
      'no-eval': 'error',
      'no-extend-native': 'error',
      'no-extra-bind': 'error',
      'no-iterator': 'error',
      'no-lone-blocks': 'error',
      'no-loop-func': 'error',
      'no-new': 'error',
      'no-new-wrappers': 'error',
      'no-octal-escape': 'error',
      'no-proto': 'error',
      'no-return-assign': 'error',
      'no-self-compare': 'error',
      'no-sequences': 'error',
      'no-throw-literal': 'error',
      'no-unused-expressions': 'error',
      'no-useless-call': 'error',
      'no-void': 'error',
      'no-with': 'error',
      'radix': 'error',
      'wrap-iife': ['error', 'any'],
      'yoda': 'error',

      // Prevent usage of deprecated packages
      'no-restricted-imports': ['error', {
        paths: [
          {
            name: 'bcryptjs',
            message: 'Use @node-rs/bcrypt instead of bcryptjs for better performance and security'
          },
          {
            name: 'moment',
            message: 'Use date-fns instead of moment for better performance and tree-shaking'
          },
          {
            name: 'lodash',
            message: 'Use es-toolkit instead of lodash for better performance'
          },
          {
            name: 'uuid',
            message: 'Use crypto.randomUUID() instead of uuid when possible'
          }
        ]
      }],

      // Style
      'indent': ['error', 2],
      'quotes': ['error', 'single'],
      'semi': ['error', 'always'],
      'comma-dangle': ['error', 'never'],
      'no-trailing-spaces': 'error',
      'eol-last': 'error',
      'no-multiple-empty-lines': ['error', { max: 2 }],
      'object-curly-spacing': ['error', 'always'],
      'array-bracket-spacing': ['error', 'never'],
      'computed-property-spacing': ['error', 'never'],
      'space-before-blocks': 'error',
      'keyword-spacing': 'error',
      'space-infix-ops': 'error',
      'space-before-function-paren': ['error', 'never'],
      'space-in-parens': ['error', 'never'],
      'no-spaced-func': 'error',
      'func-call-spacing': ['error', 'never'],
      'no-multi-spaces': 'error',
      'no-mixed-spaces-and-tabs': 'error',
      'no-tabs': 'error'
    }
  },
  {
    files: ['**/*.test.js', '**/tests/**/*.js'],
    rules: {
      'no-console': 'off'
    }
  },
  {
    ignores: [
      'node_modules/**',
      'logs/**',
      '*.log',
      'coverage/**',
      'dist/**',
      'build/**'
    ]
  }
];
