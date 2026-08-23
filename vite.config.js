import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const enableHttps = env.VITE_ENABLE_HTTPS === 'true' || env.VITE_HTTPS === 'true'

  return {
    plugins: [
      react(),
      ...(enableHttps ? [basicSsl()] : []),
    ],
    server: {
      host: '0.0.0.0',
      port: 5173,
      allowedHosts: true,
      proxy: {
        '/api': {
          target: env.API_BACKEND_URL || 'http://localhost:8000',
          changeOrigin: true,
          followRedirects: false,
        },
      },
    },
  }
})
