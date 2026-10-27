// @ts-check
import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import angular from 'angular-eslint';
import prettier from 'eslint-config-prettier/flat';

export default defineConfig([
  // 1. Never lint build output or caches.
  {
    ignores: ['**/dist', '**/.angular', '**/coverage'],
  },

  // 2. Plain JS rules + TypeScript rules, for every .ts file (client and server).
  {
    files: ['**/*.ts'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
  },

  // 3a. Angular rules for component/service code.
  {
    files: ['client/**/*.ts'],
    extends: [angular.configs.tsRecommended],
    // Lets ESLint also check templates written inline in @Component({ template: ... }).
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'app', style: 'camelCase' },
      ],
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: 'app', style: 'kebab-case' },
      ],
    },
  },

  // 3b. Angular rules for HTML templates, including accessibility checks.
  {
    files: ['client/**/*.html'],
    extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
  },

  // 4. Must be last: turns off every formatting rule above, so Prettier alone owns formatting.
  prettier,
]);
