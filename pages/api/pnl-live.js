import { supabase } from '../../lib/supabase'
import { getTransactions as getRevolutTxns, refreshAccessToken } from '../../lib/revolut'

export const config = { maxDuration: 60 }

const API_VERSION = '2024-10'
const WINDSOR_KEY = 'cc92158d0eb0f1faa257c0414780b6c10961'

const RATES = {
  cogs: 0.205,
  paymentProvider: 0.025,
  shippingFulfilment: 0.067,
}

// UK gateway processing fees (best-effort defaults)
const GATEWAY_RATES = {
  shopify_payments: { pct: 0.015, fixed: 0.20 },
  shop_pay: { pct: 0.015, fixed: 0.20 },
  shop_pay_installments: { pct: 0.015, fixed: 0.20 },
  shopify_installments: { pct: 0.015, fixed: 0.20 },
  stripe: { pct: 0.015, fixed: 0.20 },
  paypal: { pct: 0.029, fixed: 0.30 },
  paypal_express_checkout: { pct: 0.029, fixed: 0.30 },
  amazon_pay: { pct: 0.03, fixed: 0.20 },
  klarna: { pct: 0.0499, fixed: 0.20 },
}

function gatewayFee(order) {
  const total = parseFloat(order.total_price || 0)
  if (total <= 0) return 0
  const gateways = order.payment_gateway_names || []
  const key = (gateways[0] || '').toLowerCase().replace(/\s+/g, '_')
  const rate = GATEWAY_RATES[key]
  if (!rate) return total * RATES.paymentProvider // fall back to flat
  return total * rate.pct + rate.fixed
}

function refundsForOrder(order) {
  let amount = 0
  for (const r of (order.refunds || [])) {
    for (const t of (r.transactions || [])) {
      if (t.kind === 'refund' && t.status === 'success') {
        amount += parseFloat(t.amount || 0)
      }
    }
  }
  return amount
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

function chunk(arr, size) {
  const out = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

async function fetchVariantCosts(shop, token, variantIds) {
  const costs = new Map()
  if (!variantIds.length) return costs

  const variantToInvItem = new Map()
  for (const ids of chunk(variantIds, 100)) {
    const url = `https://${shop}/admin/api/${API_VERSION}/variants.json?ids=${ids.join(',')}&fields=id,inventory_item_id`
    try {
      const r = await fetch(url, { headers: { 'X-Shopify-Access-Token': token, 'Accept': 'application/json' } })
      if (!r.ok) continue
      const data = await r.json()
      for (const v of (data.variants || [])) {
        if (v.inventory_item_id) variantToInvItem.set(v.id, v.inventory_item_id)
      }
    } catch {}
  }

  const invItemIds = [...new Set(variantToInvItem.values())]
  const invItemCosts = new Map()
  for (const ids of chunk(invItemIds, 100)) {
    const url = `https://${shop}/admin/api/${API_VERSION}/inventory_items.json?ids=${ids.join(',')}`
    try {
      const r = await fetch(url, { headers: { 'X-Shopify-Access-Token': token, 'Accept': 'application/json' } })
      if (!r.ok) continue
      const data = await r.json()
      for (const it of (data.inventory_items || [])) {
        const c = parseFloat(it.cost || 0)
        if (c > 0) invItemCosts.set(it.id, c)
      }
    } catch {}
  }

  for (const [vId, itemId] of variantToInvItem.entries()) {
    const c = invItemCosts.get(itemId)
    if (c != null) costs.set(vId, c)
  }
  return costs
}

const DEFAULT_OPEX_PATTERNS = [
  // Karl's confirmed monthly OPEX vendors
  'openai',
  'canva',
  'amazon',
  'auctane', 'shipstation',
  'revolut',
  'klaviyo',
  'creativeos',
  'shopify',
  'claude',
  'pipeboard',
  'meshy',
  // Common UK business fees that should also count as OPEX
  'hmrc', 'companies house', 'gov.uk',
  'royal mail',
]

const INVENTORY_PATTERNS = [
  'klarna', 'alibaba', 'aliexpress', '1688', 'dhgate',
]

function buildRegex(patterns) {
  const escaped = patterns.map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  return new RegExp(`(${escaped.join('|')})`, 'i')
}

function buildOpexRegex() {
  const fromEnv = (process.env.OPEX_INCLUDE_PATTERNS || '').split(',').map(s => s.trim()).filter(Boolean)
  return buildRegex(fromEnv.length ? fromEnv : DEFAULT_OPEX_PATTERNS)
}

function buildInventoryRegex() {
  const fromEnv = (process.env.INVENTORY_PATTERNS || '').split(',').map(s => s.trim()).filter(Boolean)
  return buildRegex(fromEnv.length ? fromEnv : INVENTORY_PATTERNS)
}

function txnDescription(t, leg) {
  return [
    leg?.description,
    leg?.counterparty?.name,
    t?.merchant?.name,
    t?.reference,
    t?.description,
  ].filter(Boolean).join(' ').toLowerCase()
}

async function refreshAndStoreRevolut(integration) {
  const tokens = await refreshAccessToken(integration.refresh_token)
  await supabase.from('integrations').update({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token || integration.refresh_token,
    expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', 'revolut')
  return tokens.access_token
}

async function fetchRevolutOpex(from, to) {
  try {
    const { data: integration } = await supabase
      .from('integrations')
      .select('*')
      .eq('id', 'revolut')
      .maybeSingle()

    if (!integration?.access_token) return { connected: false, opex: 0, count: 0 }

    let accessToken = integration.access_token
    // Proactively refresh if expiring within 5 minutes
    const expiresAt = integration.expires_at ? new Date(integration.expires_at).getTime() : 0
    if (expiresAt - Date.now() < 5 * 60 * 1000 && integration.refresh_token) {
      try { accessToken = await refreshAndStoreRevolut(integration) }
      catch { return { connected: false, opex: 0, count: 0, error: 'Token refresh failed' } }
    }

    let txns
    try {
      txns = await getRevolutTxns(accessToken, {
        from: from.toISOString(),
        to: to.toISOString(),
        count: 1000,
      })
    } catch (e) {
      if (/401/.test(e.message) && integration.refresh_token) {
        try {
          accessToken = await refreshAndStoreRevolut(integration)
          txns = await getRevolutTxns(accessToken, {
            from: from.toISOString(),
            to: to.toISOString(),
            count: 1000,
          })
        } catch (retryErr) {
          return { connected: false, opex: 0, count: 0, error: `Refresh + retry failed: ${retryErr.message}` }
        }
      } else {
        return { connected: false, opex: 0, count: 0, error: e.message }
      }
    }

    const list = Array.isArray(txns) ? txns : (txns?.transactions || [])

    // Load any manual overrides for these txn ids
    const allLegIds = []
    for (const t of list) {
      for (const leg of (t.legs || [])) {
        if (leg.leg_id) allLegIds.push(leg.leg_id)
        else allLegIds.push(`${t.id}_${leg.account_id || '0'}`)
      }
    }
    let overrideMap = new Map()
    if (allLegIds.length) {
      const { data: ov } = await supabase
        .from('transaction_categories')
        .select('transaction_id, category')
        .in('transaction_id', allLegIds)
      for (const o of (ov || [])) overrideMap.set(o.transaction_id, o.category)
    }

    // Load counterparty-scoped rules so an "Ignore all from X" rule
    // takes effect on every Revolut leg from counterparty X.
    const counterparties = new Set()
    for (const t of list) {
      for (const leg of (t.legs || [])) {
        const cp = leg.counterparty?.name || t.merchant?.name
        if (cp) counterparties.add(cp)
      }
    }
    let ruleMap = new Map()
    if (counterparties.size) {
      const { data: rules } = await supabase
        .from('transaction_category_rules')
        .select('counterparty, category')
        .in('counterparty', Array.from(counterparties))
      for (const r of (rules || [])) ruleMap.set(r.counterparty, r.category)
    }

    const opexRegex = buildOpexRegex()
    const inventoryRegex = buildInventoryRegex()

    let opex = 0
    let byDay = {}
    let count = 0
    let inventoryCash = 0
    let inventoryCount = 0
    let excludedOpex = 0
    let excludedCount = 0
    const sampleExcluded = []
    const sampleIncluded = []
    const sampleInventory = []

    for (const t of list) {
      if (t.state !== 'completed') continue
      for (const leg of (t.legs || [])) {
        const amount = parseFloat(leg.amount || 0)
        if (amount >= 0) continue
        const desc = txnDescription(t, leg)
        const abs = Math.abs(amount)
        const day = (t.completed_at || t.created_at || '').substring(0, 10)
        const legId = leg.leg_id || `${t.id}_${leg.account_id || '0'}`
        const manualCategory = overrideMap.get(legId)
        const cpName = leg.counterparty?.name || t.merchant?.name || null
        const ruleCategory = cpName ? ruleMap.get(cpName) : null

        let category
        if (manualCategory) category = manualCategory
        else if (ruleCategory) category = ruleCategory
        else if (opexRegex.test(desc)) category = 'opex'
        else if (inventoryRegex.test(desc)) category = 'inventory'
        else category = 'ignore'

        if (category === 'opex') {
          opex += abs
          if (day) byDay[day] = (byDay[day] || 0) + abs
          count++
          if (sampleIncluded.length < 5) sampleIncluded.push({ desc: desc.substring(0, 60), amount: abs })
        } else if (category === 'inventory') {
          inventoryCash += abs
          inventoryCount++
          if (sampleInventory.length < 5) sampleInventory.push({ desc: desc.substring(0, 60), amount: abs })
        } else {
          excludedOpex += abs
          excludedCount++
          if (sampleExcluded.length < 5) sampleExcluded.push({ desc: desc.substring(0, 60), amount: abs })
        }
      }
    }

    return { connected: true, opex, count, byDay, inventoryCash, inventoryCount, sampleInventory, excludedOpex, excludedCount, sampleIncluded, sampleExcluded }
  } catch (e) {
    return { connected: false, opex: 0, count: 0, error: e.message }
  }
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

const COLLECTION_FALLBACK_COSTS = {
  inhaler: 8.00,
  flavour: 0.65,
  flavor: 0.65,
  refill: 0.65,
}

function collectionFallback(title) {
  if (!title) return null
  const lower = title.toLowerCase()
  for (const [keyword, cost] of Object.entries(COLLECTION_FALLBACK_COSTS)) {
    if (lower.includes(keyword)) return { keyword, cost }
  }
  return null
}

const r2 = (n, d = 2) => Math.round(n * 10 ** d) / 10 ** d
const pct = (n, d) => d > 0 ? r2((n / d) * 100) : 0

async function fetchUploadedShipping(orderNumbers) {
  if (!orderNumbers.length) return new Map()
  try {
    const { data } = await supabase
      .from('shipping_costs')
      .select('order_number,cost')
      .in('order_number', orderNumbers.map(String))
    const map = new Map()
    for (const row of (data || [])) map.set(String(row.order_number), parseFloat(row.cost || 0))
    return map
  } catch { return new Map() }
}

async function computePeriod(shop, token, from, to, opexOverride, withSeries) {
  const [orders, meta, google, revolut] = await Promise.all([
    fetchShopifyOrders(shop, token, from, to).catch(e => { return { __error: e.message } }),
    fetchWindsorSpend('facebook', from, to),
    fetchWindsorSpend('google_ads', from, to),
    fetchRevolutOpex(from, to),
  ])
  if (orders.__error) throw new Error(orders.__error)

  // Build variant cost map from orders' line items
  const variantIds = new Set()
  const orderNumbers = []
  for (const o of orders) {
    if (o.order_number != null) orderNumbers.push(String(o.order_number))
    for (const li of (o.line_items || [])) {
      if (li.variant_id) variantIds.add(li.variant_id)
    }
  }
  const [variantCosts, shippingMap] = await Promise.all([
    fetchVariantCosts(shop, token, [...variantIds]),
    fetchUploadedShipping(orderNumbers),
  ])

  // Build accurate New vs Returning classification per order.
  // Strategy: group orders by customer (email or customer_id). Use
  // customer.orders_count to know their lifetime total; compare to
  // orders-in-period count to detect prior orders. If they had any
  // orders BEFORE this period, all in-period orders are RC. Otherwise
  // their FIRST in-period order (by date) is NC, the rest are RC.
  const byCustomer = new Map()
  for (const o of orders) {
    const key = o.customer?.id || o.email || `anon_${o.id}`
    if (!byCustomer.has(key)) byCustomer.set(key, { orders: [], lifetime: 0 })
    const c = byCustomer.get(key)
    c.orders.push(o)
    c.lifetime = Math.max(c.lifetime, o.customer?.orders_count || 1)
  }
  const orderIsNew = new Map() // order id -> bool
  for (const c of byCustomer.values()) {
    const inPeriod = c.orders.length
    const priorOrders = Math.max(0, c.lifetime - inPeriod)
    const sorted = [...c.orders].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    sorted.forEach((o, idx) => {
      orderIsNew.set(o.id, priorOrders === 0 && idx === 0)
    })
  }

  const opex = opexOverride !== null ? opexOverride : (revolut.connected ? revolut.opex : 0)

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
  let cogsReal = 0, cogsCollection = 0, cogsFallback = 0
  let lineItemsTotal = 0, lineItemsWithCost = 0, lineItemsCollection = 0
  let shippingReal = 0, shippingRateFallback = 0
  let ordersWithShipping = 0, ordersWithoutShipping = 0
  let paymentFeesReal = 0
  let ordersWithGatewayRate = 0, ordersWithoutGatewayRate = 0
  const gatewayBreakdown = {}

  for (const o of orders) {
    const d = (o.created_at || '').substring(0, 10)
    if (!days[d]) continue
    const total = parseFloat(o.total_price || 0)
    const ship = parseFloat(o.total_shipping_price_set?.shop_money?.amount || 0)
    const disc = parseFloat(o.total_discounts || 0)
    const refundAmount = refundsForOrder(o)
    const isCancelled = !!o.cancelled_at
    const isNew = orderIsNew.get(o.id) || false
    if (isCancelled) { cancellations += total; days[d].cancellations += total; continue }
    if (refundAmount > 0) { returns += refundAmount; days[d].returns += refundAmount }
    totalRevenue += total; shippingCharges += ship; discounts += disc; orderCount += 1
    days[d].totalRevenue += total; days[d].shippingCharges += ship; days[d].orders += 1

    // Real payment fees from gateway
    const gateways = o.payment_gateway_names || []
    const primaryGateway = gateways[0] || 'unknown'
    const gatewayKey = primaryGateway.toLowerCase().replace(/\s+/g, '_')
    const hasGatewayRate = !!GATEWAY_RATES[gatewayKey]
    const fee = gatewayFee(o)
    paymentFeesReal += fee
    if (hasGatewayRate) ordersWithGatewayRate++
    else ordersWithoutGatewayRate++
    if (!gatewayBreakdown[primaryGateway]) gatewayBreakdown[primaryGateway] = { count: 0, fees: 0, revenue: 0 }
    gatewayBreakdown[primaryGateway].count++
    gatewayBreakdown[primaryGateway].fees += fee
    gatewayBreakdown[primaryGateway].revenue += total

    for (const li of (o.line_items || [])) {
      const qty = parseInt(li.quantity || 1)
      lineItemsTotal++
      const unitCost = variantCosts.get(li.variant_id)
      if (unitCost != null) {
        cogsReal += qty * unitCost
        lineItemsWithCost++
      } else {
        const cf = collectionFallback(li.title || li.name)
        if (cf) {
          cogsCollection += qty * cf.cost
          lineItemsCollection++
        } else {
          cogsFallback += qty * parseFloat(li.price || 0) * RATES.cogs
        }
      }
    }

    // Shipping cost per order
    const orderNum = o.order_number != null ? String(o.order_number) : null
    const uploadedShip = orderNum != null ? shippingMap.get(orderNum) : undefined
    if (uploadedShip != null) {
      shippingReal += uploadedShip
      ordersWithShipping++
    } else {
      shippingRateFallback += total * RATES.shippingFulfilment
      ordersWithoutShipping++
    }

    if (isNew) { ncOrders += 1; ncRevenue += total; days[d].ncOrders += 1; days[d].ncRevenue += total }
    else { rcOrders += 1; rcRevenue += total; days[d].rcOrders += 1; days[d].rcRevenue += total }
  }

  const cogs = cogsReal + cogsCollection + cogsFallback
  const cogsSource = lineItemsTotal === 0 ? 'none'
    : lineItemsWithCost === lineItemsTotal ? 'shopify'
    : (lineItemsWithCost + lineItemsCollection) === lineItemsTotal ? 'shopify+collection'
    : lineItemsWithCost === 0 && lineItemsCollection === 0 ? 'rate'
    : 'hybrid'

  const netSales = totalRevenue - returns
  const paymentProviders = paymentFeesReal
  const paymentSource = orderCount === 0 ? 'none'
    : ordersWithoutGatewayRate === 0 ? 'gateway'
    : ordersWithGatewayRate === 0 ? 'rate'
    : 'hybrid'
  const shippingFulfilment = shippingReal + shippingRateFallback
  const shippingSource = ordersWithShipping + ordersWithoutShipping === 0 ? 'none'
    : ordersWithoutShipping === 0 ? 'uploaded'
    : ordersWithShipping === 0 ? 'rate'
    : 'hybrid'
  const salesExpenses = paymentProviders + cogs + shippingFulfilment
  const metaSpend = meta.total
  const googleSpend = google.total
  const marketingExpenses = metaSpend + googleSpend
  const contributionProfit = totalRevenue - salesExpenses - marketingExpenses
  const ebitda = contributionProfit - opex

  const totals = {
    from: from.toISOString(), to: to.toISOString(),
    revenue: { netSales: r2(netSales), returns: r2(returns), cancellations: r2(cancellations), shippingCharges: r2(shippingCharges), discounts: r2(discounts), totalRevenue: r2(totalRevenue) },
    costs: { paymentProviders: r2(paymentProviders), paymentSource, gatewayBreakdown: Object.fromEntries(Object.entries(gatewayBreakdown).map(([k, v]) => [k, { count: v.count, fees: r2(v.fees), revenue: r2(v.revenue) }])), ordersWithGatewayRate, ordersWithoutGatewayRate, cogs: r2(cogs), cogsReal: r2(cogsReal), cogsCollection: r2(cogsCollection), cogsFallback: r2(cogsFallback), cogsSource, lineItemsTotal, lineItemsWithCost, lineItemsCollection, shippingFulfilment: r2(shippingFulfilment), shippingReal: r2(shippingReal), shippingRateFallback: r2(shippingRateFallback), shippingSource, ordersWithShipping, ordersWithoutShipping, salesExpenses: r2(salesExpenses), metaSpend: r2(metaSpend), googleSpend: r2(googleSpend), marketingExpenses: r2(marketingExpenses), marketingPctRevenue: pct(marketingExpenses, totalRevenue), marketingPctNetSales: pct(marketingExpenses, netSales), opex: r2(opex), opexPctRevenue: pct(opex, totalRevenue) },
    profit: { contributionProfit: r2(contributionProfit), contributionProfitPct: pct(contributionProfit, totalRevenue), ebitda: r2(ebitda), ebitdaPct: pct(ebitda, totalRevenue) },
    kpis: { totalSales: r2(totalRevenue), totalOrders: orderCount, aov: orderCount > 0 ? r2(totalRevenue / orderCount) : 0, ecpa: orderCount > 0 ? r2(marketingExpenses / orderCount) : 0, eroas: marketingExpenses > 0 ? r2(totalRevenue / marketingExpenses, 2) : 0 },
    newCustomers: { sales: r2(ncRevenue), orders: ncOrders, aov: ncOrders > 0 ? r2(ncRevenue / ncOrders) : 0, cpa: ncOrders > 0 ? r2(marketingExpenses / ncOrders) : 0, roas: marketingExpenses > 0 ? r2(ncRevenue / marketingExpenses, 2) : 0 },
    returningCustomers: { sales: r2(rcRevenue), orders: rcOrders, aov: rcOrders > 0 ? r2(rcRevenue / rcOrders) : 0 },
  }

  let series = null
  if (withSeries) {
    const dayCount = Object.keys(days).length || 1
    const opexPerDay = opex / dayCount
    series = Object.values(days).map(d => {
      const md = meta.byDay[d.date] || 0
      const gd = google.byDay[d.date] || 0
      const dailyOpex = revolut.byDay?.[d.date] != null && opexOverride === null ? revolut.byDay[d.date] : opexPerDay
      d.netSales = d.totalRevenue - d.returns
      d.metaSpend = md
      d.googleSpend = gd
      d.marketingExpenses = md + gd
      d.contributionProfit = d.totalRevenue - (d.totalRevenue * (RATES.cogs + RATES.paymentProvider + RATES.shippingFulfilment)) - d.marketingExpenses
      d.opex = dailyOpex
      d.ebitda = d.contributionProfit - dailyOpex
      return d
    })
  }

  return { totals, series, revolut }
}

function shiftedBounds(from, to, kind) {
  const f = new Date(from)
  const t = new Date(to)
  if (kind === 'prevPeriod') {
    const diff = t.getTime() - f.getTime()
    const prevTo = new Date(f.getTime() - 1)
    const prevFrom = new Date(prevTo.getTime() - diff)
    return { from: prevFrom, to: prevTo }
  }
  if (kind === 'lastYear') {
    const prevFrom = new Date(f); prevFrom.setFullYear(prevFrom.getFullYear() - 1)
    const prevTo = new Date(t); prevTo.setFullYear(prevTo.getFullYear() - 1)
    return { from: prevFrom, to: prevTo }
  }
  return { from: f, to: t }
}

export default async function handler(req, res) {
  const range = (req.query.range || '30d').toString()
  const { from, to, label } = rangeBounds(range, req.query.from, req.query.to)
  const shop = process.env.SHOPIFY_SHOP_DOMAIN
  const token = process.env.SHOPIFY_ADMIN_TOKEN
  const opexOverride = req.query.opex !== undefined ? parseFloat(req.query.opex) : null
  const compare = req.query.compare !== 'false'

  if (!shop || !token) {
    return res.status(400).json({ error: 'Shopify env vars missing' })
  }

  const prevP = shiftedBounds(from, to, 'prevPeriod')
  const lastY = shiftedBounds(from, to, 'lastYear')

  let current, prevPeriod = null, lastYear = null
  try {
    if (compare) {
      const [c, p, y] = await Promise.all([
        computePeriod(shop, token, from, to, opexOverride, true),
        computePeriod(shop, token, prevP.from, prevP.to, opexOverride, false).catch(() => null),
        computePeriod(shop, token, lastY.from, lastY.to, opexOverride, false).catch(() => null),
      ])
      current = c
      prevPeriod = p
      lastYear = y
    } else {
      current = await computePeriod(shop, token, from, to, opexOverride, true)
    }
  } catch (e) {
    return res.status(502).json({ error: e.message })
  }

  const revolut = current.revolut

  res.status(200).json({
    range, label, from: from.toISOString(), to: to.toISOString(),
    series: current.series,
    totals: current.totals,
    comparisons: {
      prevPeriod: prevPeriod ? { from: prevP.from.toISOString(), to: prevP.to.toISOString(), totals: prevPeriod.totals } : null,
      lastYear: lastYear ? { from: lastY.from.toISOString(), to: lastY.to.toISOString(), totals: lastYear.totals } : null,
    },
    rates: RATES,
    opexSource: opexOverride !== null ? 'override' : (revolut.connected ? 'revolut' : 'none'),
    revolut: {
      connected: revolut.connected,
      opex: r2(revolut.opex || 0),
      transactions: revolut.count,
      inventoryCash: r2(revolut.inventoryCash || 0),
      inventoryCount: revolut.inventoryCount || 0,
      sampleInventory: revolut.sampleInventory || [],
      excludedOpex: r2(revolut.excludedOpex || 0),
      excludedCount: revolut.excludedCount || 0,
      sampleIncluded: revolut.sampleIncluded || [],
      sampleExcluded: revolut.sampleExcluded || [],
      error: revolut.error || null,
    },
    generatedAt: new Date().toISOString(),
  })
}
