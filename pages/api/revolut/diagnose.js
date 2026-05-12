import { supabase } from '../../../lib/supabase'
import { refreshAccessToken } from '../../../lib/revolut'

export const config = { maxDuration: 30 }

export default async function handler(req, res) {
  const out = { steps: [] }

  // 1. Read the integration row
  const { data: row, error: rowErr } = await supabase
    .from('integrations').select('*').eq('id', 'revolut').maybeSingle()
  if (rowErr) {
    out.steps.push({ step: 'read_integration', error: rowErr.message })
    return res.status(200).json(out)
  }
  if (!row) {
    out.steps.push({ step: 'read_integration', result: 'no row found — re-auth at /api/revolut/auth' })
    return res.status(200).json(out)
  }
  out.steps.push({
    step: 'read_integration',
    has_access_token: !!row.access_token,
    access_token_chars: row.access_token?.length || 0,
    has_refresh_token: !!row.refresh_token,
    refresh_token_chars: row.refresh_token?.length || 0,
    expires_at: row.expires_at,
    expired: row.expires_at ? new Date(row.expires_at) < new Date() : null,
    updated_at: row.updated_at,
  })

  // 2. Try to refresh
  let accessToken = row.access_token
  if (row.refresh_token) {
    try {
      const tokens = await refreshAccessToken(row.refresh_token)
      out.steps.push({
        step: 'refresh',
        result: 'ok',
        new_access_token_chars: tokens.access_token?.length || 0,
        new_refresh_token_chars: tokens.refresh_token?.length || 0,
        expires_in: tokens.expires_in,
      })
      accessToken = tokens.access_token
      // Persist new tokens
      await supabase.from('integrations').update({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || row.refresh_token,
        expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', 'revolut')
    } catch (e) {
      out.steps.push({ step: 'refresh', error: e.message })
    }
  } else {
    out.steps.push({ step: 'refresh', skipped: 'no refresh_token in row' })
  }

  // 3. Call /accounts and capture raw response
  try {
    const r = await fetch('https://b2b.revolut.com/api/1.0/accounts', {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    })
    const body = await r.text()
    out.steps.push({
      step: 'accounts',
      status: r.status,
      headers: { 'www-authenticate': r.headers.get('www-authenticate') },
      body: body.substring(0, 500),
    })
  } catch (e) {
    out.steps.push({ step: 'accounts', error: e.message })
  }

  res.status(200).json(out)
}
