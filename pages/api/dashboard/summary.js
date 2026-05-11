export const config = { maxDuration: 30 }

const API_VERSION = '2024-10'

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

function parseLink(header) {
  if (!header) return null
  const m = header.match(/<([^>]+)>;\s*rel="next"/)
  return m ? m[1] : null
}

async function fetchShopifyOrders(shop, token, from, to) {
  const headers = { 'X-Shopify-Access-Token': token, 'Accept': 'application/json' }
  const orders = []
  let url = `https://${shop}/admin/api/${API_VERSION}/orders.json?status=any&limit=250&created_at_min=${encodeURIComponent(from.toISOString())}&created_at_max=${encodeURIComponent(to.toISOString())}`
  let pages = 0
  while (url && pages < 8) {
    const r = await fetch(url, { headers })
    if (!r.ok) throw new Error(`Shopify ${r.status}: ${(await r.text()).substring(0, 200)}`)
    const data = await r.json()
    if (data.orders) orders.push(...data.orders)
    url = parseLink(r.headers.get('link'))
    pages++
  }
  return orders
}

export default async function handler(req, res) {
  const range = (req.query.range || 'today').toString()
  const { from, to, label } = rangeBounds(range)
  const shop = process.env.SHOPIFY_SHOP_DOMAIN
  const token = process.env.SHOPIFY_ADMIN_TOKEN

  const issues = []
  let revenue = 0
  let orderCount = 0
  let customerCount = 0
  let aov = 0

  if (!shop || !token) {
    issues.push({ name: 'Shopify', status: 'error', message: 'SHOPIFY_SHOP_DOMAIN / SHOPIFY_ADMIN_TOKEN missing' })
  } else {
    try {
      const orders = await fetchShopifyOrders(shop, token, from, to)
      const paid = orders.filter(o => o.financial_status !== 'refunded' && o.financial_status !== 'voided')
      revenue = paid.reduce((s, o) => s + parseFloat(o.total_price || 0), 0)
      orderCount = paid.length
      customerCount = new Set(paid.map(o => o.email).filter(Boolean)).size
      aov = orderCount > 0 ? revenue / orderCount : 0
    } catch (e) {
      issues.push({ name: 'Shopify', status: 'error', message: e.message })
    }
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
    issues,
    generatedAt: new Date().toISOString(),
  })
}
