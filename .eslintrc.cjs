/* eslint-env node */
require('@rushstack/eslint-patch/modern-module-resolution')

module.exports = {
  root: true,
  extends: ['eslint:recommended', '@vue/eslint-config-typescript', '@vue/eslint-config-prettier'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: './tsconfig.eslint.json',
  },
  env: {
    browser: true,
    es2022: true,
    node: true,
  },
  rules: {
    // Vue相关规则
    'vue/multi-word-component-names': 'off',
    'vue/no-v-html': 'warn',
    'vue/require-default-prop': 'off',
    'vue/require-explicit-emits': 'warn',
    'vue/no-unused-vars': 'error',
    'vue/no-unused-components': 'error',

    // TypeScript相关规则
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      },
    ],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-inferrable-types': 'warn',
    '@typescript-eslint/no-non-null-assertion': 'warn',

    // JavaScript相关规则
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    'no-unused-vars': 'off', // 使用TypeScript的规则
    'no-undef': 'off', // TypeScript会处理这个
    'prefer-const': 'error',
    'no-var': 'error',
    'object-shorthand': 'warn',
    'quote-props': ['error', 'as-needed'],

    // 代码风格
    quotes: ['error', 'single', { avoidEscape: true }],
    semi: ['error', 'never'],
    'comma-dangle': ['error', 'always-multiline'],
    indent: ['error', 2, { SwitchCase: 1 }],
    'brace-style': ['error', '1tbs', { allowSingleLine: true }],
    'keyword-spacing': 'error',
    'space-before-blocks': 'error',
    'space-infix-ops': 'error',
    'eol-last': 'error',
    'no-trailing-spaces': 'error',
    'no-multiple-empty-lines': ['error', { max: 1, maxEOF: 0 }],

    // 最佳实践
    eqeqeq: 'error',
    curly: 'error',
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-with': 'error',
    'no-sequences': 'error',
    'no-unused-expressions': 'error',
    'no-useless-concat': 'error',
    'no-useless-return': 'error',
    'no-void': 'error',
    'no-lone-blocks': 'error',
    'no-new': 'warn',
    'no-new-func': 'error',
    'no-new-wrappers': 'error',
    'no-throw-literal': 'error',
    'no-unmodified-loop-condition': 'error',
    'no-useless-call': 'error',
    'no-useless-computed-key': 'error',
    'no-useless-rename': 'error',
    'require-await': 'warn',
    yoda: 'error',

    // 安全相关
    'no-alert': 'warn',
    'no-script-url': 'error',
  },
  overrides: [
    {
      files: ['*.vue'],
      parser: 'vue-eslint-parser',
      parserOptions: {
        parser: '@typescript-eslint/parser',
        extraFileExtensions: ['.vue'],
      },
      rules: {
        // Vue文件特定规则
        'vue/block-order': [
          'error',
          {
            order: ['script', 'template', 'style'],
          },
        ],
        'vue/component-tags-order': [
          'error',
          {
            order: ['script', 'template', 'style'],
          },
        ],
        'vue/html-closing-bracket-newline': [
          'error',
          {
            singleline: 'never',
            multiline: 'always',
          },
        ],
        'vue/html-indent': ['error', 2],
        'vue/max-attributes-per-line': [
          'error',
          {
            singleline: 3,
            multiline: 1,
          },
        ],
        'vue/mustache-interpolation-spacing': 'error',
        'vue/no-multi-spaces': 'error',
        'vue/no-spaces-around-equal-signs-in-attribute': 'error',
        'vue/no-template-shadow': 'error',
        'vue/one-component-per-file': 'error',
        'vue/prop-name-casing': ['error', 'camelCase'],
        'vue/require-prop-types': 'warn',
        'vue/this-in-template': ['error', 'never'],
        'vue/v-bind-style': 'error',
        'vue/v-on-style': 'error',
        'vue/v-slot-style': 'error',
      },
    },
    {
      files: ['**/*.ts', '**/*.tsx'],
      parser: '@typescript-eslint/parser',
      rules: {
        // TypeScript文件特定规则
        '@typescript-eslint/prefer-const': 'error',
        '@typescript-eslint/no-var-requires': 'error',
        '@typescript-eslint/array-type': ['error', { default: 'array' }],
        '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
        '@typescript-eslint/consistent-type-imports': [
          'error',
          {
            prefer: 'type-imports',
            fixStyle: 'inline-type-imports',
          },
        ],
        '@typescript-eslint/method-signature-style': 'error',
        '@typescript-eslint/no-confusing-non-null-assertion': 'error',
        '@typescript-eslint/no-dynamic-delete': 'error',
        '@typescript-eslint/no-extra-non-null-assertion': 'error',
        '@typescript-eslint/no-invalid-void-type': 'error',
        '@typescript-eslint/no-non-null-asserted-optional-chain': 'error',
        '@typescript-eslint/no-require-imports': 'error',
        '@typescript-eslint/prefer-function-type': 'error',
        '@typescript-eslint/prefer-nullish-coalescing': 'error',
        '@typescript-eslint/prefer-optional-chain': 'error',
        '@typescript-eslint/prefer-string-starts-ends-with': 'error',
        '@typescript-eslint/unified-signatures': 'error',
      },
    },
    {
      files: ['**/__tests__/**', '**/*.{test,spec}.*'],
      env: {
        jest: true,
      },
      rules: {
        // 测试文件特定规则
        'no-console': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
      },
    },
    {
      files: ['*.config.*', '.*rc.*'],
      rules: {
        // 配置文件特定规则
        'no-console': 'off',
        '@typescript-eslint/no-var-requires': 'off',
      },
    },
  ],
}
