// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // Base JS recommended rules
  eslint.configs.recommended,

  // TypeScript strict + stylistic (type-checked) — Rust-level strictness.
  // Requires type information from tsconfig.json.
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  // Project-wide settings
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // Rust-level overrides: ban escape hatches entirely
  {
    rules: {
      // ── No type escape hatches ──────────────────────────────────
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',

      // ── No `as` type assertions (use type guards / satisfies instead) ──
      '@typescript-eslint/consistent-type-assertions': ['error', {
        assertionStyle: 'never',
      }],

      // ── No non-null assertions (x!) ─────────────────────────────
      '@typescript-eslint/no-non-null-assertion': 'error',

      // ── Require explicit return types on functions ──────────────
      '@typescript-eslint/explicit-function-return-type': ['error', {
        allowExpressions: true,          // allow inline arrow callbacks
        allowTypedFunctionExpressions: true,
      }],

      // ── Require exhaustive switch/if-else ───────────────────────
      '@typescript-eslint/switch-exhaustiveness-check': 'error',

      // ── Prefer nullish coalescing over || for nullable values ───
      '@typescript-eslint/prefer-nullish-coalescing': 'error',

      // ── No floating (unhandled) promises ────────────────────────
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',

      // ── Strict boolean expressions (no truthy checks on non-booleans) ──
      '@typescript-eslint/strict-boolean-expressions': ['error', {
        allowNullableBoolean: true,
        allowNullableString: true,       // if (str) is common enough
        allowNumber: false,              // no if (count) — use if (count > 0)
      }],

      // ── Unused vars: error (already in tsconfig, but enforce in lint too) ──
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
    },
  },

  // Ignore build output
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
);
