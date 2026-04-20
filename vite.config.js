import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import istanbul from 'vite-plugin-istanbul';

export default defineConfig({
  plugins: [
    react(),
    istanbul({
      include: 'src/frontend/*',
      exclude: ['node_modules', 'test/'],
      extension: ['.js', '.jsx', '.ts', '.tsx'],
      requireEnv: false, // or true + set VITE_COVERAGE=true in env
    }),
  ],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true
      },
      "/uploads": {
        target: "http://localhost:3001", 
        changeOrigin: true
      },
      "/uploads": {
        target: "http://localhost:3001", 
        changeOrigin: true
      }
    }
  },
  test: {
    environment: "node",
    globals: true,
    exclude: ["**/node_modules/**", "tests/**"],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage/vitest',
      include: ['src/backend/*.{js,jsx,ts,tsx}'],         // source files to measure coverage on
      exclude: ['src/test/**', 'src/**/*.test.js'],   // exclude the test files themselves
    }
  }
});


