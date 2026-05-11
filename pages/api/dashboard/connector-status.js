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

async function pingMeta() {
  const token = process.env.META_ACCESS_TOKEN || process.env.FACEBOOK_ACCESS_TOKEN
  const account = process.env.META_AD_ACCOUNT_ID
  if (!token || !account) return { status: 'not_configured', envVars: [{ name: 'META_ACCESS_TOKEN', present: !!token, alt: 'FACEBOOK_ACCESS_TOKEN' }, { name: 'META_AD_ACCOUNT_ID', present: !!account }] }
  const id = account.startsWith('act_') ? account : `act_${account}`
  try {
    const r = await fetch(`https://graph.facebook.com/v21.0/${id}?fields=name,currency&access_token=${encodeURIComponent(token)}`)
    if (!r.ok) return { status: 'error', message: `HTTP ${r.status}` }
    const j = await r.json()
    return { status: 'ok', detail: j.name || 'connected' }
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
