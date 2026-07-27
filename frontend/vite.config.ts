import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const rootEnv = loadEnv(mode, path.resolve(__dirname, '..'), '');
  // Prefer backend/.env* PORT so Vite proxy matches the API server (root PORT is often unrelated).
  const backendEnv = loadEnv(mode, path.resolve(__dirname, '../backend'), '');
  const proxyPort = backendEnv.PORT || rootEnv.BACKEND_PORT || rootEnv.VITE_API_PROXY_PORT || '3000';
  const proxyTarget = (rootEnv.VITE_API_PROXY_TARGET || `http://localhost:${proxyPort}`).replace(/\/$/, '');

  return {
    root: path.resolve(__dirname),
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(rootEnv.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
      dedupe: ['firebase'],
    },
    envDir: path.resolve(__dirname, '..'),
    optimizeDeps: {
      include: [
        'motion/react',
        'react',
        'react-dom',
        'react-router-dom',
        'lucide-react',
      ],
      // Keep firebase out of forced prebundle so app + pages share one instance.
    },
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
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
