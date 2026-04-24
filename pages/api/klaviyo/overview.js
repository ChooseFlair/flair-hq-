// Klaviyo overview data
import { getLists, getCampaigns, getFlows, getSegments, getProfiles } from '../../../lib/klaviyo'

export default async function handler(req, res) {
  if (!process.env.KLAVIYO_API_KEY) {
    return res.status(200).json({ needsAuth: true })
  }

  try {
    // Fetch all data in parallel
    const [lists, campaigns, flows, segments, profilesData] = await Promise.all([
      getLists(),
      getCampaigns(),
      getFlows(),
      getSegments(),
      getProfiles({ pageSize: 1 }), // Just to get count
    ])

    // Get recent campaigns (last 10)
    const recentCampaigns = campaigns
      .sort((a, b) => new Date(b.attributes.created_at) - new Date(a.attributes.created_at))
      .slice(0, 10)
      .map(c => ({
        id: c.id,
        name: c.attributes.name,
        status: c.attributes.status,
        sendTime: c.attributes.send_time,
        createdAt: c.attributes.created_at,
      }))

    // Get active flows
    const activeFlows = flows
      .filter(f => f.attributes.status === 'live')
      .map(f => ({
        id: f.id,
        name: f.attributes.name,
        status: f.attributes.status,
        createdAt: f.attributes.created,
      }))

    // Get list summaries
    const listSummaries = lists.map(l => ({
      id: l.id,
      name: l.attributes.name,
      createdAt: l.attributes.created,
    }))

    // Get segment summaries
    const segmentSummaries = segments.map(s => ({
      id: s.id,
      name: s.attributes.name,
      createdAt: s.attributes.created,
    }))

    res.status(200).json({
      stats: {
        totalLists: lists.length,
        totalCampaigns: campaigns.length,
        totalFlows: flows.length,
        activeFlows: flows.filter(f => f.attributes.status === 'live').length,
        totalSegments: segments.length,
      },
      recentCampaigns,
      activeFlows,
      lists: listSummaries,
      segments: segmentSummaries,
    })
  } catch (err) {
    console.error('Klaviyo overview error:', err)
    res.status(500).json({ error: err.message })
  }
}
