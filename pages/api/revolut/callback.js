// Handle OAuth callback from Revolut
import { exchangeCodeForToken } from '../../../lib/revolut'
import { supabase } from '../../../lib/supabase'

export default async function handler(req, res) {
  const { code, error } = req.query

  if (error) {
    return res.redirect('/?revolut_error=' + encodeURIComponent(error))
  }

  if (!code) {
    return res.redirect('/?revolut_error=no_code')
  }

  try {
    // Exchange code for tokens
    const tokens = await exchangeCodeForToken(code)

    // Store tokens in Supabase (or you could use cookies/session)
    const { error: dbError } = await supabase
      .from('integrations')
      .upsert({
        id: 'revolut',
        provider: 'revolut',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' })

    if (dbError) {
      console.error('Failed to store tokens:', dbError)
    }

    // Redirect back to dashboard with success
    res.redirect('/?revolut_connected=true')
  } catch (err) {
    console.error('OAuth callback error:', err)
    res.redirect('/?revolut_error=' + encodeURIComponent(err.message))
  }
}
