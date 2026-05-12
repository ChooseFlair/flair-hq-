import { supabase } from '../../lib/supabase'

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY
const KLAVIYO_KEY = process.env.KLAVIYO_API_KEY || 'pk_bce69162bc267f14cbb31eff287d6c10c8'
const WINDSOR_KEY = 'cc92158d0eb0f1faa257c0414780b6c10961'

async function getOrdersSummary() {
  const { data: orders } = await supabase
    .from('orders')
    .select('total_price, financial_status, fulfillment_status, created_at, email')
    .order('created_at', { ascending: false })
    .limit(500)

  if (!orders?.length) return { error: 'No orders found' }

  const now = new Date()
  const d7 = new Date(now - 7 * 86400000)
  const d30 = new Date(now - 30 * 86400000)

  const recent7 = orders.filter(o => new Date(o.created_at) >= d7)
  const recent30 = orders.filter(o => new Date(o.created_at) >= d30)
  const refunds = orders.filter(o => o.financial_status === 'refunded')

  return {
    total_orders: orders.length,
    total_revenue: orders.reduce((s, o) => s + parseFloat(o.total_price || 0), 0).toFixed(2),
    last_7_days: { orders: recent7.length, revenue: recent7.reduce((s, o) => s + parseFloat(o.total_price || 0), 0).toFixed(2) },
    last_30_days: { orders: recent30.length, revenue: recent30.reduce((s, o) => s + parseFloat(o.total_price || 0), 0).toFixed(2) },
    avg_order_value: (orders.reduce((s, o) => s + parseFloat(o.total_price || 0), 0) / orders.length).toFixed(2),
    refund_count: refunds.length,
    unique_customers: new Set(orders.map(o => o.email).filter(Boolean)).size,
  }
}

async function getRecentOrders(limit = 10) {
  const { data } = await supabase
    .from('orders')
    .select('order_number, email, total_price, financial_status, fulfillment_status, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)
  return data || []
}

async function getCustomerInsights() {
  const { data } = await supabase
    .from('customers')
    .select('email, total_spent, order_count')
    .order('total_spent', { ascending: false })
    .limit(20)
  return {
    top_customers: (data || []).map(c => ({ email: c.email, spent: c.total_spent, orders: c.order_count })),
    total_in_db: data?.length || 0,
  }
}

async function getKlaviyoMetrics() {
  const headers = {
    'Authorization': `Klaviyo-API-Key ${KLAVIYO_KEY}`,
    'revision': '2024-10-15',
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
  try {
    const [profilesRes, flowsRes, listsRes] = await Promise.all([
      fetch('https://a.klaviyo.com/api/profiles/?page[size]=1', { headers }),
      fetch('https://a.klaviyo.com/api/flows/?fields[flow]=name,status,trigger_type', { headers }),
      fetch('https://a.klaviyo.com/api/lists/?fields[list]=name', { headers }),
    ])
    const profiles = await profilesRes.json()
    const flows = await flowsRes.json()
    const lists = await listsRes.json()

    return {
      total_profiles: profiles.meta?.total || 'unknown',
      flows: (flows.data || []).map(f => ({ name: f.attributes.name, status: f.attributes.status })),
      lists: (lists.data || []).map(l => ({ name: l.attributes.name, id: l.id })),
    }
  } catch (e) {
    return { error: e.message }
  }
}

async function getMetaAdsData() {
  const { data: daily } = await supabase.from('meta_ads_daily').select('*').order('date', { ascending: false }).limit(1)
  const { data: campaigns } = await supabase.from('meta_ads_campaigns').select('*')
  return {
    latest_daily: daily?.[0] || null,
    campaigns: (campaigns || []).map(c => ({
      name: c.campaign_name, status: c.status, spend: c.spend, roas: c.roas, purchases: c.purchases,
    })),
  }
}

async function getPnLSummary() {
  const { data: orders } = await supabase
    .from('orders')
    .select('total_price, created_at')
    .order('created_at', { ascending: false })

  const { data: overrides } = await supabase
    .from('pnl_monthly_overrides')
    .select('*')
    .order('month', { ascending: false })
    .limit(6)

  const totalRevenue = (orders || []).reduce((s, o) => s + parseFloat(o.total_price || 0), 0)
  const totalAdSpend = (overrides || []).reduce((s, o) => s + parseFloat(o.meta_spend || 0) + parseFloat(o.google_spend || 0), 0)

  return {
    total_revenue: totalRevenue.toFixed(2),
    total_orders: orders?.length || 0,
    recent_months_ad_spend: (overrides || []).map(o => ({ month: o.month, meta: o.meta_spend, google: o.google_spend })),
    total_ad_spend: totalAdSpend.toFixed(2),
    estimated_roas: totalAdSpend > 0 ? (totalRevenue / totalAdSpend).toFixed(2) : 'N/A',
  }
}

async function getWindsorData() {
  try {
    const to = new Date().toISOString().split('T')[0]
    const from = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
    const url = `https://connectors.windsor.ai/all?api_key=${WINDSOR_KEY}&fields=source,spend,clicks,impressions,date&date_from=${from}&date_to=${to}&_renderer=json`
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) })
    if (!res.ok) return { error: `Windsor ${res.status}` }
    const data = await res.json()
    const rows = Array.isArray(data) ? data : (data?.data || [])

    const bySource = {}
    for (const r of rows) {
      const src = r.source || 'unknown'
      if (!bySource[src]) bySource[src] = { spend: 0, clicks: 0, impressions: 0 }
      bySource[src].spend += parseFloat(r.spend || 0)
      bySource[src].clicks += parseInt(r.clicks || 0)
      bySource[src].impressions += parseInt(r.impressions || 0)
    }
    return { period: `${from} to ${to}`, sources: bySource, total_rows: rows.length }
  } catch (e) {
    return { error: e.message }
  }
}

async function getKlaviyoFlows() {
  const { data } = await supabase
    .from('klaviyo_flows')
    .select('flow_name, status, trigger_type, recipients, conversions, conversion_value, open_rate, click_rate')
  return data || []
}

async function getProducts() {
  const { data } = await supabase.from('products').select('title, sku, price, inventory_quantity, status').limit(50)
  return data || []
}

function baseUrlFor(req) {
  const host = req.headers['x-forwarded-host'] || req.headers.host
  const proto = req.headers['x-forwarded-proto'] || (host?.includes('localhost') ? 'http' : 'https')
  return `${proto}://${host}`
}

async function callInternal(req, path) {
  try {
    const r = await fetch(`${baseUrlFor(req)}${path}`)
    return await r.json()
  } catch (e) { return { error: e.message } }
}

// New live tools that hit the same endpoints the UI uses
async function getPnlLive(req, input = {}) {
  const range = input.range || '30d'
  const q = new URLSearchParams({ range, compare: 'false' })
  const j = await callInternal(req, `/api/pnl-live?${q}`)
  if (j.error) return { error: j.error }
  return {
    range: j.label,
    revenue: j.totals?.revenue,
    costs: { paymentProviders: j.totals?.costs?.paymentProviders, cogs: j.totals?.costs?.cogs, shippingFulfilment: j.totals?.costs?.shippingFulfilment, marketingExpenses: j.totals?.costs?.marketingExpenses, opex: j.totals?.costs?.opex },
    profit: j.totals?.profit,
    kpis: j.totals?.kpis,
    newCustomers: j.totals?.newCustomers,
    returningCustomers: j.totals?.returningCustomers,
    opexSource: j.opexSource,
  }
}

async function getInventoryStatus(req) {
  const j = await callInternal(req, '/api/dashboard/inventory')
  if (j.error) return { error: j.error }
  const critical = (j.variants || []).filter(v => v.status === 'out' || v.status === 'critical' || v.status === 'low')
  return {
    summary: j.summary,
    needsAttention: critical.map(v => ({
      product: v.productTitle + (v.variantTitle ? ` (${v.variantTitle})` : ''),
      sku: v.sku,
      stock: v.quantity,
      daysLeft: v.daysRemaining,
      status: v.status,
    })).slice(0, 20),
  }
}

async function getCashPosition(req) {
  const j = await callInternal(req, '/api/dashboard/cash')
  if (j.error) return { error: j.error }
  return {
    connected: j.connected,
    totalGBP: j.totalGBP,
    byCurrency: j.byCurrency,
    runwayMonths: j.runwayMonths,
    accounts: j.accounts,
  }
}

async function getEmailPerformance(req, input = {}) {
  const range = input.range || '30d'
  const j = await callInternal(req, `/api/dashboard/email-performance?range=${range}`)
  if (j.error) return { error: j.error }
  return {
    range: j.label,
    totals: j.totals,
    topFlows: (j.flows || []).slice(0, 5).map(f => ({ name: f.name, status: f.status, revenue: f.revenue, openRate: f.openRate, clickRate: f.clickRate })),
    topCampaigns: (j.campaigns || []).slice(0, 5).map(c => ({ name: c.name, sendTime: c.sendTime, revenue: c.revenue, openRate: c.openRate, clickRate: c.clickRate })),
  }
}

async function getTodaySummary(req) {
  const j = await callInternal(req, '/api/dashboard/summary?range=today')
  if (j.error) return { error: j.error }
  return { revenue: j.revenue, orders: j.orderCount, customers: j.customerCount, aov: j.aov, adSpend: j.adSpend, roas: j.roas, issues: j.issues }
}

async function getConnectorHealth(req) {
  const j = await callInternal(req, '/api/dashboard/connector-status')
  return { connectors: (j.connectors || []).map(c => ({ name: c.name, status: c.status, reason: c.statusReason })) }
}

async function getAccountCredentials(req, input = {}) {
  let query = supabase.from('accounts').select('platform, url, email, password, notes')
  if (input.platform) {
    query = query.ilike('platform', `%${input.platform}%`)
  }
  const { data, error } = await query.order('sort_order', { ascending: true }).limit(20)
  if (error) return { error: error.message }
  return { accounts: data || [] }
}

const TOOLS = [
  // Live data tools (use new endpoints)
  { name: 'get_pnl', description: 'Get live P&L for a date range: revenue breakdown, costs, profit, EBITDA, contribution, KPIs, new vs returning customer split. Use this for any margin/profit/EBITDA question.', input_schema: { type: 'object', properties: { range: { type: 'string', enum: ['today', 'yesterday', '7d', '30d', '90d', 'mtd', 'ytd'], description: 'Date range, defaults to 30d' } }, required: [] }, fn: getPnlLive },
  { name: 'get_inventory_status', description: 'Get current Shopify stock levels with stockout alerts. Returns variants that are out/critical/low along with days of stock remaining.', input_schema: { type: 'object', properties: {}, required: [] }, fn: getInventoryStatus },
  { name: 'get_cash_position', description: 'Get current Revolut cash balance, balance by currency, and months of runway at current burn.', input_schema: { type: 'object', properties: {}, required: [] }, fn: getCashPosition },
  { name: 'get_email_performance', description: 'Get Klaviyo flow + campaign performance: attributed revenue, opens, clicks, conversions. Returns top performers.', input_schema: { type: 'object', properties: { range: { type: 'string', enum: ['7d', '30d', '90d', 'mtd', 'ytd'], description: 'Date range, defaults to 30d' } }, required: [] }, fn: getEmailPerformance },
  { name: 'get_today_summary', description: 'Get today headline numbers: revenue, orders, customers, AOV, ad spend, ROAS.', input_schema: { type: 'object', properties: {}, required: [] }, fn: getTodaySummary },
  { name: 'get_connector_health', description: 'Get health status of every connected integration (Shopify, Klaviyo, Meta, PayPal, Windsor).', input_schema: { type: 'object', properties: {}, required: [] }, fn: getConnectorHealth },
  { name: 'get_account_credentials', description: 'Look up platform login credentials (email, password, URL, notes). Use the platform parameter to filter by name like "shopify" or "klaviyo". Omit to list all.', input_schema: { type: 'object', properties: { platform: { type: 'string', description: 'Platform name to filter by, case-insensitive partial match' } }, required: [] }, fn: getAccountCredentials },
  // Legacy Supabase-backed tools (still useful for historical lookups)
  { name: 'get_orders_summary', description: 'Get overall order stats from local Shopify mirror', input_schema: { type: 'object', properties: {}, required: [] }, fn: getOrdersSummary },
  { name: 'get_recent_orders', description: 'Get the 10 most recent orders with details (order number, email, price, status)', input_schema: { type: 'object', properties: {}, required: [] }, fn: () => getRecentOrders(10) },
  { name: 'get_customer_insights', description: 'Get top customers by spending, total customer count', input_schema: { type: 'object', properties: {}, required: [] }, fn: getCustomerInsights },
  { name: 'get_products', description: 'Get product catalog: titles, prices, inventory levels, SKUs', input_schema: { type: 'object', properties: {}, required: [] }, fn: getProducts },
]

const TOOL_DEFS = TOOLS.map(t => ({
  name: t.name,
  description: t.description,
  input_schema: t.input_schema,
}))

const SYSTEM_PROMPT = `You are Jarvis, the AI business assistant for Flair — a UK-based aromatherapy inhaler brand (chooseflair.com). You help the founder Karl run his business by providing data-driven insights and recommendations.

You have access to live business data via tools. Use them aggressively — when in doubt, call a tool rather than guess. Be concise, direct, and actionable. Use £ for currency. When showing numbers, be specific.

Tool routing (pick the most specific tool for the question):
- "EBITDA / margin / contribution / profit / ROAS / P&L / sales today/week/month" → get_pnl with the appropriate range
- "stock / inventory / running low / what to reorder" → get_inventory_status
- "cash / balance / runway / how much money left" → get_cash_position
- "emails / klaviyo / flow performance / campaign revenue" → get_email_performance
- "today / how's today going" → get_today_summary
- "integrations / connectors / what's broken" → get_connector_health
- "what's my X password / login for X / how do I sign into X" → get_account_credentials with the platform name

Always tell Karl which range or assumption you used (e.g. "30 days, ex-VAT not yet calculated"). When numbers look surprising, note it.

Personality: Confident, sharp, slightly witty — like a trusted business partner. Don't be robotic. Address the user casually. Keep responses focused and under 300 words unless detailed analysis is requested.

Connected systems: Shopify (orders, products, inventory, line-item costs), Klaviyo (flows + campaigns), Meta/Facebook Ads + Google Ads (via Windsor), Revolut (cash + OPEX), ShipStation (per-order shipping cost), PayPal.

You can also chat about anything — business strategy, ideas, general questions. You're Karl's go-to AI.`

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const { message, history = [] } = req.body
  if (!message) return res.status(400).json({ error: 'No message provided' })

  if (!ANTHROPIC_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured. Get free $5 credits at console.anthropic.com, then add the key to Vercel env vars.' })
  }

  const messages = [
    ...history.slice(-10).map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: message },
  ]

  try {
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        tools: TOOL_DEFS,
        messages,
      }),
    })

    if (!claudeRes.ok) {
      const err = await claudeRes.text()
      return res.status(502).json({ error: `Claude API ${claudeRes.status}: ${err.substring(0, 200)}` })
    }

    let result = await claudeRes.json()
    let toolResults = []
    let allMessages = [...messages]

    while (result.stop_reason === 'tool_use') {
      const toolCalls = result.content.filter(c => c.type === 'tool_use')
      const batchResults = []

      for (const call of toolCalls) {
        const tool = TOOLS.find(t => t.name === call.name)
        let toolResult
        try {
          toolResult = tool ? await tool.fn(req, call.input || {}) : { error: 'Unknown tool' }
        } catch (e) {
          toolResult = { error: e.message }
        }
        batchResults.push({
          type: 'tool_result',
          tool_use_id: call.id,
          content: JSON.stringify(toolResult),
        })
        toolResults.push(call.name)
      }

      allMessages = [
        ...allMessages,
        { role: 'assistant', content: result.content },
        { role: 'user', content: batchResults },
      ]

      const followUp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': ANTHROPIC_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1024,
          system: SYSTEM_PROMPT,
          tools: TOOL_DEFS,
          messages: allMessages,
        }),
      })

      if (!followUp.ok) break
      result = await followUp.json()
    }

    const textBlocks = (result.content || []).filter(c => c.type === 'text')
    const response = textBlocks.map(c => c.text).join('\n') || 'I could not generate a response.'

    res.json({
      response,
      tools_used: [...new Set(toolResults)],
    })
  } catch (e) {
    console.error('Jarvis error:', e)
    res.status(500).json({ error: e.message || 'Jarvis encountered an error' })
  }
}
