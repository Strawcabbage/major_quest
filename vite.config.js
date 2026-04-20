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
            const target = `https://api-v2.onetcenter.org${pathAfter}`
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

        if (url.startsWith('/api/adzuna/') && req.method === 'GET') {
          try {
            const [pathAfter, rawQuery] = (req.url ?? '').slice('/api/adzuna'.length).split('?')
            const params = new URLSearchParams(rawQuery ?? '')
            const adzId = env.ADZUNA_APP_ID || env.VITE_ADZUNA_APP_ID
            const adzKey = env.ADZUNA_APP_KEY || env.VITE_ADZUNA_APP_KEY
            if (adzId) params.set('app_id', adzId)
            if (adzKey) params.set('app_key', adzKey)
            const target = `https://api.adzuna.com/v1/api${pathAfter}?${params.toString()}`
            const r = await fetch(target, { headers: { Accept: 'application/json' } })
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

        if (url.startsWith('/api/usajobs/') && req.method === 'GET') {
          try {
            const pathAfter = (req.url ?? '').slice('/api/usajobs'.length)
            const target = `https://data.usajobs.gov/api${pathAfter}`
            const usaEmail = env.USAJOBS_EMAIL || env.VITE_USAJOBS_EMAIL
            const usaKey = env.USAJOBS_API_KEY || env.VITE_USAJOBS_API_KEY
            if (!usaEmail || !usaKey) {
              res.statusCode = 503
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'USAJOBS_EMAIL / USAJOBS_API_KEY missing in env' }))
              return
            }
            const r = await fetch(target, {
              headers: {
                Accept: 'application/json',
                Host: 'data.usajobs.gov',
                'User-Agent': usaEmail,
                'Authorization-Key': usaKey,
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
