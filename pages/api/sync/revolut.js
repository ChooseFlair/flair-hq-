import { supabase } from '../../../lib/supabase'
import { getTransactions, refreshAccessToken } from '../../../lib/revolut'

export const config = { maxDuration: 30 }

export default async function handler(req, res) {
  if (!process.env.REVOLUT_CLIENT_ID) {
    return res.status(200).json({
      name: 'Revolut',
      status: 'not_configured',
      message: 'Set REVOLUT_CLIENT_ID and authorise the integration first',
    })
  }

  try {
    const { data: integration } = await supabase
      .from('integrations')
      .select('*')
      .eq('id', 'revolut')
      .maybeSingle()

    if (!integration) {
      return res.status(200).json({
        name: 'Revolut',
        status: 'not_configured',
        message: 'Visit /api/revolut/auth to connect Revolut first',
      })
    }

    let accessToken = integration.access_token
    if (new Date(integration.expires_at) < new Date()) {
      try {
        const tokens = await refreshAccessToken(integration.refresh_token)
        accessToken = tokens.access_token
        await supabase.from('integrations').update({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token || integration.refresh_token,
          expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        }).eq('id', 'revolut')
      } catch (e) {
        return res.status(200).json({
          name: 'Revolut',
          status: 'error',
          message: 'Token refresh failed, reconnect at /api/revolut/auth',
        })
      }
    }

    const fromDate = new Date(Date.now() - 30 * 86400000).toISOString()
    const toDate = new Date().toISOString()
    const txns = await getTransactions(accessToken, { from: fromDate, to: toDate, count: 100 })
    const list = Array.isArray(txns) ? txns : (txns?.transactions || [])

    await supabase.from('integrations').upsert({
      id: 'revolut_sync',
      provider: 'revolut',
      last_sync: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      meta: { transactions: list.length },
    })

    res.status(200).json({
      name: 'Revolut',
      status: 'ok',
      transactions: list.length,
    })
  } catch (e) {
    res.status(200).json({
      name: 'Revolut',
      status: 'error',
      message: e.message,
    })
  }
}
