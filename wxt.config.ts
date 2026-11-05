import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  // Explicit imports keep every dependency visible to TypeScript, ESLint and Knip
  imports: false,
  manifest: {
    name: 'chrome-vim-extension',
    description: 'Vim-style keyboard navigation for Arc and Chrome.',
    permissions: [
      // Restarts the content script in open tabs on install and update (R1.5)
      'scripting',
      // Restores closed tabs (X)
      'sessions',
      // Lets H and L with a count wait for each history step to commit (R6.3,
      // R6.4); it adds the "read your browsing history" install warning (NFR3.1)
      'webNavigation',
    ],
  },
});
