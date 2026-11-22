import { fileURLToPath } from 'node:url'
import tailwind from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const webhook = env.N8N_REPORT_WEBHOOK_URL
    ? new URL(env.N8N_REPORT_WEBHOOK_URL)
    : undefined
  const proxy = webhook ? {
    '^/api/weekly-report(?:\\?|$)': {
      target: webhook.origin,
      changeOrigin: true,
      rewrite: (path: string) => webhook.pathname + path.slice('/api/weekly-report'.length),
      headers: env.N8N_REPORT_WEBHOOK_TOKEN
        ? { 'X-Report-Token': env.N8N_REPORT_WEBHOOK_TOKEN }
        : undefined,
      timeout: 20_000,
      proxyTimeout: 20_000,
    },
  } : undefined

  return {
    plugins: [tailwind()],
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    server: { proxy },
    preview: { proxy, host: '127.0.0.1' },
  }
})
