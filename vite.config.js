import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'path';
import handlebars from 'vite-plugin-handlebars';

const projectDir = import.meta.dirname;

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [
      handlebars({
        partialDirectory: resolve(projectDir, 'src/partials'),
        context: {
          env: {
            GOOGLE_CLIENT_ID: env.GOOGLE_CLIENT_ID,
          },
        },
      }),
    ],
    build: {
    rollupOptions: {
      input: {
        main: resolve(projectDir, 'index.html'),
        login: resolve(projectDir, 'login.html'),
        register: resolve(projectDir, 'register.html'),
        profile: resolve(projectDir, 'profile.html'),
      },
    },
    },
    // Keep the browser calling the same relative `/api` URLs in development
    // and production. Without this proxy, Vite receives the auth request and
    // returns a 404 instead of forwarding it to Express.
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
  };
});
