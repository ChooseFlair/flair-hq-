// Facebook Graph API Integration for Organic Data
const FB_PAGE_ID = process.env.FB_PAGE_ID || '671018469423117'
const FB_PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN

const FB_API_BASE = 'https://graph.facebook.com/v19.0'

async function fbFetch(endpoint, options = {}) {
  const url = new URL(`${FB_API_BASE}${endpoint}`)
  url.searchParams.append('access_token', FB_PAGE_ACCESS_TOKEN)

  const response = await fetch(url.toString(), options)

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Facebook API error: ${response.status} - ${errorText}`)
  }

  return response.json()
}

export async function getPageInfo() {
  const fields = 'id,name,username,fan_count,followers_count,link,about,category,cover,picture'
  const data = await fbFetch(`/${FB_PAGE_ID}?fields=${fields}`)
  return data
}

export async function getPageInsights(period = 'day', datePreset = 'last_30d') {
  // Key metrics for organic performance
  const metrics = [
    'page_impressions',
    'page_impressions_unique',
    'page_engaged_users',
    'page_post_engagements',
    'page_fans',
    'page_fan_adds',
    'page_fan_removes',
    'page_views_total',
    'page_actions_post_reactions_total',
  ].join(',')

  const data = await fbFetch(
    `/${FB_PAGE_ID}/insights?metric=${metrics}&period=${period}&date_preset=${datePreset}`
  )
  return data.data || []
}

export async function getPagePosts(limit = 25) {
  const fields = 'id,message,created_time,permalink_url,full_picture,type,shares,reactions.summary(true),comments.summary(true)'
  const data = await fbFetch(`/${FB_PAGE_ID}/posts?fields=${fields}&limit=${limit}`)
  return data.data || []
}

export async function getPostInsights(postId) {
  const metrics = [
    'post_impressions',
    'post_impressions_unique',
    'post_engaged_users',
    'post_clicks',
    'post_reactions_by_type_total',
  ].join(',')

  try {
    const data = await fbFetch(`/${postId}/insights?metric=${metrics}`)
    return data.data || []
  } catch (err) {
    console.error('Error fetching post insights:', err)
    return []
  }
}

export async function getInstagramAccount() {
  try {
    const data = await fbFetch(`/${FB_PAGE_ID}?fields=instagram_business_account`)
    return data.instagram_business_account || null
  } catch (err) {
    console.error('Error fetching Instagram account:', err)
    return null
  }
}

export async function getInstagramInsights(igAccountId) {
  if (!igAccountId) return null

  const metrics = [
    'impressions',
    'reach',
    'profile_views',
    'website_clicks',
    'follower_count',
  ].join(',')

  try {
    const data = await fbFetch(
      `/${igAccountId}/insights?metric=${metrics}&period=day&metric_type=total_value`
    )
    return data.data || []
  } catch (err) {
    console.error('Error fetching Instagram insights:', err)
    return []
  }
}

export async function getInstagramMedia(igAccountId, limit = 25) {
  if (!igAccountId) return []

  const fields = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count'
  try {
    const data = await fbFetch(`/${igAccountId}/media?fields=${fields}&limit=${limit}`)
    return data.data || []
  } catch (err) {
    console.error('Error fetching Instagram media:', err)
    return []
  }
}
