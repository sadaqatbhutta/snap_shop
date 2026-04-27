import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__dirname, '..'), '');
  return {
    root: path.resolve(__dirname),
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    envDir: path.resolve(__dirname, '..'),
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('firebase')) return 'vendor-firebase';
              if (id.includes('motion') || id.includes('framer-motion')) return 'vendor-motion';
              if (id.includes('react-router')) return 'vendor-router';
              if (id.includes('react-dom') || id.includes('/react/')) return 'vendor-react';
              if (id.includes('lucide-react')) return 'vendor-icons';
            }
            return undefined;
          },
        },
      },
    },
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:3040',
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
