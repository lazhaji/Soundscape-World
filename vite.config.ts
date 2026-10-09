import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  // Relative assets also work when the static build is hosted below a subpath.
  base: './',
  build: { target: ['es2022', 'safari16'] },
  test: {
    environment: 'node',
    // Threads share the temporary module cache in restricted Windows environments.
    pool: 'threads',
    include: ['tests/**/*.test.ts'],
    clearMocks: true,
  },
})
