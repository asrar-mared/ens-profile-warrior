import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 10000,
    include: ['test/utils/**/*.test.ts'], // شغّل بس اختبارات utils كبداية
    reporters: ['verbose'],
  },
  esbuild: {
    target: 'node22',
    format: 'esm',
  },
})	
