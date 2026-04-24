import { supabase } from '../../lib/supabase'

const WINDSOR_KEY = 'cc92158d0eb0f1faa257c0414780b6c10961'
const BASE = 'https://connectors.windsor.ai'

async function windsorFetch(connector, fields, dateFrom, dateTo) {
  const params = new URLSearchParams({
    api_key: WINDSOR_KEY,
    fields: fields.join(','),
    date_from: dateFrom,
    date_to: dateTo,
    _renderer: 'json',
  })
  const url = `${BASE}/${connector}?${params}`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 25000)

  try {
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timeout)

    const text = await res.text()

    if (!res.ok) {
      return { error: `Windsor API ${res.status}: ${text.substring(0, 200)}` }
    }

    try {
      return JSON.parse(text)
    } catch {
      return { error: `Invalid JSON from Windsor: ${text.substring(0, 200)}` }
    }
  } catch (e) {
    clearTimeout(timeout)
    if (e.name === 'AbortError') {
      return { error: 'Windsor API timed out after 25s' }
    }
    return { error: `Windsor fetch failed: ${e.message}` }
  }
}

function aggregateMonthly(rawData) {
  const monthly = {}

  // Windsor returns { data: [...] } or just [...]
  const rows = Array.isArray(rawData) ? rawData : (rawData?.data || [])

  if (!Array.isArray(rows)) {
    return { aggregated: [], rawShape: typeof rows, rawKeys: Object.keys(rawData || {}) }
  }

  for (const row of rows) {
    if (!row.date) continue
    const month = row.date.substring(0, 7)
    const source = (row.source || 'unknown').toLowerCase()

    const key = `${month}::${source}`
    if (!monthly[key]) {
      monthly[key] = { month, source, spend: 0, clicks: 0, impressions: 0 }
    }
    monthly[key].spend += parseFloat(row.spend || 0)
    monthly[key].clicks += parseInt(row.clicks || 0)
    monthly[key].impressions += parseInt(row.impressions || 0)
  }

  return { aggregated: Object.values(monthly) }
}

async function saveToSupabase(monthlyData) {
  const byMonth = {}

  for (const row of monthlyData) {
    if (!byMonth[row.month]) {
      byMonth[row.month] = { meta_spend: 0, google_spend: 0 }
    }
    const src = row.source
    if (src.includes('facebook') || src.includes('meta') || src.includes('instagram')) {
      byMonth[row.month].meta_spend += row.spend
    } else if (src.includes('google') || src.includes('adwords')) {
      byMonth[row.month].google_spend += row.spend
    }
  }

  let updated = 0
  for (const [month, spends] of Object.entries(byMonth)) {
    const { error } = await supabase.from('pnl_monthly_overrides').upsert({
      month,
      meta_spend: Math.round(spends.meta_spend * 100) / 100,
      google_spend: Math.round(spends.google_spend * 100) / 100,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'month' })
    if (!error) updated++
  }

  return updated
}

export default async function handler(req, res) {
  const { action = 'fetch', date_from, date_to } = req.query

  const from = date_from || '2025-05-01'
  const to = date_to || new Date().toISOString().split('T')[0]

  try {
    const data = await windsorFetch('all', [
      'source', 'campaign', 'spend', 'clicks', 'impressions', 'date'
    ], from, to)

    // If Windsor returned an error
    if (data?.error) {
      return res.status(502).json({ error: data.error })
    }

    const { aggregated, rawShape, rawKeys } = aggregateMonthly(data)

    if (!aggregated) {
      return res.status(500).json({
        error: 'Unexpected Windsor response format',
        debug: { rawShape, rawKeys, sampleKeys: Object.keys(data || {}).slice(0, 10) },
      })
    }

    const sources = [...new Set(aggregated.map(r => r.source))]

    const sourceTotals = {}
    for (const row of aggregated) {
      if (!sourceTotals[row.source]) {
        sourceTotals[row.source] = { spend: 0, clicks: 0, impressions: 0 }
      }
      sourceTotals[row.source].spend += row.spend
      sourceTotals[row.source].clicks += row.clicks
      sourceTotals[row.source].impressions += row.impressions
    }

    let syncResult = null
    if (action === 'sync' && aggregated.length > 0) {
      const updated = await saveToSupabase(aggregated)
      syncResult = { months_updated: updated }
    }

    res.json({
      sources,
      sourceTotals,
      monthly: aggregated,
      rowCount: aggregated.length,
      dateRange: { from, to },
      totalSpend: aggregated.reduce((sum, r) => sum + r.spend, 0),
      ...(syncResult && { syncResult }),
    })
  } catch (e) {
    console.error('Windsor handler error:', e)
    res.status(500).json({ error: e.message || 'Failed to process Windsor data' })
  }
}
