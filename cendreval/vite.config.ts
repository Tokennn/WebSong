import { defineConfig } from 'vite';

declare const process: { env: Record<string, string | undefined> };

export default defineConfig({
  base: './',
  server: { port: Number(process.env.PORT) || 5193 },
  build: { target: 'es2022' },
});
