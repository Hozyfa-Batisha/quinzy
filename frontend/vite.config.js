import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'path';
import handlebars from 'vite-plugin-handlebars';

const projectDir = import.meta.dirname;

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, resolve(projectDir, '..'), '');
  // This is a public OAuth client ID. It can be overridden per environment
  // with GOOGLE_CLIENT_ID, while keeping local development usable.
  const googleClientId = env.GOOGLE_CLIENT_ID || '153746878594-1pk8uug6v1k570ie17k6ntuhg10hivai.apps.googleusercontent.com';
  return {
    plugins: [
      handlebars({
        partialDirectory: resolve(projectDir, 'src/partials'),
        context: {
          env: {
          GOOGLE_CLIENT_ID: googleClientId,
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
