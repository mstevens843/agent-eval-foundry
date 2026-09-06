import { defineConfig } from 'vitest/config';

export default defineConfig({ test: {
  include: ['test/**/*.test.ts'],
  // Avoid thirteen idle workers and simultaneous large sweeps on developer laptops/CI.
  minWorkers: 1, maxWorkers: 2,
  testTimeout: 120_000, hookTimeout: 120_000,
}});
