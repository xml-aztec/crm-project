import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    // Кроме dist здесь ещё три служебных каталога с чужим/сгенерированным
    // кодом: ds-bundle (2,9 МБ), .ds-sync (11 МБ) и .design-sync. Пока их не
    // игнорировали, `npx eslint .` шёл больше пяти минут вместо пяти секунд
    // на src — из-за чего линтер фактически никто не запускал.
    ignores: ['dist', 'ds-bundle', '.ds-sync', '.design-sync'],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Имя с ведущим подчёркиванием — принятый в проекте способ пометить
      // намеренно неиспользуемый аргумент или элемент деструктуризации
      // (например, при пропуске позиционного параметра). Без этой настройки
      // линтер ругался на такие имена, и правило приходилось игнорировать
      // целиком вместо точечных исключений.
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
        },
      ],
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
)
