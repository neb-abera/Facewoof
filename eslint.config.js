/*
 * Flat config, replacing .eslintrc.js. Airbnb's config went with eslint 8: it
 * is unmaintained and never shipped flat-config support, and eslint 8 itself
 * is end of life. The React, hooks and accessibility rule sets it wrapped are
 * applied directly instead; the stylistic rules it carried are prettier's job,
 * checked by `prettier --check` in its own step.
 *
 * eslint stays on 9: eslint-plugin-react and eslint-plugin-jsx-a11y do not
 * yet declare support for 10.
 */
const js = require('@eslint/js');
const globals = require('globals');
const react = require('eslint-plugin-react');
const reactHooks = require('eslint-plugin-react-hooks');
const jsxA11y = require('eslint-plugin-jsx-a11y');
const prettier = require('eslint-config-prettier');

module.exports = [
  // dist is generated and node_modules is not ours.
  { ignores: ['dist/**', 'node_modules/**', 'public/**'] },

  js.configs.recommended,

  // The React client.
  {
    files: ['src/**/*.{js,jsx}'],
    ...react.configs.flat.recommended,
    languageOptions: {
      ...react.configs.flat.recommended.languageOptions,
      globals: { ...globals.browser },
      ecmaVersion: 'latest',
      sourceType: 'module'
    },
    settings: {
      react: { version: 'detect' }
    }
  },
  {
    files: ['src/**/*.{js,jsx}'],
    ...jsxA11y.flatConfigs.recommended
  },
  // eslint 8's `eslint .` only ever linted .js files, so CI never saw the
  // .jsx components until this config. Rules the existing components violate
  // are warnings rather than errors: strictly more signal than the none they
  // had, without turning a dependency refresh into a rewrite. The two real
  // defects it surfaced (a missing import, a helper named like a hook) are
  // fixed rather than downgraded.
  {
    files: ['src/**/*.{js,jsx}'],
    ...react.configs.flat['jsx-runtime'],
    plugins: { ...react.configs.flat['jsx-runtime'].plugins, 'react-hooks': reactHooks },
    rules: {
      ...react.configs.flat['jsx-runtime'].rules,
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react/function-component-definition': [
        1,
        { namedComponents: 'arrow-function', unnamedComponents: 'arrow-function' }
      ],
      // React 19 ignores propTypes at runtime; the validation is vestigial.
      'react/prop-types': 'off',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-unused-vars': 'warn',
      'react/jsx-filename-extension': [1, { extensions: ['.js', '.jsx'] }],
      'react/jsx-props-no-spreading': 'off',
      'jsx-a11y/click-events-have-key-events': 'warn',
      'jsx-a11y/no-noninteractive-element-interactions': 'warn',
      'jsx-a11y/no-static-element-interactions': 'warn',
      'jsx-a11y/no-noninteractive-tabindex': 'warn',
      'jsx-a11y/anchor-is-valid': 'warn',
      'jsx-a11y/img-redundant-alt': 'warn',
      'jsx-a11y/alt-text': 'warn',
      'jsx-a11y/label-has-associated-control': 'warn'
    }
  },

  // The server is CommonJS and runs on node, not in a browser.
  {
    files: ['server/**/*.js', 'eslint.config.js'],
    languageOptions: {
      globals: { ...globals.node },
      ecmaVersion: 'latest',
      sourceType: 'commonjs'
    }
  },

  // The browser tests are node, and legitimately import devDependencies: they
  // are never bundled into anything that ships.
  {
    files: ['tests/**/*.js', 'playwright.config.js'],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
      ecmaVersion: 'latest',
      sourceType: 'commonjs'
    },
    rules: {
      'no-console': 'off'
    }
  },

  // vite.config.js is ESM, unlike the rest of the node-side files.
  {
    files: ['vite.config.js'],
    languageOptions: {
      globals: { ...globals.node },
      ecmaVersion: 'latest',
      sourceType: 'module'
    }
  },

  // Last, so it can switch off the stylistic rules prettier owns.
  prettier
];
