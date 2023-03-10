module.exports = {
  env: {
    browser: true,
    es2021: true
  },
  extends: [
    'plugin:react/recommended',
    'airbnb',
    'prettier',
    'plugin:prettier/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended'
  ],
  overrides: [],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true
    }
  },
  plugins: ['react', 'prettier'],
  rules: {
    indent: 'off',
    // new from eslint-plugin-react
    'react/function-component-definition': [
      2,
      {
        namedComponents: 'arrow-function',
        unnamedComponents: 'arrow-function'
      }
    ],
    // stying
    'comma-dangle': [1, 'never'],
    'no-console': 0,
    'object-shorthand': ['error', 'never'],
    'no-unused-vars': 'warn',
    // react rules
    'prettier/prettier': ['error'],
    'react-hooks/exhaustive-deps': 'warn',
    'react-hooks/rules-of-hooks': 'error',
    'react/jsx-filename-extension': [1, { extensions: ['.js', '.jsx'] }],
    'react/jsx-indent-props': [2, 4],
    'react/jsx-indent': 'off',
    'react/jsx-one-expression-per-line': [0],
    'react/prefer-stateless-function': [1],
    'react/static-property-placement': [1, 'property assignment'],
    // rules for eslint-plugin-react
    'react/jsx-uses-react': 'error',
    'react/jsx-uses-vars': 'error',
    // removing import errors
    'import/extensions': [
      'error',
      'ignorePackages',
      {
        js: 'never',
        jsx: 'never',
        ts: 'never',
        tsx: 'never'
      }
    ]
    // Optional if you're using React 18 and have no dependencies that require React to be imported on every file. This suppress errors for missing 'import React' in files
    // 'react/react-in-jsx-scope': 'off'
  }
};
