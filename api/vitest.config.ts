import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/services/bot.ts', 'src/services/whatsapp.ts', 'src/services/antispam.ts', 'src/routes/webhook.ts', 'src/routes/whatsapp.ts'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});