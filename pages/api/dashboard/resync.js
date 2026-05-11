export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const host = req.headers['x-forwarded-host'] || req.headers.host
  const proto = req.headers['x-forwarded-proto'] || 'https'
  const base = `${proto}://${host}`

  const results = []

  try {
    const r = await fetch(`${base}/api/klaviyo/sync`, { method: 'POST' })
    const ok = r.ok
    results.push({ name: 'Klaviyo', ok, status: r.status })
  } catch (e) {
    results.push({ name: 'Klaviyo', ok: false, error: e.message })
  }

  const allOk = results.every(r => r.ok)
  res.status(allOk ? 200 : 207).json({ ok: allOk, results, syncedAt: new Date().toISOString() })
}
