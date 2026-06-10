import { exchangeCode } from '../../../lib/truelayer'
import { supabase } from '../../../lib/supabase'

export default async function handler(req, res) {
  const { code, error } = req.query

  if (error || !code) {
    return res.redirect('/?bank_error=' + (error || 'no_code'))
  }

  try {
    const tokens = await exchangeCode(code)

    await supabase.from('personal_bank_tokens').upsert({
      id: 'truelayer',
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })

    res.redirect('/?bank_connected=true')
  } catch (e) {
    console.error('TrueLayer callback error:', e)
    res.redirect('/?bank_error=' + encodeURIComponent(e.message))
  }
}
