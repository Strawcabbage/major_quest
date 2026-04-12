import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function devDataApisPlugin(mode) {
  return {
    name: 'major-quest-bls-onet-proxy',
    configureServer(server) {
      const env = loadEnv(mode, process.cwd(), '')
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split('?')[0] ?? ''

        if (url === '/api/bls' && req.method === 'POST') {
          try {
            const raw = await readRequestBody(req)
            let body = {}
            try {
              body = JSON.parse(raw || '{}')
            } catch {
              body = {}
            }
            const blsKey = env.BLS_API_KEY || env.VITE_BLS_API_KEY
            if (blsKey) body.registrationKey = blsKey
            const r = await fetch('https://api.bls.gov/publicAPI/v2/timeseries/data', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
            })
            const text = await r.text()
            res.statusCode = r.status
            res.setHeader('Content-Type', 'application/json')
            res.end(text)
          } catch (e) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: String(e?.message ?? e) }))
          }
          return
        }

        if (url.startsWith('/api/onet/') && req.method === 'GET') {
          try {
            const pathAfter = url.slice('/api/onet'.length)
            const target = `https://services.onetcenter.org/api/v2${pathAfter}`
            const onetKey = env.ONET_API_KEY || env.VITE_ONET_API_KEY
            const r = await fetch(target, {
              headers: {
                Accept: 'application/json',
                ...(onetKey ? { 'X-API-Key': onetKey } : {}),
              },
            })
            const text = await r.text()
            res.statusCode = r.status
            const ct = r.headers.get('content-type')
            if (ct) res.setHeader('Content-Type', ct)
            res.end(text)
          } catch (e) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: String(e?.message ?? e) }))
          }
          return
        }

        next()
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const scorecardKey = env.COLLEGE_SCORECARD_API_KEY || env.VITE_COLLEGE_SCORECARD_API_KEY

  return {
    plugins: [react(), devDataApisPlugin(mode)],
    server: {
      proxy: {
        '/api/scorecard': {
          target: 'https://api.data.gov/ed/collegescorecard/v1',
          changeOrigin: true,
          rewrite: (path) => {
            const q = path.includes('?') ? path.slice(path.indexOf('?')) : ''
            return `/schools.json${q}`
          },
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              if (!scorecardKey) return
              const p = proxyReq.path || ''
              if (p.includes('api_key=')) return
              const joiner = p.includes('?') ? '&' : '?'
              proxyReq.path = `${p}${joiner}api_key=${encodeURIComponent(scorecardKey)}`
            })
          },
        },
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/test/setup.js',
    },
  }
})
