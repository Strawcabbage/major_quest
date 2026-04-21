export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Accept')
    res.status(204).end()
    return
  }

  const email = process.env.USAJOBS_EMAIL
  const apiKey = process.env.USAJOBS_API_KEY

  if (!email || !apiKey) {
    res.status(503).json({ error: 'USAJOBS credentials not configured on server' })
    return
  }

  const parsed = new URL(req.url, `https://${req.headers.host}`)
  const pathAfterPrefix = parsed.pathname.replace(/^\/api\/usajobs\/?/, '')
  const endpoint = pathAfterPrefix || 'search'
  const target = `https://data.usajobs.gov/api/${endpoint}?${parsed.searchParams.toString()}`

  try {
    const upstream = await fetch(target, {
      headers: {
        Accept: 'application/json',
        Host: 'data.usajobs.gov',
        'User-Agent': email,
        'Authorization-Key': apiKey,
      },
    })

    const body = await upstream.text()

    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json')
    res.status(upstream.status).send(body)
  } catch (err) {
    res.status(502).json({ error: `Upstream request failed: ${err.message}` })
  }
}
