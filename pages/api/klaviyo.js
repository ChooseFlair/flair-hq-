const KLAVIYO_KEY = 'pk_bce69162bc267f14cbb31eff287d6c10c8'
const BASE = 'https://a.klaviyo.com/api'
const headers = {
  'Authorization': `Klaviyo-API-Key ${KLAVIYO_KEY}`,
  'revision': '2024-10-15',
  'Content-Type': 'application/json',
  'Accept': 'application/json',
}

async function kGet(path) {
  const r = await fetch(`${BASE}${path}`, { headers })
  return r.json()
}

async function kPost(path, body) {
  const r = await fetch(`${BASE}${path}`, { method: 'POST', headers, body: JSON.stringify(body) })
  return r.json()
}

function metricBody(metricId, start, end, interval = 'day') {
  return {
    data: {
      type: 'metric-aggregate',
      attributes: {
        metric_id: metricId,
        measurements: ['count', 'unique'],
        interval,
        filter: [
          `greater-or-equal(datetime,${start})`,
          `less-than(datetime,${end})`
        ],
        timezone: 'Europe/London',
      }
    }
  }
}

function sumMetric(res, key) {
  try {
    return res.data.attributes.data[0].measurements[key].reduce((a, b) => a + b, 0)
  } catch { return 0 }
}

function dailyData(res, key) {
  try {
    const dates = res.data.attributes.dates
    const values = res.data.attributes.data[0].measurements[key]
    return dates.map((d, i) => ({ date: d.split('T')[0], value: values[i] || 0 }))
  } catch { return [] }
}

export default async function handler(req, res) {
  try {
    const now = new Date()
    const ago30 = new Date(now - 30 * 86400000)
    const fmt = d => d.toISOString().split('.')[0]

    const [
      flows, lists, segments, profiles, campaigns,
      received, opened, clicked, placedOrder, subscribedEmail
    ] = await Promise.all([
      kGet('/flows/?fields[flow]=name,status,trigger_type,created,updated'),
      kGet('/lists/?fields[list]=name,created,updated'),
      kGet('/segments/?fields[segment]=name,created,is_active'),
      kGet('/profiles/?fields[profile]=email,first_name,last_name,created&page[size]=100&sort=-created'),
      kGet('/campaigns/?filter=equals(messages.channel,%22email%22)&fields[campaign]=name,status,send_time,created_at,scheduled_at&sort=-created_at'),
      kPost('/metric-aggregates/', metricBody('WHrzLu', fmt(ago30), fmt(now), 'day')),
      kPost('/metric-aggregates/', metricBody('T8zNKw', fmt(ago30), fmt(now), 'day')),
      kPost('/metric-aggregates/', metricBody('YAuHCm', fmt(ago30), fmt(now), 'day')),
      kPost('/metric-aggregates/', metricBody('RvqrVP', fmt(ago30), fmt(now), 'day')),
      kPost('/metric-aggregates/', metricBody('W2EAfk', fmt(ago30), fmt(now), 'day')),
    ])

    const emailsSent = sumMetric(received, 'count')
    const opens = sumMetric(opened, 'count')
    const clicks = sumMetric(clicked, 'count')
    const orders = sumMetric(placedOrder, 'count')
    const newSubscribers = sumMetric(subscribedEmail, 'count')

    // Build daily time-series
    const sentDaily = dailyData(received, 'count')
    const opensDaily = dailyData(opened, 'count')
    const clicksDaily = dailyData(clicked, 'count')
    const ordersDaily = dailyData(placedOrder, 'count')

    // Merge into single time-series
    const timeSeries = sentDaily.map((s, i) => ({
      date: s.date,
      sent: s.value,
      opens: opensDaily[i]?.value || 0,
      clicks: clicksDaily[i]?.value || 0,
      orders: ordersDaily[i]?.value || 0,
    }))

    res.json({
      emailsSent,
      openRate: emailsSent ? parseFloat(((opens / emailsSent) * 100).toFixed(1)) : 0,
      clickRate: emailsSent ? parseFloat(((clicks / emailsSent) * 100).toFixed(1)) : 0,
      opens,
      clicks,
      orders,
      newSubscribers,
      totalProfiles: (profiles.data || []).length,
      hasMoreProfiles: !!profiles.links?.next,
      timeSeries,
      flows: (flows.data || []).map(f => ({
        name: f.attributes.name,
        status: f.attributes.status,
        trigger: f.attributes.trigger_type || f.attributes.triggerType,
        created: f.attributes.created,
      })),
      lists: (lists.data || []).map(l => ({
        name: l.attributes.name,
        id: l.id,
        created: l.attributes.created,
      })),
      segments: (segments.data || []).map(s => ({
        name: s.attributes.name,
        id: s.id,
        active: s.attributes.isActive,
        created: s.attributes.created,
      })),
      campaigns: (campaigns.data || []).slice(0, 10).map(c => ({
        name: c.attributes.name,
        status: c.attributes.status,
        sendTime: c.attributes.send_time,
        createdAt: c.attributes.created_at,
      })),
    })
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch Klaviyo data' })
  }
}
