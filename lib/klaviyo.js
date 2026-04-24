// Klaviyo API Integration
const KLAVIYO_API_KEY = process.env.KLAVIYO_API_KEY

const KLAVIYO_API_BASE = 'https://a.klaviyo.com/api'

async function klaviyoFetch(endpoint, options = {}) {
  const response = await fetch(`${KLAVIYO_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Klaviyo-API-Key ${KLAVIYO_API_KEY}`,
      'accept': 'application/json',
      'revision': '2024-02-15',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Klaviyo API error: ${response.status} - ${errorText}`)
  }

  return response.json()
}

export async function getLists() {
  const data = await klaviyoFetch('/lists')
  return data.data || []
}

export async function getListProfiles(listId) {
  const data = await klaviyoFetch(`/lists/${listId}/profiles`)
  return data.data || []
}

export async function getCampaigns() {
  const data = await klaviyoFetch('/campaigns?filter=equals(messages.channel,"email")')
  return data.data || []
}

export async function getCampaignMessages(campaignId) {
  const data = await klaviyoFetch(`/campaigns/${campaignId}/campaign-messages`)
  return data.data || []
}

export async function getFlows() {
  const data = await klaviyoFetch('/flows')
  return data.data || []
}

export async function getMetrics() {
  const data = await klaviyoFetch('/metrics')
  return data.data || []
}

export async function getProfiles(options = {}) {
  let endpoint = '/profiles'
  const params = new URLSearchParams()

  if (options.pageSize) params.append('page[size]', options.pageSize)
  if (options.sort) params.append('sort', options.sort)

  if (params.toString()) {
    endpoint += '?' + params.toString()
  }

  const data = await klaviyoFetch(endpoint)
  return {
    profiles: data.data || [],
    links: data.links || {},
  }
}

export async function getSegments() {
  const data = await klaviyoFetch('/segments')
  return data.data || []
}

export async function getAccount() {
  const data = await klaviyoFetch('/accounts')
  return data.data?.[0] || null
}

// Get aggregate metrics for campaigns
export async function getCampaignMetrics(campaignId) {
  try {
    const data = await klaviyoFetch(`/campaign-values-reports`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        data: {
          type: 'campaign-values-report',
          attributes: {
            statistics: ['opens', 'clicks', 'recipients', 'revenue'],
            timeframe: { key: 'last_365_days' },
            conversion_metric_id: 'PLACED_ORDER',
          },
          relationships: {
            campaigns: {
              data: [{ type: 'campaign', id: campaignId }]
            }
          }
        }
      })
    })
    return data.data?.attributes?.results || []
  } catch (err) {
    console.error('Error fetching campaign metrics:', err)
    return []
  }
}
