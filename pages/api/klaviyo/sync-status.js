import { supabase } from '../../../lib/supabase'

export default async function handler(req, res) {
  try {
    const { data, error } = await supabase
      .from('integrations')
      .select('*')
      .eq('id', 'klaviyo_sync')
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    if (!data) {
      return res.json({
        synced: false,
        last_sync: null,
        message: 'Never synced',
      })
    }

    const stats = data.access_token ? JSON.parse(data.access_token) : {}

    res.json({
      synced: true,
      last_sync: stats.last_sync || data.updated_at,
      last_sync_mode: stats.last_sync_mode,
      last_sync_result: stats.last_sync_result,
      profiles_synced: stats.profiles_synced || 0,
      events_tracked: stats.events_tracked || 0,
      total_customers: stats.total_customers || 0,
      last_batch_profiles: stats.last_batch_profiles || 0,
      last_batch_events: stats.last_batch_events || 0,
      error_count: stats.error_count || 0,
    })
  } catch (e) {
    console.error('Sync status error:', e)
    res.status(500).json({ error: 'Failed to fetch sync status' })
  }
}
