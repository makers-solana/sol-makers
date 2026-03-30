import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    allowedHosts: ['thehistorymaker.io', 'www.thehistorymaker.io', '202.10.47.154'],
    hmr: {
      host: 'thehistorymaker.io',
    },
  },
  define: {
    'global': 'globalThis',
    'process.env': {},
  },
})
