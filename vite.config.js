import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  assetsInclude: ['**/*.gltf', '**/*.glb', '**/*.mp3', '**/*.ogg'],
  server: {
    hmr: {
      overlay: false, // Disable the error overlay
      timeout: 5000, // Increase timeout
    },
    watch: {
      usePolling: false,
      useFsEvents: true,
      ignored: ['**/node_modules/**', '**/dist/**'], // Ignore unnecessary files
    },
    fs: {
      strict: false,
    },
  },
  worker: {
    format: 'es',
  },
  build: {
    target: 'esnext',
    minify: 'esbuild',
    terserOptions: {
      compress: {
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
      },
    },
    chunkSizeWarningLimit: 3000,
    sourcemap: false,
    assetsInlineLimit: 4096,
    cssCodeSplit: true,
  },
  esbuild: {
    drop: ['debugger'],
    legalComments: 'none',
  },
  plugins: [vue()],
});
