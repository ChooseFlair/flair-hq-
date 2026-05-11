export const config = { maxDuration: 30 }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  const host = req.headers['x-forwarded-host'] || req.headers.host
  const proto = req.headers['x-forwarded-proto'] || 'https'
  const base = `${proto}://${host}`

  const filter = (req.query.connector || '').toString().toLowerCase()

  try {
    const r = await fetch(`${base}/api/dashboard/connector-status`)
    const json = await r.json()
    let results = json.connectors || []
    if (filter) results = results.filter(c => c.name.toLowerCase() === filter)
    const okCount = results.filter(c => c.status === 'ok').length
    res.status(200).json({
      ok: okCount === results.length,
      okCount,
      total: results.length,
      results,
      syncedAt: new Date().toISOString(),
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
