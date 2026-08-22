module.exports = {
  root: true,
  // dist is generated and node_modules is not ours.
  ignorePatterns: ['dist', 'node_modules', 'public'],
  env: {
    browser: true,
    es2021: true
  },
  extends: [
    'airbnb',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
    // Last, so it can switch off the stylistic rules prettier owns. Formatting
    // is checked by `prettier --check` in its own step rather than reported as
    // eslint errors, which is why eslint-plugin-prettier is gone.
    'prettier'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: { jsx: true }
  },
  plugins: ['react'],
  settings: {
    react: { version: 'detect' }
  },
  overrides: [
    {
      // The browser tests are node, ESM-ish CommonJS, and legitimately import
      // a devDependency: they are never bundled into anything that ships.
      files: ['tests/**/*.js', 'playwright.config.js'],
      env: { node: true, browser: true },
      parserOptions: { sourceType: 'script' },
      rules: {
        'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
        'no-console': 'off'
      }
    },
    {
      // vite.config.js is ESM, unlike the rest of the node-side files.
      files: ['vite.config.js'],
      env: { node: true },
      parserOptions: { sourceType: 'module' },
      rules: { 'import/no-extraneous-dependencies': 'off' }
    },
    {
      // The server is CommonJS and runs on node, not in a browser.
      files: ['server/**/*.js', 'tailwind.config.js', 'postcss.config.js', '.eslintrc.js'],
      env: { node: true, browser: false },
      parserOptions: { sourceType: 'script' },
      rules: {
        'import/no-extraneous-dependencies': 'off',
        // tailwind.config.js loads its plugins with require(), which is how
        // tailwind's own documented config works.
        'global-require': 'off'
      }
    }
  ],
  rules: {
    'react/function-component-definition': [
      2,
      { namedComponents: 'arrow-function', unnamedComponents: 'arrow-function' }
    ],
    'comma-dangle': [1, 'never'],
    'no-console': ['error', { allow: ['warn', 'error'] }],
    'no-unused-vars': 'warn',
    'react-hooks/exhaustive-deps': 'warn',
    'react-hooks/rules-of-hooks': 'error',
    'react/jsx-filename-extension': [1, { extensions: ['.js', '.jsx'] }],
    'react/jsx-one-expression-per-line': [0],
    'react/jsx-props-no-spreading': [0],
    'react/jsx-uses-react': 'error',
    'react/jsx-uses-vars': 'error',
    // Vite resolves these; the eslint resolver does not know about its aliases
    // or about importing an asset as a module.
    'import/no-unresolved': [2, { ignore: ['\\.(png|jpe?g|svg|css)$'] }],
    'import/extensions': [
      'error',
      'ignorePackages',
      { js: 'never', jsx: 'never', ts: 'never', tsx: 'never' }
    ]
  }
};
