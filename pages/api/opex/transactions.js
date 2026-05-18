import { supabase } from '../../../lib/supabase'
import { getTransactions as getRevolutTxns, refreshAccessToken } from '../../../lib/revolut'

export const config = { maxDuration: 30 }

const DEFAULT_OPEX_PATTERNS = [
  'openai', 'canva', 'amazon', 'auctane', 'shipstation', 'revolut',
  'klaviyo', 'creativeos', 'shopify', 'claude', 'pipeboard', 'meshy',
  'hmrc', 'companies house', 'gov.uk', 'royal mail',
]
const INVENTORY_PATTERNS = ['klarna', 'alibaba', 'aliexpress', '1688', 'dhgate']

function buildRegex(patterns) {
  const escaped = patterns.map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  return new RegExp(`(${escaped.join('|')})`, 'i')
}

function autoCategoryFor(text) {
  if (buildRegex(DEFAULT_OPEX_PATTERNS).test(text)) return 'opex'
  if (buildRegex(INVENTORY_PATTERNS).test(text)) return 'inventory'
  return 'ignore'
}

function txnDescription(t, leg) {
  return [
    leg?.description,
    leg?.counterparty?.name,
    t?.merchant?.name,
    t?.reference,
    t?.description,
  ].filter(Boolean).join(' ')
}

async function refreshRevolutToken(integration) {
  const tokens = await refreshAccessToken(integration.refresh_token)
  await supabase.from('integrations').update({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token || integration.refresh_token,
    expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', 'revolut')
  return tokens.access_token
}

export default async function handler(req, res) {
  const days = Math.min(parseInt(req.query.days || '90'), 365)
  const from = new Date(Date.now() - days * 86400000)
  const to = new Date()

  const { data: integration } = await supabase.from('integrations').select('*').eq('id', 'revolut').maybeSingle()
  if (!integration?.access_token) return res.status(200).json({ connected: false, transactions: [] })

  let accessToken = integration.access_token
  const expiresAt = integration.expires_at ? new Date(integration.expires_at).getTime() : 0
  if (expiresAt - Date.now() < 5 * 60 * 1000 && integration.refresh_token) {
    try { accessToken = await refreshRevolutToken(integration) }
    catch (e) { return res.status(200).json({ connected: false, error: 'Token refresh failed', transactions: [] }) }
  }

  let txns
  try {
    txns = await getRevolutTxns(accessToken, { from: from.toISOString(), to: to.toISOString(), count: 1000 })
  } catch (e) {
    if (/401/.test(e.message) && integration.refresh_token) {
      try {
        accessToken = await refreshRevolutToken(integration)
        txns = await getRevolutTxns(accessToken, { from: from.toISOString(), to: to.toISOString(), count: 1000 })
      } catch (retry) { return res.status(200).json({ connected: false, error: retry.message, transactions: [] }) }
    } else { return res.status(200).json({ connected: false, error: e.message, transactions: [] }) }
  }

  const list = Array.isArray(txns) ? txns : (txns?.transactions || [])

  // Flatten to debit legs
  const debits = []
  for (const t of list) {
    if (t.state !== 'completed') continue
    for (const leg of (t.legs || [])) {
      const amount = parseFloat(leg.amount || 0)
      if (amount >= 0) continue
      const desc = txnDescription(t, leg).trim()
      debits.push({
        transaction_id: leg.leg_id || `${t.id}_${leg.account_id || '0'}`,
        date: t.completed_at || t.created_at,
        amount: Math.abs(amount),
        currency: leg.currency,
        description: desc.substring(0, 200),
        counterparty: leg.counterparty?.name || t.merchant?.name || null,
      })
    }
  }

  // Pull overrides + rules
  const ids = debits.map(d => d.transaction_id)
  let overrideMap = new Map()
  if (ids.length) {
    const { data: overrides } = await supabase
      .from('transaction_categories')
      .select('transaction_id, category, note')
      .in('transaction_id', ids)
    for (const o of (overrides || [])) overrideMap.set(o.transaction_id, o)
  }

  const counterparties = Array.from(new Set(debits.map(d => d.counterparty).filter(Boolean)))
  let ruleMap = new Map()
  if (counterparties.length) {
    const { data: rules } = await supabase
      .from('transaction_category_rules')
      .select('counterparty, category, note')
      .in('counterparty', counterparties)
    for (const r of (rules || [])) ruleMap.set(r.counterparty, r)
  }

  // Apply per-tx overrides > rules > auto
  for (const d of debits) {
    const ov = overrideMap.get(d.transaction_id)
    const rule = d.counterparty ? ruleMap.get(d.counterparty) : null
    d.autoCategory = autoCategoryFor(d.description)
    d.category = ov?.category || rule?.category || d.autoCategory
    d.note = ov?.note || rule?.note || null
    d.isOverride = !!ov
    d.ruleApplied = !ov && !!rule
  }

  debits.sort((a, b) => new Date(b.date) - new Date(a.date))

  const totals = debits.reduce((acc, d) => {
    acc[d.category] = (acc[d.category] || 0) + d.amount
    acc.count[d.category] = (acc.count[d.category] || 0) + 1
    return acc
  }, { opex: 0, inventory: 0, ignore: 0, count: { opex: 0, inventory: 0, ignore: 0 } })

  res.status(200).json({
    connected: true,
    days,
    totals: { opex: Math.round(totals.opex * 100) / 100, inventory: Math.round(totals.inventory * 100) / 100, ignore: Math.round(totals.ignore * 100) / 100, counts: totals.count, total: debits.length },
    transactions: debits,
    generatedAt: new Date().toISOString(),
  })
}
