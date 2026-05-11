import { supabase } from '../../lib/supabase'

const GEMINI_KEY = process.env.GEMINI_API_KEY
const KLAVIYO_KEY = 'pk_bce69162bc267f14cbb31eff287d6c10c8'
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

const TOOLS = [
  { name: 'get_orders_summary', description: 'Get overall order stats: total orders, revenue, AOV, 7-day and 30-day breakdowns, refund count', fn: getOrdersSummary },
  { name: 'get_recent_orders', description: 'Get the most recent orders with details (order number, email, price, status)', fn: () => getRecentOrders(10) },
  { name: 'get_customer_insights', description: 'Get top customers by spending, total customer count', fn: getCustomerInsights },
  { name: 'get_klaviyo_metrics', description: 'Get Klaviyo email marketing data: subscriber count, flows, lists', fn: getKlaviyoMetrics },
  { name: 'get_klaviyo_flows', description: 'Get Klaviyo flow performance: open rates, click rates, conversions, revenue', fn: getKlaviyoFlows },
  { name: 'get_meta_ads', description: 'Get Meta/Facebook ads data: campaigns, spend, ROAS, purchases', fn: getMetaAdsData },
  { name: 'get_pnl_summary', description: 'Get P&L summary: total revenue, ad spend by month, ROAS', fn: getPnLSummary },
  { name: 'get_windsor_data', description: 'Get ad spend data from all connected sources via Windsor AI (Google Ads, Meta, etc) for last 30 days', fn: getWindsorData },
  { name: 'get_products', description: 'Get product catalog: titles, prices, inventory levels, SKUs', fn: getProducts },
]

const GEMINI_TOOL_DEFS = [{
  function_declarations: TOOLS.map(t => ({
    name: t.name,
    description: t.description,
    parameters: { type: 'OBJECT', properties: {}, required: [] },
  }))
}]

const SYSTEM_PROMPT = `You are Jarvis, the AI business assistant for Flair — a UK-based aromatherapy inhaler brand (chooseflair.com). You help the founder Karl run his business by providing data-driven insights and recommendations.

You have access to real-time business tools. Use them to answer questions with actual data. Be concise, direct, and actionable. Use £ for currency. When showing numbers, be specific.

Personality: Confident, sharp, slightly witty — like a trusted business partner. Don't be robotic. Address the user casually. Keep responses focused and under 300 words unless detailed analysis is requested.

Connected systems: Shopify orders (via Supabase), Klaviyo email marketing, Meta/Facebook Ads, Google Ads (via Windsor AI), PayPal, Revolut banking.

You can also chat about anything — business strategy, ideas, general questions. You're Karl's go-to AI.`

function buildContents(history, message) {
  const contents = []
  for (const m of history.slice(-10)) {
    contents.push({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })
  }
  contents.push({ role: 'user', parts: [{ text: message }] })
  return contents
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const { message, history = [] } = req.body
  if (!message) return res.status(400).json({ error: 'No message provided' })

  if (!GEMINI_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured. Add it to your Vercel environment variables (free from aistudio.google.com).' })
  }

  const contents = buildContents(history, message)

  try {
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`

    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents,
        tools: GEMINI_TOOL_DEFS,
      }),
    })

    if (!geminiRes.ok) {
      const err = await geminiRes.text()
      return res.status(502).json({ error: `Gemini API ${geminiRes.status}: ${err.substring(0, 200)}` })
    }

    let result = await geminiRes.json()
    let toolsUsed = []

    let loopContents = [...contents]
    let maxLoops = 5

    while (maxLoops-- > 0) {
      const candidate = result.candidates?.[0]
      if (!candidate) break

      const parts = candidate.content?.parts || []
      const functionCalls = parts.filter(p => p.functionCall)

      if (functionCalls.length === 0) break

      loopContents.push({ role: 'model', parts })

      const functionResponses = []
      for (const fc of functionCalls) {
        const tool = TOOLS.find(t => t.name === fc.functionCall.name)
        let toolResult
        try {
          toolResult = tool ? await tool.fn() : { error: 'Unknown tool' }
        } catch (e) {
          toolResult = { error: e.message }
        }
        toolsUsed.push(fc.functionCall.name)
        functionResponses.push({
          functionResponse: {
            name: fc.functionCall.name,
            response: toolResult,
          }
        })
      }

      loopContents.push({ role: 'user', parts: functionResponses })

      const followUp = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: loopContents,
          tools: GEMINI_TOOL_DEFS,
        }),
      })

      if (!followUp.ok) break
      result = await followUp.json()
    }

    const candidate = result.candidates?.[0]
    const textParts = (candidate?.content?.parts || []).filter(p => p.text)
    const response = textParts.map(p => p.text).join('\n') || 'I could not generate a response.'

    res.json({
      response,
      tools_used: [...new Set(toolsUsed)],
    })
  } catch (e) {
    console.error('Jarvis error:', e)
    res.status(500).json({ error: e.message || 'Jarvis encountered an error' })
  }
}
