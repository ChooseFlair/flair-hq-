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

  try {
    const { count } = await supabase.from('orders').select('*', { count: 'exact', head: true })
    connectors.push({ name: 'SHOPIFY', status: count > 0 ? 'ok' : 'warn', detail: `${count || 0} orders` })
  } catch (e) {
    connectors.push({ name: 'SHOPIFY', status: 'error', detail: 'unreachable' })
    issues.push({ name: 'Shopify', status: 'error', message: e.message })
  }

  try {
    const { data: kl } = await supabase.from('integrations').select('*').eq('id', 'klaviyo_sync').maybeSingle()
    if (!kl) {
      connectors.push({ name: 'KLAVIYO', status: 'warn', detail: 'never synced' })
    } else {
      const last = kl.last_sync || kl.updated_at
      const ageH = last ? (Date.now() - new Date(last).getTime()) / 3600000 : 9999
      connectors.push({
        name: 'KLAVIYO',
        status: ageH < 24 ? 'ok' : ageH < 72 ? 'warn' : 'error',
        detail: last ? `${ageH < 1 ? Math.round(ageH * 60) + 'm' : Math.round(ageH) + 'h'} ago` : 'no sync',
      })
      if (ageH >= 72) issues.push({ name: 'Klaviyo', status: 'error', message: `Last sync ${Math.round(ageH)}h ago` })
    }
  } catch (e) {
    connectors.push({ name: 'KLAVIYO', status: 'error', detail: 'unreachable' })
  }

  connectors.push({
    name: 'META',
    status: process.env.META_ACCESS_TOKEN || process.env.FACEBOOK_ACCESS_TOKEN ? 'ok' : 'warn',
    detail: process.env.META_ACCESS_TOKEN || process.env.FACEBOOK_ACCESS_TOKEN ? 'connected' : 'cached only',
  })

  connectors.push({
    name: 'WINDSOR',
    status: 'ok',
    detail: 'connected',
  })

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
