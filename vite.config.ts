import {defineConfig, loadEnv} from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the
  // `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '')

  const url = env.VITE_BASE_URL ?? '/'

  return {
    plugins: [react()],
    base: url.endsWith('/') ? url : `${url}/`,
    server: {
      // Fallback to index.html for SPA routing in dev mode
      historyApiFallback: true,
    },
    preview: {
      // Fallback to index.html for SPA routing in preview mode
      historyApiFallback: true,
    },
  }
})
