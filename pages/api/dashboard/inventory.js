export const config = { maxDuration: 30 }

const API_VERSION = '2024-10'

function parseLink(header) {
  if (!header) return null
  const m = header.match(/<([^>]+)>;\s*rel="next"/)
  return m ? m[1] : null
}

async function fetchAllProducts(shop, token) {
  const out = []
  let url = `https://${shop}/admin/api/${API_VERSION}/products.json?limit=250&fields=id,title,vendor,product_type,handle,variants,status`
  let pages = 0
  while (url && pages < 10) {
    const r = await fetch(url, { headers: { 'X-Shopify-Access-Token': token, 'Accept': 'application/json' } })
    if (!r.ok) throw new Error(`Shopify ${r.status}`)
    const data = await r.json()
    if (data.products) out.push(...data.products)
    url = parseLink(r.headers.get('link'))
    pages++
  }
  return out
}

async function fetchSalesVelocity(shop, token, days = 30) {
  const since = new Date(Date.now() - days * 86400000).toISOString()
  const variantSales = new Map()
  let url = `https://${shop}/admin/api/${API_VERSION}/orders.json?status=any&limit=250&created_at_min=${encodeURIComponent(since)}`
  let pages = 0
  while (url && pages < 12) {
    const r = await fetch(url, { headers: { 'X-Shopify-Access-Token': token, 'Accept': 'application/json' } })
    if (!r.ok) break
    const data = await r.json()
    for (const o of (data.orders || [])) {
      if (o.cancelled_at) continue
      for (const li of (o.line_items || [])) {
        const id = li.variant_id
        if (!id) continue
        variantSales.set(id, (variantSales.get(id) || 0) + parseInt(li.quantity || 1))
      }
    }
    url = parseLink(r.headers.get('link'))
    pages++
  }
  return variantSales
}

export default async function handler(req, res) {
  const shop = process.env.SHOPIFY_SHOP_DOMAIN
  const token = process.env.SHOPIFY_ADMIN_TOKEN
  if (!shop || !token) return res.status(400).json({ error: 'Shopify env vars missing' })

  const days = parseInt(req.query.days || '30')

  try {
    const [products, velocity] = await Promise.all([
      fetchAllProducts(shop, token),
      fetchSalesVelocity(shop, token, days),
    ])

    const variants = []
    for (const p of products) {
      if (p.status !== 'active') continue
      for (const v of (p.variants || [])) {
        const qty = parseInt(v.inventory_quantity ?? 0)
        const sold = velocity.get(v.id) || 0
        const dailyVelocity = sold / days
        const daysRemaining = dailyVelocity > 0 ? qty / dailyVelocity : null
        const status = qty <= 0 ? 'out'
          : daysRemaining != null && daysRemaining < 7 ? 'critical'
          : daysRemaining != null && daysRemaining < 21 ? 'low'
          : 'ok'
        variants.push({
          productId: p.id,
          productTitle: p.title,
          variantId: v.id,
          variantTitle: v.title === 'Default Title' ? null : v.title,
          sku: v.sku || null,
          quantity: qty,
          sold30d: sold,
          dailyVelocity: Math.round(dailyVelocity * 10) / 10,
          daysRemaining: daysRemaining != null ? Math.round(daysRemaining) : null,
          status,
          price: parseFloat(v.price || 0),
          cost: parseFloat(v.cost || 0) || null,
        })
      }
    }

    variants.sort((a, b) => {
      const order = { out: 0, critical: 1, low: 2, ok: 3 }
      if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status]
      return (a.daysRemaining ?? 9999) - (b.daysRemaining ?? 9999)
    })

    const summary = {
      total: variants.length,
      out: variants.filter(v => v.status === 'out').length,
      critical: variants.filter(v => v.status === 'critical').length,
      low: variants.filter(v => v.status === 'low').length,
      ok: variants.filter(v => v.status === 'ok').length,
      totalUnits: variants.reduce((s, v) => s + v.quantity, 0),
    }

    res.status(200).json({ summary, variants, days, generatedAt: new Date().toISOString() })
  } catch (e) {
    res.status(502).json({ error: e.message })
  }
}
