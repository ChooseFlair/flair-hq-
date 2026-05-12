export const config = { maxDuration: 60 }

const API_VERSION = '2024-10'
const WINDSOR_KEY = 'cc92158d0eb0f1faa257c0414780b6c10961'

const RATES = {
  cogs: 0.205,
  paymentProvider: 0.025,
  shippingFulfilment: 0.067,
}

function rangeBounds(range, customFrom, customTo) {
  const now = new Date()
  const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
  const endOfDay = (d) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x }
  if (range === 'custom' && customFrom && customTo) {
    return { from: startOfDay(new Date(customFrom)), to: endOfDay(new Date(customTo)), label: `${customFrom} → ${customTo}` }
  }
  if (range === '7d') { const f = new Date(now); f.setDate(f.getDate() - 6); return { from: startOfDay(f), to: endOfDay(now), label: 'Last 7 days' } }
  if (range === '30d') { const f = new Date(now); f.setDate(f.getDate() - 29); return { from: startOfDay(f), to: endOfDay(now), label: 'Last 30 days' } }
  if (range === '90d') { const f = new Date(now); f.setDate(f.getDate() - 89); return { from: startOfDay(f), to: endOfDay(now), label: 'Last 90 days' } }
  if (range === 'mtd') { const f = new Date(now.getFullYear(), now.getMonth(), 1); return { from: startOfDay(f), to: endOfDay(now), label: 'Month to date' } }
  if (range === 'ytd') { const f = new Date(now.getFullYear(), 0, 1); return { from: startOfDay(f), to: endOfDay(now), label: 'Year to date' } }
  if (range === 'yesterday') { const y = new Date(now); y.setDate(y.getDate() - 1); return { from: startOfDay(y), to: endOfDay(y), label: 'Yesterday' } }
  return { from: startOfDay(now), to: endOfDay(now), label: 'Today' }
}

function parseLink(header) {
  if (!header) return null
  const m = header.match(/<([^>]+)>;\s*rel="next"/)
  return m ? m[1] : null
}

async function fetchShopifyOrders(shop, token, from, to) {
  const orders = []
  let url = `https://${shop}/admin/api/${API_VERSION}/orders.json?status=any&limit=250&created_at_min=${encodeURIComponent(from.toISOString())}&created_at_max=${encodeURIComponent(to.toISOString())}`
  let pages = 0
  while (url && pages < 16) {
    const r = await fetch(url, { headers: { 'X-Shopify-Access-Token': token, 'Accept': 'application/json' } })
    if (!r.ok) throw new Error(`Shopify ${r.status}: ${(await r.text()).substring(0, 200)}`)
    const data = await r.json()
    if (data.orders) orders.push(...data.orders)
    url = parseLink(r.headers.get('link'))
    pages++
  }
  return orders
}

async function fetchWindsorSpend(source, from, to) {
  const dateFrom = from.toISOString().split('T')[0]
  const dateTo = to.toISOString().split('T')[0]
  const url = `https://connectors.windsor.ai/${source}?api_key=${WINDSOR_KEY}&fields=spend,date&date_from=${dateFrom}&date_to=${dateTo}&_renderer=json`
  try {
    const r = await fetch(url)
    if (!r.ok) return { byDay: {}, total: 0 }
    const data = await r.json()
    const rows = Array.isArray(data) ? data : (data?.data || [])
    const byDay = {}
    let total = 0
    for (const row of rows) {
      const d = (row.date || '').substring(0, 10)
      const v = parseFloat(row.spend || 0)
      if (!d) continue
      byDay[d] = (byDay[d] || 0) + v
      total += v
    }
    return { byDay, total }
  } catch { return { byDay: {}, total: 0 } }
}

const r2 = (n, d = 2) => Math.round(n * 10 ** d) / 10 ** d

export default async function handler(req, res) {
  const range = (req.query.range || '30d').toString()
  const { from, to, label } = rangeBounds(range, req.query.from, req.query.to)
  const shop = process.env.SHOPIFY_SHOP_DOMAIN
  const token = process.env.SHOPIFY_ADMIN_TOKEN
  const opex = parseFloat(req.query.opex || '0')

  if (!shop || !token) {
    return res.status(400).json({ error: 'Shopify env vars missing' })
  }

  const [orders, meta, google] = await Promise.all([
    fetchShopifyOrders(shop, token, from, to).catch(e => { return { __error: e.message } }),
    fetchWindsorSpend('facebook', from, to),
    fetchWindsorSpend('google_ads', from, to),
  ])

  if (orders.__error) return res.status(502).json({ error: orders.__error })

  const days = {}
  for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
    const key = d.toISOString().split('T')[0]
    days[key] = {
      date: key,
      totalRevenue: 0, netSales: 0, returns: 0, cancellations: 0, shippingCharges: 0,
      orders: 0, ncOrders: 0, rcOrders: 0,
      ncRevenue: 0, rcRevenue: 0,
    }
  }

  let totalRevenue = 0, returns = 0, cancellations = 0, shippingCharges = 0, discounts = 0
  let orderCount = 0, ncOrders = 0, rcOrders = 0
  let ncRevenue = 0, rcRevenue = 0

  for (const o of orders) {
    const d = (o.created_at || '').substring(0, 10)
    if (!days[d]) continue
    const total = parseFloat(o.total_price || 0)
    const ship = parseFloat(o.total_shipping_price_set?.shop_money?.amount || 0)
    const disc = parseFloat(o.total_discounts || 0)
    const isRefunded = o.financial_status === 'refunded'
    const isCancelled = !!o.cancelled_at
    const isNew = (o.customer?.orders_count || 1) === 1

    if (isCancelled) {
      cancellations += total
      days[d].cancellations += total
      continue
    }
    if (isRefunded) {
      returns += total
      days[d].returns += total
    }

    totalRevenue += total
    shippingCharges += ship
    discounts += disc
    orderCount += 1
    days[d].totalRevenue += total
    days[d].shippingCharges += ship
    days[d].orders += 1

    if (isNew) {
      ncOrders += 1
      ncRevenue += total
      days[d].ncOrders += 1
      days[d].ncRevenue += total
    } else {
      rcOrders += 1
      rcRevenue += total
      days[d].rcOrders += 1
      days[d].rcRevenue += total
    }
  }

  const netSales = totalRevenue - returns
  const paymentProviders = totalRevenue * RATES.paymentProvider
  const cogs = totalRevenue * RATES.cogs
  const shippingFulfilment = totalRevenue * RATES.shippingFulfilment
  const salesExpenses = paymentProviders + cogs + shippingFulfilment
  const metaSpend = meta.total
  const googleSpend = google.total
  const marketingExpenses = metaSpend + googleSpend
  const contributionProfit = totalRevenue - salesExpenses - marketingExpenses
  const ebitda = contributionProfit - opex

  const series = Object.values(days).map(d => {
    const md = meta.byDay[d.date] || 0
    const gd = google.byDay[d.date] || 0
    d.netSales = d.totalRevenue - d.returns
    d.metaSpend = md
    d.googleSpend = gd
    d.marketingExpenses = md + gd
    d.contributionProfit = d.totalRevenue - (d.totalRevenue * (RATES.cogs + RATES.paymentProvider + RATES.shippingFulfilment)) - d.marketingExpenses
    return d
  })

  const pct = (n, d) => d > 0 ? r2((n / d) * 100) : 0

  res.status(200).json({
    range, label, from: from.toISOString(), to: to.toISOString(),
    series,
    totals: {
      revenue: {
        netSales: r2(netSales),
        returns: r2(returns),
        cancellations: r2(cancellations),
        shippingCharges: r2(shippingCharges),
        discounts: r2(discounts),
        totalRevenue: r2(totalRevenue),
      },
      costs: {
        paymentProviders: r2(paymentProviders),
        cogs: r2(cogs),
        shippingFulfilment: r2(shippingFulfilment),
        salesExpenses: r2(salesExpenses),
        metaSpend: r2(metaSpend),
        googleSpend: r2(googleSpend),
        marketingExpenses: r2(marketingExpenses),
        marketingPctRevenue: pct(marketingExpenses, totalRevenue),
        marketingPctNetSales: pct(marketingExpenses, netSales),
        opex: r2(opex),
        opexPctRevenue: pct(opex, totalRevenue),
      },
      profit: {
        contributionProfit: r2(contributionProfit),
        contributionProfitPct: pct(contributionProfit, totalRevenue),
        ebitda: r2(ebitda),
        ebitdaPct: pct(ebitda, totalRevenue),
      },
      kpis: {
        totalSales: r2(totalRevenue),
        totalOrders: orderCount,
        aov: orderCount > 0 ? r2(totalRevenue / orderCount) : 0,
        ecpa: orderCount > 0 ? r2(marketingExpenses / orderCount) : 0,
        eroas: marketingExpenses > 0 ? r2(totalRevenue / marketingExpenses, 2) : 0,
      },
      newCustomers: {
        sales: r2(ncRevenue),
        orders: ncOrders,
        aov: ncOrders > 0 ? r2(ncRevenue / ncOrders) : 0,
        cpa: ncOrders > 0 ? r2(marketingExpenses / ncOrders) : 0,
        roas: marketingExpenses > 0 ? r2(ncRevenue / marketingExpenses, 2) : 0,
      },
      returningCustomers: {
        sales: r2(rcRevenue),
        orders: rcOrders,
        aov: rcOrders > 0 ? r2(rcRevenue / rcOrders) : 0,
      },
    },
    rates: RATES,
    generatedAt: new Date().toISOString(),
  })
}
