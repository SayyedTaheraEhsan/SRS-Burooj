import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const productionApiUrl = 'https://srs-burooj-api.onrender.com';

export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    {
      name: 'srs-burooj-production-api-url',
      enforce: 'pre',
      transform(code, id) {
        if (command !== 'build') {
          return null;
        }

        const normalizedId = id.replace(/\\/g, '/');

        if (
          !normalizedId.includes('/src/') ||
          !/\.[jt]sx?$/.test(normalizedId) ||
          !code.includes('http://localhost:5000')
        ) {
          return null;
        }

        return {
          code: code.replaceAll(
            'http://localhost:5000',
            productionApiUrl
          ),
          map: null,
        };
      },
    },
  ],
}));
