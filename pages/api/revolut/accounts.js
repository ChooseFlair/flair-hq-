// Get Revolut accounts and balances
import { getAccounts, refreshAccessToken } from '../../../lib/revolut'
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
      // Refresh the token
      try {
        const tokens = await refreshAccessToken(integration.refresh_token)
        accessToken = tokens.access_token

        // Update stored tokens
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

    // Fetch accounts
    const accounts = await getAccounts(accessToken)

    res.status(200).json({ accounts })
  } catch (err) {
    console.error('Accounts fetch error:', err)
    res.status(500).json({ error: err.message })
  }
}
