export default {
  '*.{ts,js}': ['eslint --fix --max-warnings=0', 'prettier --write'],
  '*.{json,md,yml,yaml,css,html}': 'prettier --write',
  // Type-check the whole project once, not file by file
  '*.ts': () => 'npm run typecheck',
};
