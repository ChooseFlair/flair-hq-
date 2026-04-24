// Revolut Business API Integration
import jwt from 'jsonwebtoken'

const REVOLUT_CLIENT_ID = process.env.REVOLUT_CLIENT_ID || 'jlvJ5fi12udTAgZ9PGpP7qZIiAGxnDW4w-5Koia7Q6k'
const REVOLUT_REDIRECT_URI = process.env.REVOLUT_REDIRECT_URI || 'https://flair-hq.vercel.app/api/revolut/callback'
const REVOLUT_PRIVATE_KEY = process.env.REVOLUT_PRIVATE_KEY?.replace(/\\n/g, '\n')

// Production API base URL
const REVOLUT_API_BASE = 'https://b2b.revolut.com/api/1.0'
const REVOLUT_AUTH_URL = 'https://business.revolut.com/app-confirm'

export function getAuthorizationUrl() {
  return `${REVOLUT_AUTH_URL}?client_id=${REVOLUT_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(REVOLUT_REDIRECT_URI)}`
}

function createClientAssertion() {
  if (!REVOLUT_PRIVATE_KEY) {
    throw new Error('REVOLUT_PRIVATE_KEY not configured')
  }

  const now = Math.floor(Date.now() / 1000)

  // Extract domain from redirect URI (without https://)
  const domain = new URL(REVOLUT_REDIRECT_URI).hostname

  const payload = {
    iss: domain, // Must be your domain, not client ID
    sub: REVOLUT_CLIENT_ID,
    aud: 'https://revolut.com',
    iat: now,
    exp: now + 60 * 60, // 1 hour expiry
  }

  return jwt.sign(payload, REVOLUT_PRIVATE_KEY, { algorithm: 'RS256' })
}

export async function exchangeCodeForToken(code) {
  const clientAssertion = createClientAssertion()

  const response = await fetch(`${REVOLUT_API_BASE}/auth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: REVOLUT_CLIENT_ID,
      client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
      client_assertion: clientAssertion,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Token exchange error:', errorText)
    throw new Error(`Token exchange failed: ${response.status} - ${errorText}`)
  }

  return response.json()
}

export async function refreshAccessToken(refreshToken) {
  const clientAssertion = createClientAssertion()

  const response = await fetch(`${REVOLUT_API_BASE}/auth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: REVOLUT_CLIENT_ID,
      client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
      client_assertion: clientAssertion,
    }),
  })

  if (!response.ok) {
    throw new Error(`Token refresh failed: ${response.status}`)
  }

  return response.json()
}

export async function getAccounts(accessToken) {
  const response = await fetch(`${REVOLUT_API_BASE}/accounts`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch accounts: ${response.status}`)
  }

  return response.json()
}

export async function getTransactions(accessToken, options = {}) {
  const params = new URLSearchParams()
  if (options.from) params.append('from', options.from)
  if (options.to) params.append('to', options.to)
  if (options.count) params.append('count', options.count)
  if (options.type) params.append('type', options.type)

  const url = `${REVOLUT_API_BASE}/transactions${params.toString() ? '?' + params.toString() : ''}`

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch transactions: ${response.status}`)
  }

  return response.json()
}

export async function getCounterparties(accessToken) {
  const response = await fetch(`${REVOLUT_API_BASE}/counterparties`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch counterparties: ${response.status}`)
  }

  return response.json()
}
