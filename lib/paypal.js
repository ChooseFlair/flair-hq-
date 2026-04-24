// PayPal API Integration
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID
const PAYPAL_SECRET = process.env.PAYPAL_SECRET

// Live API base URL
const PAYPAL_API_BASE = 'https://api-m.paypal.com'

let cachedToken = null
let tokenExpiry = null

async function getAccessToken() {
  // Return cached token if still valid
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
    return cachedToken
  }

  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString('base64')

  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`PayPal auth failed: ${response.status} - ${error}`)
  }

  const data = await response.json()
  cachedToken = data.access_token
  // Set expiry 5 minutes before actual expiry for safety
  tokenExpiry = Date.now() + (data.expires_in - 300) * 1000

  return cachedToken
}

async function paypalFetch(endpoint, options = {}) {
  const accessToken = await getAccessToken()

  const response = await fetch(`${PAYPAL_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`PayPal API error: ${response.status} - ${error}`)
  }

  return response.json()
}

export async function getTransactions(options = {}) {
  const params = new URLSearchParams()

  // Default to last 31 days if no dates provided
  const endDate = options.endDate || new Date().toISOString()
  const startDate = options.startDate || new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString()

  params.append('start_date', startDate)
  params.append('end_date', endDate)
  params.append('page_size', options.pageSize || 100)
  if (options.page) params.append('page', options.page)
  params.append('fields', 'all')

  const data = await paypalFetch(`/v1/reporting/transactions?${params.toString()}`)
  return data
}

export async function getBalance() {
  try {
    const data = await paypalFetch('/v1/reporting/balances?as_of_time=' + new Date().toISOString() + '&currency_code=GBP')
    return data
  } catch (err) {
    // Balance endpoint might not be available for all accounts
    console.error('PayPal balance error:', err)
    return null
  }
}

export async function getAccountInfo() {
  try {
    const data = await paypalFetch('/v1/identity/oauth2/userinfo?schema=paypalv1.1')
    return data
  } catch (err) {
    console.error('PayPal account info error:', err)
    return null
  }
}
