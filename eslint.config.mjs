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

  // Project-wide settings for _generated/
  {
    files: ['_generated/**/*.ts'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // Test files use tsconfig.test.json (projectService disabled for this config)
  {
    files: ['_generated/tests/**/*.ts'],
    languageOptions: {
      parserOptions: {
        projectService: false,
        project: './tsconfig.test.json',
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

      // ── Concrete type assertions allowed; `no-explicit-any` still blocks `as any` ──
      // objectLiteralTypeAssertions: 'allow' is needed for XState v5 `types: { context: {} as T }` pattern.
      // `no-explicit-any` still blocks `as any`.
      '@typescript-eslint/consistent-type-assertions': ['error', {
        assertionStyle: 'as',
        objectLiteralTypeAssertions: 'allow',
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

      // ── Numbers in template literals are idiomatic ──
      '@typescript-eslint/restrict-template-expressions': ['error', {
        allowNumber: true,
        allowBoolean: false,
        allowAny: false,
        allowNullish: false,
      }],

      // ── Unused vars: error (already in tsconfig, but enforce in lint too) ──
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],

      // ── Allow empty catch blocks (intentional in MIDI/audio error swallowing) ──
      'no-empty': ['error', { allowEmptyCatch: true }],
      '@typescript-eslint/no-empty-function': ['error', {
        allow: ['methods'],
      }],
    },
  },

  // Test files: relax rules that conflict with Playwright patterns.
  // - no-unsafe-*: page.evaluate() runs in browser context where dynamic import()
  //   returns untyped values — TypeScript cannot track types across the boundary.
  // - require-await: StateInvariant.check must return Promise<void> per interface,
  //   but pure-math invariants have no async operations.
  // - no-empty-function: mock MIDIOutput.clear() methods are intentionally empty.
  // This override MUST come after the global rules block.
  {
    files: ['_generated/tests/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/strict-boolean-expressions': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/dot-notation': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/prefer-optional-chain': 'off',
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
      'no-empty': 'off',
    },
  },

  // Ignore build output
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
);
