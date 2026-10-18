import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  // Explicit imports keep every dependency visible to TypeScript, ESLint and Knip
  imports: false,
  manifest: {
    name: 'chrome-vim-extension',
    description: 'Vim-style keyboard navigation for Arc and Chrome.',
  },
});
