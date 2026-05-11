import { supabase } from '../../../lib/supabase'

const CONNECTORS = [
  {
    name: 'Shopify',
    syncPath: '/api/sync/shopify',
    rowId: 'shopify_sync',
    envVars: ['SHOPIFY_SHOP_DOMAIN', 'SHOPIFY_ADMIN_TOKEN'],
    description: 'Pulls orders + customers into Supabase. Powers the revenue / orders / AOV widgets.',
    setupUrl: 'https://help.shopify.com/en/manual/apps/app-types/custom-apps',
  },
  {
    name: 'Klaviyo',
    syncPath: '/api/klaviyo/sync',
    syncMethod: 'POST',
    rowId: 'klaviyo_sync',
    envVars: [],
    description: 'Pulls flows, campaigns, customers from Klaviyo. Token is hardcoded.',
    setupUrl: 'https://www.klaviyo.com/account#api-keys-tab',
  },
  {
    name: 'Meta',
    syncPath: '/api/sync/meta',
    rowId: 'meta_30d',
    envVars: ['META_ACCESS_TOKEN', 'META_AD_ACCOUNT_ID'],
    altEnvVars: { META_ACCESS_TOKEN: 'FACEBOOK_ACCESS_TOKEN' },
    description: 'Pulls last 30 days of ad insights (spend, ROAS, purchases).',
    setupUrl: 'https://developers.facebook.com/tools/explorer',
  },
  {
    name: 'PayPal',
    syncPath: '/api/sync/paypal',
    rowId: 'paypal_sync',
    envVars: ['PAYPAL_CLIENT_ID', 'PAYPAL_SECRET'],
    description: 'Pulls last 30 days of PayPal transactions.',
    setupUrl: 'https://developer.paypal.com/dashboard/applications/live',
  },
  {
    name: 'Revolut',
    syncPath: '/api/sync/revolut',
    rowId: 'revolut_sync',
    envVars: ['REVOLUT_CLIENT_ID'],
    requiresOAuth: '/api/revolut/auth',
    description: 'Pulls last 30 days of Revolut transactions. Requires one-time OAuth.',
    setupUrl: 'https://business.revolut.com/settings/api',
  },
  {
    name: 'Windsor',
    syncPath: null,
    rowId: null,
    envVars: [],
    description: 'Live fetch on demand — no sync needed. API key is hardcoded.',
  },
]

export default async function handler(req, res) {
  let rows = []
  try {
    const { data } = await supabase.from('integrations').select('*')
    rows = data || []
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }

  const result = CONNECTORS.map(c => {
    const envStatus = c.envVars.map(v => {
      const alt = c.altEnvVars?.[v]
      const present = !!process.env[v] || (alt ? !!process.env[alt] : false)
      return { name: v, present, alt }
    })
    const allEnvPresent = envStatus.every(e => e.present)
    const row = c.rowId ? rows.find(r => r.id === c.rowId) : null
    const lastSync = row?.last_sync || row?.updated_at || null
    let oauthRow = null
    if (c.requiresOAuth) {
      const baseId = c.name.toLowerCase()
      oauthRow = rows.find(r => r.id === baseId) || null
    }

    let status = 'ok'
    let statusReason = 'live'
    if (c.envVars.length && !allEnvPresent) {
      status = 'not_configured'
      statusReason = 'env vars missing'
    } else if (c.requiresOAuth && !oauthRow) {
      status = 'needs_auth'
      statusReason = 'OAuth not completed'
    } else if (c.rowId && !lastSync) {
      status = 'never_synced'
      statusReason = 'never synced'
    } else if (lastSync) {
      const ageH = (Date.now() - new Date(lastSync).getTime()) / 3600000
      status = ageH < 24 ? 'ok' : ageH < 72 ? 'stale' : 'very_stale'
      statusReason = ageH < 1 ? `${Math.round(ageH * 60)}m ago` : `${Math.round(ageH)}h ago`
    }

    return {
      name: c.name,
      description: c.description,
      syncPath: c.syncPath,
      syncMethod: c.syncMethod || 'GET',
      envVars: envStatus,
      lastSync,
      status,
      statusReason,
      lastResult: row?.meta || null,
      requiresOAuth: c.requiresOAuth,
      oauthDone: !!oauthRow,
      setupUrl: c.setupUrl,
    }
  })

  res.status(200).json({ connectors: result, generatedAt: new Date().toISOString() })
}
