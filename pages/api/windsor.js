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
  const res = await fetch(url)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Windsor API ${res.status}: ${text}`)
  }
  return res.json()
}

// Aggregate daily rows into monthly totals by source
function aggregateMonthly(data) {
  const monthly = {}
  const rows = data?.data || data || []

  for (const row of rows) {
    if (!row.date) continue
    const month = row.date.substring(0, 7)
    const source = (row.source || 'unknown').toLowerCase()

    const key = `${month}::${source}`
    if (!monthly[key]) {
      monthly[key] = { month, source, spend: 0, clicks: 0, impressions: 0, conversions: 0, revenue: 0 }
    }
    monthly[key].spend += parseFloat(row.spend || 0)
    monthly[key].clicks += parseInt(row.clicks || 0)
    monthly[key].impressions += parseInt(row.impressions || 0)
    monthly[key].conversions += parseFloat(row.conversions || 0)
    monthly[key].revenue += parseFloat(row.revenue || 0)
  }

  return Object.values(monthly)
}

// Save monthly ad spend to pnl_monthly_overrides
async function saveToSupabase(monthlyData) {
  const byMonth = {}

  for (const row of monthlyData) {
    if (!byMonth[row.month]) {
      byMonth[row.month] = { meta_spend: 0, google_spend: 0 }
    }
    if (row.source.includes('facebook') || row.source.includes('meta') || row.source.includes('instagram')) {
      byMonth[row.month].meta_spend += row.spend
    } else if (row.source.includes('google') || row.source.includes('adwords')) {
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
  try {
    const { action = 'fetch', date_from, date_to } = req.query

    const from = date_from || '2025-05-01'
    const to = date_to || new Date().toISOString().split('T')[0]

    // Pull all connected sources
    const data = await windsorFetch('all', [
      'source', 'campaign', 'spend', 'clicks', 'impressions', 'conversions', 'revenue', 'date'
    ], from, to)

    const monthly = aggregateMonthly(data)

    // Get unique sources
    const sources = [...new Set(monthly.map(r => r.source))]

    // Calculate totals per source
    const sourceTotals = {}
    for (const row of monthly) {
      if (!sourceTotals[row.source]) {
        sourceTotals[row.source] = { spend: 0, clicks: 0, impressions: 0, conversions: 0, revenue: 0 }
      }
      sourceTotals[row.source].spend += row.spend
      sourceTotals[row.source].clicks += row.clicks
      sourceTotals[row.source].impressions += row.impressions
      sourceTotals[row.source].conversions += row.conversions
      sourceTotals[row.source].revenue += row.revenue
    }

    // If sync requested, save to Supabase
    let syncResult = null
    if (action === 'sync') {
      const updated = await saveToSupabase(monthly)
      syncResult = { months_updated: updated }
    }

    res.json({
      sources,
      sourceTotals,
      monthly,
      dateRange: { from, to },
      totalSpend: monthly.reduce((sum, r) => sum + r.spend, 0),
      ...(syncResult && { syncResult }),
    })
  } catch (e) {
    console.error('Windsor API error:', e)
    res.status(500).json({ error: e.message || 'Failed to fetch Windsor data' })
  }
}
