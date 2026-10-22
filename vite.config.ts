import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

const jsonStoragePlugin = () => ({
  name: 'json-storage',
  configureServer(server: any) {
    const handleMiddleware = (req: any, res: any, next: any) => {
      if (req.url === '/api/store-json' && req.method === 'POST') {
        let body = '';
        req.on('data', (chunk: any) => { body += chunk; });
        req.on('end', () => {
          try {
            const { tableName, data } = JSON.parse(body);
            const cleanName = String(tableName).toLowerCase();
            const filePath = path.resolve(__dirname, `./public/offline_data/${cleanName}.json`);
            fs.mkdirSync(path.dirname(filePath), { recursive: true });
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true }));
          } catch (e) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: String(e) }));
          }
        });
        return;
      }
      next();
    };
    server.middlewares.use(handleMiddleware);
  },
  configurePreviewServer(server: any) {
    const handleMiddleware = (req: any, res: any, next: any) => {
      if (req.url === '/api/store-json' && req.method === 'POST') {
        let body = '';
        req.on('data', (chunk: any) => { body += chunk; });
        req.on('end', () => {
          try {
            const { tableName, data } = JSON.parse(body);
            const cleanName = String(tableName).toLowerCase();
            const filePath = path.resolve(__dirname, `./public/offline_data/${cleanName}.json`);
            fs.mkdirSync(path.dirname(filePath), { recursive: true });
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true }));
          } catch (e) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: String(e) }));
          }
        });
        return;
      }
      next();
    };
    server.middlewares.use(handleMiddleware);
  }
});


// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    jsonStoragePlugin(),
    react(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    open: true,
    cors: true,
  },
  preview: {
    port: 4173,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild',
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // Data fetching & state
          'query-vendor': ['@tanstack/react-query'],
          // Supabase
          'supabase-vendor': ['@supabase/supabase-js'],
          // Charts
          'charts-vendor': ['recharts'],
          // Utilities
          'utils-vendor': ['date-fns', 'clsx', 'tailwind-merge', 'lucide-react'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      '@supabase/supabase-js',
      'lucide-react',
      'date-fns',
      'clsx',
      'tailwind-merge',
    ],
  },
})
