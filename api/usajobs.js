export default async function handler(req, res) {
  const email = process.env.USAJOBS_EMAIL
  const apiKey = process.env.USAJOBS_API_KEY

  if (!email || !apiKey) {
    res.status(503).json({ error: 'USAJOBS credentials not configured on server' })
    return
  }

  const incomingUrl = new URL(req.url, `http://${req.headers.host}`)
  const searchParams = new URLSearchParams(incomingUrl.searchParams)
  const target = `https://data.usajobs.gov/api/search?${searchParams.toString()}`

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
