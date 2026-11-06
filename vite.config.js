import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: true,
    port: 5173,
    // permite probar desde fuera por túnel (npx localtunnel --port 5173)
    allowedHosts: ['.loca.lt'],
  },
  build: {
    target: 'es2020',
  },
});
