import { supabase } from '../../../lib/supabase'

export default async function handler(req, res) {
  try {
    // Get sync status
    const { data: syncData } = await supabase
      .from('integrations')
      .select('*')
      .eq('id', 'klaviyo_sync')
      .single()

    // Get counts from synced tables
    const [
      { count: flowCount },
      { count: campaignCount },
      { count: customerCount },
      { count: orderCount },
    ] = await Promise.all([
      supabase.from('klaviyo_flows').select('*', { count: 'exact', head: true }),
      supabase.from('klaviyo_campaigns').select('*', { count: 'exact', head: true }),
      supabase.from('customers').select('*', { count: 'exact', head: true }),
      supabase.from('orders').select('*', { count: 'exact', head: true }),
    ])

    // Get live flows
    const { data: liveFlows } = await supabase
      .from('klaviyo_flows')
      .select('flow_name, status, trigger_type, recipients, conversions, conversion_value, open_rate')
      .eq('status', 'live')

    // Get recent campaigns
    const { data: recentCampaigns } = await supabase
      .from('klaviyo_campaigns')
      .select('campaign_name, status, send_time')
      .order('send_time', { ascending: false })
      .limit(10)

    const stats = syncData?.access_token ? JSON.parse(syncData.access_token) : {}

    res.json({
      synced: !!syncData,
      last_sync: stats.last_sync || syncData?.updated_at || null,
      last_sync_mode: stats.last_sync_mode,
      last_sync_result: stats.last_sync_result,
      counts: {
        flows: flowCount || 0,
        campaigns: campaignCount || 0,
        customers: customerCount || 0,
        orders: orderCount || 0,
      },
      flows_synced: stats.flows_synced || 0,
      campaigns_synced: stats.campaigns_synced || 0,
      profiles_pushed: stats.profiles_pushed || 0,
      customers_populated: stats.customers_populated || 0,
      liveFlows: liveFlows || [],
      recentCampaigns: recentCampaigns || [],
    })
  } catch (e) {
    console.error('Sync status error:', e)
    res.status(500).json({ error: 'Failed to fetch sync status' })
  }
}
