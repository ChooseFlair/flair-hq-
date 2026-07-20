const CLIENT_ID = process.env.TRUELAYER_CLIENT_ID
const CLIENT_SECRET = process.env.TRUELAYER_CLIENT_SECRET
const REDIRECT_URI = process.env.TRUELAYER_REDIRECT_URI || 'https://flair-hq.vercel.app/api/truelayer/callback'

// Sandbox vs live: force with TRUELAYER_ENV, otherwise infer from the
// client id (sandbox client ids are prefixed "sandbox-").
const IS_SANDBOX = process.env.TRUELAYER_ENV
  ? process.env.TRUELAYER_ENV.toLowerCase() === 'sandbox'
  : (CLIENT_ID || '').startsWith('sandbox-')

const AUTH_BASE = IS_SANDBOX ? 'https://auth.truelayer-sandbox.com' : 'https://auth.truelayer.com'
const API_BASE = IS_SANDBOX ? 'https://api.truelayer-sandbox.com' : 'https://api.truelayer.com'
// Sandbox exposes a mock bank; live uses all real UK Open Banking providers.
const PROVIDERS = IS_SANDBOX ? 'uk-cs-mock uk-ob-all' : 'uk-ob-all'

export function getAuthUrl() {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: 'info accounts balance transactions offline_access',
    providers: PROVIDERS,
  })
  return `${AUTH_BASE}/?${params.toString()}`
}

export async function exchangeCode(code) {
  const res = await fetch(`${AUTH_BASE}/connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      code,
    }),
  })
  if (!res.ok) throw new Error(`Token exchange failed: ${res.status}`)
  return res.json()
}

export async function refreshToken(refresh_token) {
  const res = await fetch(`${AUTH_BASE}/connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token,
    }),
  })
  if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`)
  return res.json()
}

async function tlFetch(path, accessToken) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error(`TrueLayer ${path}: ${res.status}`)
  return res.json()
}

export async function getAccounts(accessToken) {
  const data = await tlFetch('/data/v1/accounts', accessToken)
  return data.results || []
}

export async function getBalance(accessToken, accountId) {
  const data = await tlFetch(`/data/v1/accounts/${accountId}/balance`, accessToken)
  return data.results?.[0] || null
}

export async function getTransactions(accessToken, accountId, from, to) {
  const params = new URLSearchParams({ from, to })
  const data = await tlFetch(`/data/v1/accounts/${accountId}/transactions?${params}`, accessToken)
  return data.results || []
}
