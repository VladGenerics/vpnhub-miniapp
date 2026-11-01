import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: {
        // библиотеки — отдельными файлами: они меняются реже кода и остаются в кэше между релизами
        codeSplitting: {
          groups: [
            { name: 'lottie', test: /node_modules[\\/]lottie-web[\\/]/ },
            { name: 'vendor', test: /node_modules[\\/]/ },
          ],
        },
      },
    },
  },
  server: { allowedHosts: ['.trycloudflare.com'] },
  preview: { allowedHosts: ['.trycloudflare.com'] },
})
