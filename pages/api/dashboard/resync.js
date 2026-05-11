export const config = { maxDuration: 60 }

const CONNECTORS = [
  { name: 'Shopify', path: '/api/sync/shopify', method: 'GET' },
  { name: 'Klaviyo', path: '/api/klaviyo/sync', method: 'POST' },
  { name: 'Meta', path: '/api/sync/meta', method: 'GET' },
  { name: 'PayPal', path: '/api/sync/paypal', method: 'GET' },
  { name: 'Revolut', path: '/api/sync/revolut', method: 'GET' },
]

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const host = req.headers['x-forwarded-host'] || req.headers.host
  const proto = req.headers['x-forwarded-proto'] || 'https'
  const base = `${proto}://${host}`

  const filterName = (req.query.connector || '').toString().toLowerCase()
  const targets = filterName
    ? CONNECTORS.filter(c => c.name.toLowerCase() === filterName)
    : CONNECTORS

  const results = await Promise.all(
    targets.map(async (c) => {
      const start = Date.now()
      try {
        const r = await fetch(`${base}${c.path}`, { method: c.method })
        const text = await r.text()
        let payload = null
        try { payload = JSON.parse(text) } catch { payload = { raw: text.substring(0, 200) } }
        return {
          name: c.name,
          status: payload?.status || (r.ok ? 'ok' : 'error'),
          httpStatus: r.status,
          duration: Date.now() - start,
          message: payload?.message,
          details: payload,
        }
      } catch (e) {
        return { name: c.name, status: 'error', duration: Date.now() - start, message: e.message }
      }
    })
  )

  const okCount = results.filter(r => r.status === 'ok').length
  res.status(200).json({
    ok: okCount === results.length,
    okCount,
    total: results.length,
    results,
    syncedAt: new Date().toISOString(),
  })
}
