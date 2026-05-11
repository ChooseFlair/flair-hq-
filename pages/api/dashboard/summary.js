import { supabase } from '../../../lib/supabase'

function rangeBounds(range) {
  const now = new Date()
  const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
  const endOfDay = (d) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x }

  if (range === 'yesterday') {
    const y = new Date(now); y.setDate(y.getDate() - 1)
    return { from: startOfDay(y), to: endOfDay(y), label: 'Yesterday' }
  }
  if (range === '7d') {
    const f = new Date(now); f.setDate(f.getDate() - 6)
    return { from: startOfDay(f), to: endOfDay(now), label: 'Last 7 days' }
  }
  if (range === '30d') {
    const f = new Date(now); f.setDate(f.getDate() - 29)
    return { from: startOfDay(f), to: endOfDay(now), label: 'Last 30 days' }
  }
  if (range === 'mtd') {
    const f = new Date(now.getFullYear(), now.getMonth(), 1)
    return { from: startOfDay(f), to: endOfDay(now), label: 'Month to date' }
  }
  return { from: startOfDay(now), to: endOfDay(now), label: 'Today' }
}

export default async function handler(req, res) {
  const range = (req.query.range || 'today').toString()
  const { from, to, label } = rangeBounds(range)

  const issues = []

  let revenue = 0
  let orderCount = 0
  let customerCount = 0
  let aov = 0

  try {
    const { data: orders, error } = await supabase
      .from('orders')
      .select('total_price, email, created_at, financial_status')
      .gte('created_at', from.toISOString())
      .lte('created_at', to.toISOString())

    if (error) {
      issues.push({ name: 'Shopify', status: 'error', message: error.message })
    } else if (orders) {
      const paid = orders.filter(o => o.financial_status !== 'refunded' && o.financial_status !== 'voided')
      revenue = paid.reduce((s, o) => s + parseFloat(o.total_price || 0), 0)
      orderCount = paid.length
      customerCount = new Set(paid.map(o => o.email).filter(Boolean)).size
      aov = orderCount > 0 ? revenue / orderCount : 0
    }
  } catch (e) {
    issues.push({ name: 'Shopify', status: 'error', message: e.message })
  }

  const connectors = []

  const CONNECTOR_DEFS = [
    { name: 'SHOPIFY', rowId: 'shopify_sync', envCheck: () => process.env.SHOPIFY_SHOP_DOMAIN && process.env.SHOPIFY_ADMIN_TOKEN },
    { name: 'KLAVIYO', rowId: 'klaviyo_sync', envCheck: () => true },
    { name: 'META', rowId: 'meta_30d', envCheck: () => (process.env.META_ACCESS_TOKEN || process.env.FACEBOOK_ACCESS_TOKEN) && process.env.META_AD_ACCOUNT_ID },
    { name: 'PAYPAL', rowId: 'paypal_sync', envCheck: () => process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_SECRET },
    { name: 'REVOLUT', rowId: 'revolut_sync', envCheck: () => process.env.REVOLUT_CLIENT_ID },
    { name: 'WINDSOR', rowId: null, envCheck: () => true },
  ]

  let rows = []
  try {
    const { data } = await supabase.from('integrations').select('*').in('id', CONNECTOR_DEFS.map(c => c.rowId).filter(Boolean))
    rows = data || []
  } catch {}

  for (const def of CONNECTOR_DEFS) {
    if (!def.envCheck()) {
      connectors.push({ name: def.name, status: 'warn', detail: 'not configured' })
      continue
    }
    if (!def.rowId) {
      connectors.push({ name: def.name, status: 'ok', detail: 'live' })
      continue
    }
    const row = rows.find(r => r.id === def.rowId)
    if (!row) {
      connectors.push({ name: def.name, status: 'warn', detail: 'never synced' })
      continue
    }
    const last = row.last_sync || row.updated_at
    const ageH = last ? (Date.now() - new Date(last).getTime()) / 3600000 : 9999
    const status = ageH < 24 ? 'ok' : ageH < 72 ? 'warn' : 'error'
    const detail = last ? `${ageH < 1 ? Math.round(ageH * 60) + 'm' : Math.round(ageH) + 'h'} ago` : 'no sync'
    connectors.push({ name: def.name, status, detail })
    if (status === 'error') issues.push({ name: def.name, status: 'error', message: `Last sync ${detail}` })
  }

  res.status(200).json({
    range,
    label,
    from: from.toISOString(),
    to: to.toISOString(),
    revenue: Number(revenue.toFixed(2)),
    orderCount,
    customerCount,
    aov: Number(aov.toFixed(2)),
    connectors,
    issues,
    generatedAt: new Date().toISOString(),
  })
}
