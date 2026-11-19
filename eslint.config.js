import js from '@eslint/js';
import ts from 'typescript-eslint';
import hooks from 'eslint-plugin-react-hooks';

export default ts.config(
  { ignores: ['dist/', 'test-results/', 'playwright-report/', '.wrangler/'] },
  js.configs.recommended,
  ...ts.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}', 'scripts/**/*.ts'],
    rules: {
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-restricted-syntax': ['error',
        { selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']", message: 'Render text or validated React nodes.' },
        { selector: "AssignmentExpression[left.property.name=/^(innerHTML|outerHTML)$/]", message: 'Use text or structured DOM nodes.' },
        { selector: "AssignmentExpression[left.property.value=/^(innerHTML|outerHTML)$/]", message: 'Use text or structured DOM nodes.' },
        { selector: "CallExpression[callee.property.name=/^(insertAdjacentHTML|createContextualFragment)$/]", message: 'Use text rendering instead of HTML injection sinks.' },
        { selector: "CallExpression[callee.object.name='document'][callee.property.name=/^(write|writeln)$/]", message: 'Use structured DOM nodes.' },
      ],
    },
  },
  {
    files: ['src/**/*.tsx'],
    plugins: { 'react-hooks': hooks },
    rules: { 'react-hooks/rules-of-hooks': 'error', 'react-hooks/exhaustive-deps': 'error' },
  },
);
