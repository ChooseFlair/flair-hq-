import { supabase } from '../../lib/supabase'
import { getAccounts, getBalance, getTransactions, refreshToken } from '../../lib/truelayer'

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY
const KLAVIYO_KEY = 'pk_bce69162bc267f14cbb31eff287d6c10c8'
const WINDSOR_KEY = 'cc92158d0eb0f1faa257c0414780b6c10961'

// ─── Helper: get valid TrueLayer token ─────────────────────────

async function getTrueLayerToken() {
  const { data } = await supabase.from('personal_bank_tokens').select('*').eq('id', 'truelayer').single()
  if (!data) return null

  if (new Date(data.expires_at) < new Date(Date.now() + 60000)) {
    try {
      const tokens = await refreshToken(data.refresh_token)
      await supabase.from('personal_bank_tokens').upsert({
        id: 'truelayer',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      return tokens.access_token
    } catch {
      return null
    }
  }
  return data.access_token
}

// ─── Business data tools ───────────────────────────────────────

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
  const { data: orders } = await supabase.from('orders').select('total_price, created_at').order('created_at', { ascending: false })
  const { data: overrides } = await supabase.from('pnl_monthly_overrides').select('*').order('month', { ascending: false }).limit(6)
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
  const { data } = await supabase.from('klaviyo_flows').select('flow_name, status, trigger_type, recipients, conversions, conversion_value, open_rate, click_rate')
  return data || []
}

async function getProducts() {
  const { data } = await supabase.from('products').select('title, sku, price, inventory_quantity, status').limit(50)
  return data || []
}

// ─── Personal banking tools ────────────────────────────────────

async function getPersonalBankAccounts() {
  const token = await getTrueLayerToken()
  if (!token) return { error: 'Personal banking not connected. Visit /api/truelayer/auth to connect your Nationwide/Halifax accounts.' }

  try {
    const accounts = await getAccounts(token)
    const withBalances = await Promise.all(accounts.map(async (acc) => {
      try {
        const bal = await getBalance(token, acc.account_id)
        return {
          name: acc.display_name || acc.provider?.display_name || 'Account',
          provider: acc.provider?.display_name || 'Unknown',
          type: acc.account_type,
          account_number_last4: acc.account_number?.number?.slice(-4) || '****',
          balance: bal?.current || 0,
          available: bal?.available || 0,
          currency: bal?.currency || 'GBP',
        }
      } catch {
        return { name: acc.display_name, provider: acc.provider?.display_name, balance: 'unavailable' }
      }
    }))
    return { accounts: withBalances, total_balance: withBalances.reduce((s, a) => s + (typeof a.balance === 'number' ? a.balance : 0), 0).toFixed(2) }
  } catch (e) {
    return { error: e.message }
  }
}

async function getPersonalTransactions() {
  const token = await getTrueLayerToken()
  if (!token) return { error: 'Personal banking not connected.' }

  try {
    const accounts = await getAccounts(token)
    const to = new Date().toISOString().split('T')[0]
    const from = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]

    const allTxns = []
    for (const acc of accounts.slice(0, 4)) {
      try {
        const txns = await getTransactions(token, acc.account_id, from, to)
        allTxns.push(...txns.map(t => ({
          account: acc.display_name || acc.provider?.display_name,
          date: t.timestamp?.split('T')[0],
          description: t.description,
          amount: t.amount,
          currency: t.currency,
          type: t.transaction_type,
          category: t.transaction_category,
        })))
      } catch { /* skip failed accounts */ }
    }

    allTxns.sort((a, b) => new Date(b.date) - new Date(a.date))

    const totalSpent = allTxns.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0)
    const totalIncome = allTxns.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0)

    return {
      period: `${from} to ${to}`,
      transaction_count: allTxns.length,
      total_spent: totalSpent.toFixed(2),
      total_income: totalIncome.toFixed(2),
      recent_transactions: allTxns.slice(0, 20),
    }
  } catch (e) {
    return { error: e.message }
  }
}

async function getPersonalSpendingBreakdown() {
  const token = await getTrueLayerToken()
  if (!token) return { error: 'Personal banking not connected.' }

  try {
    const accounts = await getAccounts(token)
    const to = new Date().toISOString().split('T')[0]
    const from = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]

    const allTxns = []
    for (const acc of accounts.slice(0, 4)) {
      try {
        const txns = await getTransactions(token, acc.account_id, from, to)
        allTxns.push(...txns)
      } catch { /* skip */ }
    }

    const categories = {}
    for (const t of allTxns.filter(t => t.amount < 0)) {
      const cat = t.transaction_category || 'Other'
      if (!categories[cat]) categories[cat] = { total: 0, count: 0 }
      categories[cat].total += Math.abs(t.amount)
      categories[cat].count += 1
    }

    return {
      period: `${from} to ${to}`,
      categories: Object.entries(categories)
        .sort((a, b) => b[1].total - a[1].total)
        .map(([name, d]) => ({ category: name, total: d.total.toFixed(2), transactions: d.count })),
      total_spent: Object.values(categories).reduce((s, c) => s + c.total, 0).toFixed(2),
    }
  } catch (e) {
    return { error: e.message }
  }
}

// ─── Tool definitions ──────────────────────────────────────────

const TOOLS = [
  // Business
  { name: 'get_orders_summary', description: '[BUSINESS] Get Flair order stats: total orders, revenue, AOV, 7-day and 30-day breakdowns, refund count', fn: getOrdersSummary },
  { name: 'get_recent_orders', description: '[BUSINESS] Get the most recent Flair orders with details', fn: () => getRecentOrders(10) },
  { name: 'get_customer_insights', description: '[BUSINESS] Get top Flair customers by spending', fn: getCustomerInsights },
  { name: 'get_klaviyo_metrics', description: '[BUSINESS] Get Klaviyo email marketing data: subscriber count, flows, lists', fn: getKlaviyoMetrics },
  { name: 'get_klaviyo_flows', description: '[BUSINESS] Get Klaviyo flow performance: open rates, click rates, conversions', fn: getKlaviyoFlows },
  { name: 'get_meta_ads', description: '[BUSINESS] Get Meta/Facebook ads data: campaigns, spend, ROAS', fn: getMetaAdsData },
  { name: 'get_pnl_summary', description: '[BUSINESS] Get Flair P&L summary: total revenue, ad spend, ROAS', fn: getPnLSummary },
  { name: 'get_windsor_data', description: '[BUSINESS] Get ad spend from all sources via Windsor AI for last 30 days', fn: getWindsorData },
  { name: 'get_products', description: '[BUSINESS] Get Flair product catalog: titles, prices, inventory', fn: getProducts },
  // Personal
  { name: 'get_personal_bank_accounts', description: '[PERSONAL] Get all personal bank account balances (Nationwide, Halifax, etc)', fn: getPersonalBankAccounts },
  { name: 'get_personal_transactions', description: '[PERSONAL] Get personal bank transactions from the last 30 days across all accounts', fn: getPersonalTransactions },
  { name: 'get_personal_spending_breakdown', description: '[PERSONAL] Get personal spending broken down by category for the last 30 days', fn: getPersonalSpendingBreakdown },
]

const TOOL_DEFS = TOOLS.map(t => ({
  name: t.name,
  description: t.description,
  input_schema: { type: 'object', properties: {}, required: [] },
}))

const SYSTEM_PROMPT = `You are Jarvis, Karl's all-in-one AI assistant — handling both his personal life and his business (Flair, a UK-based aromatherapy inhaler brand at chooseflair.com).

You have two categories of tools:
- [BUSINESS] tools: Shopify orders, Klaviyo email marketing, Meta Ads, Google Ads (Windsor), P&L data, products
- [PERSONAL] tools: Personal bank accounts (Nationwide, Halifax) — balances, transactions, spending breakdowns

When Karl asks about money, spending, or finances, decide whether it's personal or business based on context. If unclear, check both. You can combine data — e.g. "how much money do I have total?" should pull both business (Revolut/PayPal) and personal bank balances.

Use £ for currency. Be concise, direct, actionable. Keep responses under 300 words unless detailed analysis is requested.

Personality: Confident, sharp, slightly witty — like a trusted right-hand man. You handle everything from "what's my ROAS" to "how much did I spend on food this month." You're Karl's go-to for anything.`

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const { message, history = [] } = req.body
  if (!message) return res.status(400).json({ error: 'No message provided' })

  if (!ANTHROPIC_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured.' })
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
        model: 'claude-sonnet-4-20250514',
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
          toolResult = tool ? await tool.fn() : { error: 'Unknown tool' }
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
          model: 'claude-sonnet-4-20250514',
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
    const response = textBlocks.map(c => c.text).join('\n') || 'I couldn\'t generate a response.'

    res.json({
      response,
      tools_used: [...new Set(toolResults)],
    })
  } catch (e) {
    console.error('Jarvis error:', e)
    res.status(500).json({ error: e.message || 'Jarvis encountered an error' })
  }
}
