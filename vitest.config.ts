import { defineConfig } from 'vitest/config';

// Agent worktrees live under .claude/; without this exclude vitest walks into
// them and runs every branch's suite at once.
export default defineConfig({
  test: {
    exclude: ['**/node_modules/**', '**/dist/**', '.claude/**'],
  },
});
