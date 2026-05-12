export const config = { maxDuration: 30 }

const BASE = 'https://a.klaviyo.com/api'
const REVISION = '2024-10-15'

function kHeaders(key) {
  return {
    'Authorization': `Klaviyo-API-Key ${key}`,
    'revision': REVISION,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
}

async function kGet(path, key) {
  const r = await fetch(`${BASE}${path}`, { headers: kHeaders(key) })
  if (!r.ok) throw new Error(`Klaviyo ${path} ${r.status}`)
  return r.json()
}

async function kPost(path, key, body) {
  const r = await fetch(`${BASE}${path}`, { method: 'POST', headers: kHeaders(key), body: JSON.stringify(body) })
  if (!r.ok) {
    const t = await r.text()
    throw new Error(`Klaviyo ${path} ${r.status}: ${t.substring(0, 200)}`)
  }
  return r.json()
}

function rangeBounds(range) {
  const now = new Date()
  const sod = (d) => { const x = new Date(d); x.setHours(0,0,0,0); return x }
  const eod = (d) => { const x = new Date(d); x.setHours(23,59,59,999); return x }
  if (range === '7d') { const f = new Date(now); f.setDate(f.getDate()-6); return { from: sod(f), to: eod(now), label: 'Last 7 days' } }
  if (range === '90d') { const f = new Date(now); f.setDate(f.getDate()-89); return { from: sod(f), to: eod(now), label: 'Last 90 days' } }
  if (range === 'mtd') { const f = new Date(now.getFullYear(), now.getMonth(), 1); return { from: sod(f), to: eod(now), label: 'MTD' } }
  if (range === 'ytd') { const f = new Date(now.getFullYear(), 0, 1); return { from: sod(f), to: eod(now), label: 'YTD' } }
  const f = new Date(now); f.setDate(f.getDate()-29); return { from: sod(f), to: eod(now), label: 'Last 30 days' }
}

export default async function handler(req, res) {
  const key = process.env.KLAVIYO_API_KEY
  if (!key) return res.status(400).json({ error: 'KLAVIYO_API_KEY missing' })

  const range = (req.query.range || '30d').toString()
  const { from, to, label } = rangeBounds(range)

  try {
    // Fetch flows and campaigns in parallel
    const [flowsData, campaignsData] = await Promise.all([
      kGet('/flows/?fields[flow]=name,status,trigger_type,created,updated', key).catch(e => ({ error: e.message })),
      kGet('/campaigns/?filter=equals(messages.channel,%22email%22)&fields[campaign]=name,status,send_time,created_at,scheduled_at&sort=-created_at', key).catch(e => ({ error: e.message })),
    ])

    const flowsErr = flowsData.error
    const campsErr = campaignsData.error
    const flows = flowsData.data || []
    const campaigns = (campaignsData.data || []).filter(c => {
      const t = c.attributes.send_time || c.attributes.scheduled_at || c.attributes.created_at
      if (!t) return false
      const d = new Date(t)
      return d >= from && d <= to
    })

    // Try Reports API for attributed revenue + opens/clicks
    let flowReport = null, campaignReport = null
    try {
      const reportBody = (entity) => ({
        data: {
          type: `${entity}-values-report`,
          attributes: {
            statistics: ['opens_unique', 'clicks_unique', 'conversions', 'conversion_value', 'recipients', 'open_rate', 'click_rate', 'conversion_rate'],
            timeframe: { start: from.toISOString().split('T')[0], end: to.toISOString().split('T')[0] },
            conversion_metric_id: null,
          },
        },
      })
      // Get the Placed Order metric for conversion attribution
      const metrics = await kGet('/metrics/?filter=equals(name,%22Placed+Order%22)', key).catch(() => null)
      const placedOrderId = metrics?.data?.[0]?.id
      if (placedOrderId) {
        const body = reportBody('flow')
        body.data.attributes.conversion_metric_id = placedOrderId
        flowReport = await kPost('/flow-values-reports/', key, body).catch(e => ({ error: e.message }))
        const body2 = reportBody('campaign')
        body2.data.attributes.conversion_metric_id = placedOrderId
        campaignReport = await kPost('/campaign-values-reports/', key, body2).catch(e => ({ error: e.message }))
      }
    } catch {}

    function extractStats(report) {
      if (!report?.data?.attributes?.results) return new Map()
      const map = new Map()
      for (const row of report.data.attributes.results) {
        map.set(row.groupings?.flow_id || row.groupings?.campaign_id, row.statistics || {})
      }
      return map
    }

    const flowStats = extractStats(flowReport)
    const campStats = extractStats(campaignReport)

    const flowsOut = flows.map(f => {
      const s = flowStats.get(f.id) || {}
      return {
        id: f.id,
        name: f.attributes.name,
        status: f.attributes.status,
        trigger: f.attributes.trigger_type || f.attributes.triggerType,
        recipients: s.recipients || 0,
        opensUnique: s.opens_unique || 0,
        clicksUnique: s.clicks_unique || 0,
        conversions: s.conversions || 0,
        revenue: s.conversion_value || 0,
        openRate: s.open_rate ? Math.round(s.open_rate * 1000) / 10 : 0,
        clickRate: s.click_rate ? Math.round(s.click_rate * 1000) / 10 : 0,
        conversionRate: s.conversion_rate ? Math.round(s.conversion_rate * 1000) / 10 : 0,
      }
    }).sort((a, b) => b.revenue - a.revenue)

    const campaignsOut = campaigns.map(c => {
      const s = campStats.get(c.id) || {}
      return {
        id: c.id,
        name: c.attributes.name,
        status: c.attributes.status,
        sendTime: c.attributes.send_time || c.attributes.scheduled_at,
        recipients: s.recipients || 0,
        opensUnique: s.opens_unique || 0,
        clicksUnique: s.clicks_unique || 0,
        conversions: s.conversions || 0,
        revenue: s.conversion_value || 0,
        openRate: s.open_rate ? Math.round(s.open_rate * 1000) / 10 : 0,
        clickRate: s.click_rate ? Math.round(s.click_rate * 1000) / 10 : 0,
        conversionRate: s.conversion_rate ? Math.round(s.conversion_rate * 1000) / 10 : 0,
      }
    }).sort((a, b) => b.revenue - a.revenue)

    const totals = {
      flowRevenue: flowsOut.reduce((s, f) => s + f.revenue, 0),
      flowConversions: flowsOut.reduce((s, f) => s + f.conversions, 0),
      campaignRevenue: campaignsOut.reduce((s, c) => s + c.revenue, 0),
      campaignConversions: campaignsOut.reduce((s, c) => s + c.conversions, 0),
      flowCount: flowsOut.filter(f => f.status === 'live').length,
      campaignCount: campaignsOut.length,
    }
    totals.totalRevenue = totals.flowRevenue + totals.campaignRevenue

    res.status(200).json({
      range, label,
      from: from.toISOString(), to: to.toISOString(),
      flows: flowsOut,
      campaigns: campaignsOut,
      totals,
      reportsAvailable: !!flowReport && !flowReport.error,
      errors: [flowsErr, campsErr, flowReport?.error, campaignReport?.error].filter(Boolean),
      generatedAt: new Date().toISOString(),
    })
  } catch (e) {
    res.status(502).json({ error: e.message })
  }
}
