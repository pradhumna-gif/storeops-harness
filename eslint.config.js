const tseslint = require('@typescript-eslint/eslint-plugin');
const parser = require('@typescript-eslint/parser');
const prettier = require('eslint-config-prettier');

module.exports = [
  { ignores: ['dist/**', 'coverage/**', 'node_modules/**'] },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser,
      parserOptions: { project: './tsconfig.json', sourceType: 'module' }
    },
    plugins: { '@typescript-eslint': tseslint },
    rules: {
      ...tseslint.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': 'warn'
    }
  },
  prettier
];
