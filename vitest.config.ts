import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    testTimeout: 10000,
    hookTimeout: 10000,
    // Use vmForks pool to avoid /@vite/env fetch timeout when no Vite dev server is running
    pool: 'vmForks',
    poolOptions: {
      vmForks: {
        // Reuse the module registry across test files in the same worker
        memoryLimit: '1gb',
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    // Provide stable values for import.meta.env in tests
    'import.meta.env.VITE_UAT_MODE': JSON.stringify('false'),
    'import.meta.env.MODE': JSON.stringify('test'),
    'import.meta.env.DEV': JSON.stringify(false),
    'import.meta.env.PROD': JSON.stringify(false),
    'import.meta.env.SSR': JSON.stringify(false),
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify('https://test.supabase.co'),
    'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify('test-anon-key'),
  },
});
