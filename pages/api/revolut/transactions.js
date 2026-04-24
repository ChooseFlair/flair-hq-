// Get Revolut transactions
import { getTransactions, refreshAccessToken } from '../../../lib/revolut'
import { supabase } from '../../../lib/supabase'

export default async function handler(req, res) {
  try {
    // Get stored tokens
    const { data: integration, error: dbError } = await supabase
      .from('integrations')
      .select('*')
      .eq('id', 'revolut')
      .single()

    if (dbError || !integration) {
      return res.status(401).json({ error: 'Revolut not connected', needsAuth: true })
    }

    let accessToken = integration.access_token

    // Check if token is expired
    if (new Date(integration.expires_at) < new Date()) {
      try {
        const tokens = await refreshAccessToken(integration.refresh_token)
        accessToken = tokens.access_token

        await supabase
          .from('integrations')
          .update({
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token || integration.refresh_token,
            expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', 'revolut')
      } catch (refreshErr) {
        return res.status(401).json({ error: 'Token expired, please reconnect', needsAuth: true })
      }
    }

    // Get query params
    const { from, to, count = 50 } = req.query

    // Default to last 30 days
    const fromDate = from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const toDate = to || new Date().toISOString()

    // Fetch transactions
    const transactions = await getTransactions(accessToken, {
      from: fromDate,
      to: toDate,
      count: parseInt(count),
    })

    res.status(200).json({ transactions })
  } catch (err) {
    console.error('Transactions fetch error:', err)
    res.status(500).json({ error: err.message })
  }
}
