import { supabase } from '../../../lib/supabase'
import { getAccounts, refreshAccessToken } from '../../../lib/revolut'

export const config = { maxDuration: 30 }

const WINDSOR_KEY = 'cc92158d0eb0f1faa257c0414780b6c10961'

async function refreshAndStore(integration) {
  const tokens = await refreshAccessToken(integration.refresh_token)
  await supabase.from('integrations').update({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token || integration.refresh_token,
    expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', 'revolut')
  return tokens.access_token
}

async function fetchRevolutAccounts() {
  try {
    const { data: integration } = await supabase
      .from('integrations').select('*').eq('id', 'revolut').maybeSingle()
    if (!integration?.access_token) return { connected: false }

    let accessToken = integration.access_token
    // Proactively refresh if expired or within 5 minutes of expiry
    const expiresAt = integration.expires_at ? new Date(integration.expires_at).getTime() : 0
    if (expiresAt - Date.now() < 5 * 60 * 1000) {
      try { accessToken = await refreshAndStore(integration) }
      catch { return { connected: false, error: 'Token refresh failed' } }
    }

    // Try accounts; on 401, force a refresh and retry once
    let accounts
    try {
      accounts = await getAccounts(accessToken)
    } catch (e) {
      if (/401/.test(e.message) && integration.refresh_token) {
        try {
          accessToken = await refreshAndStore(integration)
          accounts = await getAccounts(accessToken)
        } catch (retryErr) {
          return { connected: false, error: `Refresh + retry failed: ${retryErr.message}` }
        }
      } else {
        return { connected: false, error: e.message }
      }
    }

    const list = Array.isArray(accounts) ? accounts : (accounts?.accounts || [])
    return {
      connected: true,
      accounts: list.map(a => ({
        id: a.id,
        name: a.name || a.public_name || 'Account',
        currency: a.currency || 'GBP',
        balance: parseFloat(a.balance || 0),
        state: a.state,
      })),
    }
  } catch (e) {
    return { connected: false, error: e.message }
  }
}

export default async function handler(req, res) {
  const revolut = await fetchRevolutAccounts()

  // Group by currency
  const byCurrency = {}
  for (const a of (revolut.accounts || [])) {
    if (!byCurrency[a.currency]) byCurrency[a.currency] = 0
    byCurrency[a.currency] += a.balance
  }
  const totalGBP = byCurrency['GBP'] || 0

  // Pull last-30d burn from pnl-live for runway calc
  let runwayMonths = null
  try {
    const host = req.headers['x-forwarded-host'] || req.headers.host
    const proto = req.headers['x-forwarded-proto'] || 'https'
    const r = await fetch(`${proto}://${host}/api/pnl-live?range=30d&compare=false`)
    if (r.ok) {
      const j = await r.json()
      const monthlyOpex = j.totals?.costs?.opex || 0
      const inventory30 = j.revolut?.inventoryCash || 0
      const monthlyBurn = monthlyOpex + inventory30
      if (monthlyBurn > 0 && totalGBP > 0) {
        runwayMonths = totalGBP / monthlyBurn
      }
    }
  } catch {}

  res.status(200).json({
    connected: revolut.connected,
    accounts: revolut.accounts || [],
    byCurrency,
    totalGBP: Math.round(totalGBP * 100) / 100,
    runwayMonths: runwayMonths != null ? Math.round(runwayMonths * 10) / 10 : null,
    error: revolut.error || null,
    generatedAt: new Date().toISOString(),
  })
}
