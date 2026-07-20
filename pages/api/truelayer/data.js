import { refreshToken, getAccounts, getBalance, getTransactions } from '../../../lib/truelayer'
import { supabase } from '../../../lib/supabase'

async function getValidToken() {
  const { data: row } = await supabase
    .from('personal_bank_tokens')
    .select('*')
    .eq('id', 'truelayer')
    .single()

  if (!row?.access_token) return null

  const expiresAt = row.expires_at ? new Date(row.expires_at).getTime() : 0
  if (expiresAt - Date.now() > 60_000) return row.access_token

  if (!row.refresh_token) return null
  const tokens = await refreshToken(row.refresh_token)
  await supabase.from('personal_bank_tokens').upsert({
    id: 'truelayer',
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token || row.refresh_token,
    expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  })
  return tokens.access_token
}

export default async function handler(req, res) {
  try {
    const accessToken = await getValidToken()
    if (!accessToken) {
      return res.status(200).json({ connected: false, accounts: [] })
    }

    const accounts = await getAccounts(accessToken)
    const to = new Date().toISOString()
    const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    const enriched = await Promise.all(
      accounts.map(async (acc) => {
        const [balance, transactions] = await Promise.all([
          getBalance(accessToken, acc.account_id).catch(() => null),
          getTransactions(accessToken, acc.account_id, from, to).catch(() => []),
        ])
        return {
          id: acc.account_id,
          name: acc.display_name || acc.account_type,
          provider: acc.provider?.display_name || '',
          type: acc.account_type,
          currency: acc.currency,
          balance: balance?.current ?? null,
          available: balance?.available ?? null,
          transactions: transactions.slice(0, 25).map((t) => ({
            id: t.transaction_id,
            date: t.timestamp,
            description: t.description,
            amount: t.amount,
            currency: t.currency,
            category: t.transaction_category,
          })),
        }
      })
    )

    res.status(200).json({ connected: true, accounts: enriched })
  } catch (e) {
    console.error('TrueLayer data error:', e)
    // An auth failure means the stored token is no longer usable — surface as not connected
    if (String(e.message).includes('401') || String(e.message).includes('refresh failed')) {
      return res.status(200).json({ connected: false, accounts: [], error: e.message })
    }
    res.status(500).json({ error: e.message })
  }
}
