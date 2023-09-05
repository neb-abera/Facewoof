import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    'process.env': process.env
  },
  server: {
    port: 3001,
    watch: {
      usePolling: true,
      interval: 100
    }
  }
});
// port was 5173
