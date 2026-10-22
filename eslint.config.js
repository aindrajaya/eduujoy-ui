import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist*', 'coverage', '.lighthouseci', 'playwright-report', 'test-results', 'src/api/schema.d.ts'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.strictTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['error', { allowConstantExport: true }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      // React Router loaders throw redirect()/Response objects by design.
      '@typescript-eslint/only-throw-error': ['error', { allow: [{ from: 'lib', name: 'Response' }] }],
      'no-restricted-syntax': [
        'error',
        {
          selector: "MemberExpression[object.name=/^(localStorage|sessionStorage)$/]",
          message: 'No session data in browser storage (PRD-UI §6); use lib/storage for drafts.',
        },
        {
          selector: "MemberExpression[property.name=/^(localStorage|sessionStorage)$/]",
          message: 'No session data in browser storage (PRD-UI §6); use lib/storage for drafts.',
        },
      ],
    },
  },
  {
    // PRD-UI §5: only src/api talks HTTP; features call endpoint functions through queries.ts hooks.
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/api/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [{ name: 'axios', message: 'Use the endpoint functions in src/api/endpoints.' }],
          patterns: [
            { group: ['@/api/client', '**/api/client'], message: 'Use src/api/endpoints instead.' },
            { group: ['@/api/http', '**/api/http'], message: 'Use src/api/endpoints instead.' },
          ],
        },
      ],
    },
  },
  {
    // Sanctioned browser storage: quiz drafts (PRD-UI §7) and the checkout baseline (plan and credit
    // counts, no session data); tests may inspect it.
    files: ['src/lib/storage.ts', 'src/features/billing/checkoutBaseline.ts', '**/*.test.{ts,tsx}', 'e2e/**'],
    rules: { 'no-restricted-syntax': 'off' },
  },
  {
    files: ['**/*.test.{ts,tsx}', 'src/test/**'],
    rules: { '@typescript-eslint/no-non-null-assertion': 'off' },
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    extends: [js.configs.recommended],
    languageOptions: { ecmaVersion: 2022, sourceType: 'module', globals: globals.node },
  },
);
