export const config = { maxDuration: 30 }

async function pingShopify() {
  const shop = process.env.SHOPIFY_SHOP_DOMAIN
  const token = process.env.SHOPIFY_ADMIN_TOKEN
  if (!shop || !token) return { status: 'not_configured', envVars: [{ name: 'SHOPIFY_SHOP_DOMAIN', present: !!shop }, { name: 'SHOPIFY_ADMIN_TOKEN', present: !!token }] }
  try {
    const r = await fetch(`https://${shop}/admin/api/2024-10/shop.json`, { headers: { 'X-Shopify-Access-Token': token, 'Accept': 'application/json' } })
    if (!r.ok) return { status: 'error', message: `HTTP ${r.status}` }
    const j = await r.json()
    return { status: 'ok', detail: j.shop?.name || 'connected' }
  } catch (e) { return { status: 'error', message: e.message } }
}

async function pingKlaviyo() {
  const key = process.env.KLAVIYO_API_KEY
  if (!key) return { status: 'not_configured', envVars: [{ name: 'KLAVIYO_API_KEY', present: false }] }
  try {
    const r = await fetch('https://a.klaviyo.com/api/accounts/', { headers: { 'Authorization': `Klaviyo-API-Key ${key}`, 'revision': '2024-10-15', 'Accept': 'application/json' } })
    if (!r.ok) return { status: 'error', message: `HTTP ${r.status}` }
    return { status: 'ok', detail: 'connected' }
  } catch (e) { return { status: 'error', message: e.message } }
}

const WINDSOR_KEY = 'cc92158d0eb0f1faa257c0414780b6c10961'

async function pingMeta() {
  const from = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
  const to = new Date().toISOString().split('T')[0]
  try {
    const url = `https://connectors.windsor.ai/facebook?api_key=${WINDSOR_KEY}&fields=source,spend,date&date_from=${from}&date_to=${to}&_renderer=json`
    const r = await fetch(url)
    if (!r.ok) return { status: 'error', message: `Windsor HTTP ${r.status}` }
    const data = await r.json()
    const rows = Array.isArray(data) ? data : (data?.data || [])
    const spend = rows.reduce((s, row) => s + parseFloat(row.spend || 0), 0)
    return { status: 'ok', detail: `via Windsor — £${spend.toFixed(0)} last 7d` }
  } catch (e) { return { status: 'error', message: e.message } }
}

async function pingPayPal() {
  const id = process.env.PAYPAL_CLIENT_ID
  const secret = process.env.PAYPAL_SECRET
  if (!id || !secret) return { status: 'not_configured', envVars: [{ name: 'PAYPAL_CLIENT_ID', present: !!id }, { name: 'PAYPAL_SECRET', present: !!secret }] }
  try {
    const auth = Buffer.from(`${id}:${secret}`).toString('base64')
    const r = await fetch('https://api-m.paypal.com/v1/oauth2/token', {
      method: 'POST',
      headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=client_credentials',
    })
    if (!r.ok) return { status: 'error', message: `HTTP ${r.status}` }
    return { status: 'ok', detail: 'connected' }
  } catch (e) { return { status: 'error', message: e.message } }
}

const CONNECTORS = [
  { name: 'Shopify', ping: pingShopify, description: 'Powers revenue, orders, customers, AOV widgets.', setupUrl: 'https://help.shopify.com/en/manual/apps/app-types/custom-apps' },
  { name: 'Klaviyo', ping: pingKlaviyo, description: 'Flows, campaigns, profiles - read live from Klaviyo API.', setupUrl: 'https://www.klaviyo.com/account#api-keys-tab' },
  { name: 'Meta', ping: pingMeta, description: 'Ad spend, impressions, ROAS - read live from Meta Graph.', setupUrl: 'https://developers.facebook.com/tools/explorer' },
  { name: 'PayPal', ping: pingPayPal, description: 'PayPal transactions read live via OAuth.', setupUrl: 'https://developer.paypal.com/dashboard/applications/live' },
  { name: 'Windsor', ping: async () => ({ status: 'ok', detail: 'live' }), description: 'Marketing data via Windsor.ai - hardcoded API key.' },
]

export default async function handler(req, res) {
  const results = await Promise.all(CONNECTORS.map(async c => {
    const r = await c.ping()
    return {
      name: c.name,
      description: c.description,
      setupUrl: c.setupUrl,
      status: r.status,
      statusReason: r.detail || r.message || '',
      envVars: r.envVars || [],
      message: r.message || null,
    }
  }))
  res.status(200).json({ connectors: results, generatedAt: new Date().toISOString() })
}
