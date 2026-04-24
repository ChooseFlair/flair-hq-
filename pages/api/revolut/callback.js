// Handle OAuth callback from Revolut
import { exchangeCodeForToken } from '../../../lib/revolut'
import { supabase } from '../../../lib/supabase'

export default async function handler(req, res) {
  const { code, error, debug } = req.query

  // Debug mode - show what's happening
  if (debug === 'true') {
    const hasPrivateKey = !!process.env.REVOLUT_PRIVATE_KEY
    const clientId = process.env.REVOLUT_CLIENT_ID || 'not set'
    const redirectUri = process.env.REVOLUT_REDIRECT_URI || 'not set'
    return res.status(200).json({
      hasPrivateKey,
      clientId: clientId.trim(),
      clientIdLength: clientId.length,
      redirectUri: redirectUri.trim(),
      code: code ? 'present' : 'missing',
      error: error || null,
    })
  }

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
      return res.redirect('/?revolut_error=' + encodeURIComponent('DB error: ' + dbError.message))
    }

    // Redirect back to dashboard with success
    res.redirect('/?revolut_connected=true')
  } catch (err) {
    console.error('OAuth callback error:', err)
    // Show error on a page instead of redirect so we can debug
    res.status(500).send(`
      <html>
        <head><title>Revolut OAuth Error</title></head>
        <body style="font-family: system-ui; padding: 40px; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #dc2626;">Connection Failed</h1>
          <p><strong>Error:</strong> ${err.message}</p>
          <pre style="background: #f3f4f6; padding: 16px; border-radius: 8px; overflow: auto;">${err.stack}</pre>
          <p style="margin-top: 24px;">
            <a href="/" style="color: #2563eb;">Back to Dashboard</a>
          </p>
        </body>
      </html>
    `)
  }
}
