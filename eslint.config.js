import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import noUnsanitized from 'eslint-plugin-no-unsanitized';
import sonarjs from 'eslint-plugin-sonarjs';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig(
  { ignores: ['.output/', '.wxt/', 'coverage/', 'node_modules/'] },

  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  sonarjs.configs.recommended,
  noUnsanitized.configs.recommended,

  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.webextensions },
      parserOptions: {
        projectService: { allowDefaultProject: ['*.config.js'] },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Complexity and size limits (see CONTRIBUTING.md)
      complexity: ['error', 10],
      'sonarjs/cognitive-complexity': ['error', 15],
      'max-depth': ['error', 3],
      'max-params': ['error', 4],
      'max-lines-per-function': ['error', { max: 60, skipBlankLines: true, skipComments: true }],
      'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],

      // Type safety and correctness
      '@typescript-eslint/switch-exhaustiveness-check': [
        'error',
        { considerDefaultExhaustiveForUnions: false, requireDefaultForNonUnion: true },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      eqeqeq: ['error', 'always'],
      'no-console': ['error', { allow: ['warn', 'error'] }],

      // Security: the content script runs on every page
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',

      // Style decisions
      'no-restricted-syntax': [
        'error',
        { selector: 'TSEnumDeclaration', message: 'Use a string literal union with `as const`.' },
      ],
    },
  },

  {
    files: ['src/**/*.ts'],
    ignores: ['src/entrypoints/**'],
    rules: {
      'no-restricted-exports': ['error', { restrictDefaultExports: { direct: true } }],
    },
  },

  {
    files: ['**/*.test.ts'],
    rules: {
      'max-lines-per-function': 'off',
      'max-lines': 'off',
      'sonarjs/no-duplicate-string': 'off',
    },
  },

  {
    files: ['tests/e2e/**/*.ts'],
    rules: {
      // SonarJS does not recognize Playwright's expect.poll() as an assertion
      'sonarjs/assertions-in-tests': 'off',
    },
  },

  {
    files: ['**/*.js'],
    extends: [tseslint.configs.disableTypeChecked],
    rules: {
      '@typescript-eslint/explicit-module-boundary-types': 'off',
    },
  },

  prettier,
);
