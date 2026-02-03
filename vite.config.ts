import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Polyfill cho process.env để tránh lỗi khi dùng client thư viện cũ
    'process.env': process.env
  }
})