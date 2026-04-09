import { supabase } from '../../../lib/supabase'

const KLAVIYO_KEY = 'pk_bce69162bc267f14cbb31eff287d6c10c8'
const BASE = 'https://a.klaviyo.com/api'
const headers = {
  'Authorization': `Klaviyo-API-Key ${KLAVIYO_KEY}`,
  'revision': '2024-10-15',
  'Content-Type': 'application/json',
  'Accept': 'application/json',
}

async function kGet(path) {
  const r = await fetch(`${BASE}${path}`, { headers })
  return r.json()
}

async function kPost(path, body) {
  const r = await fetch(`${BASE}${path}`, { method: 'POST', headers, body: JSON.stringify(body) })
  const text = await r.text()
  return { status: r.status, data: text ? JSON.parse(text) : null }
}

// Sync flows from Klaviyo into Supabase
async function syncFlows() {
  const flows = await kGet('/flows/?fields[flow]=name,status,trigger_type,created,updated')
  if (!flows.data) return { synced: 0 }

  let synced = 0
  for (const flow of flows.data) {
    const { error } = await supabase.from('klaviyo_flows').upsert({
      flow_id: flow.id,
      flow_name: flow.attributes.name,
      status: flow.attributes.status,
      trigger_type: flow.attributes.trigger_type || flow.attributes.triggerType,
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'flow_id' })
    if (!error) synced++
  }
  return { synced, total: flows.data.length }
}

// Sync campaigns from Klaviyo into Supabase
async function syncCampaigns() {
  const campaigns = await kGet('/campaigns/?filter=equals(messages.channel,%22email%22)&fields[campaign]=name,status,send_time,created_at&sort=-created_at')
  if (!campaigns.data) return { synced: 0 }

  let synced = 0
  for (const c of campaigns.data) {
    const { error } = await supabase.from('klaviyo_campaigns').upsert({
      campaign_id: c.id,
      campaign_name: c.attributes.name,
      status: c.attributes.status,
      send_time: c.attributes.send_time || null,
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'campaign_id' })
    if (!error) synced++
  }
  return { synced, total: campaigns.data.length }
}

// Sync customers from Supabase orders to Klaviyo profiles
async function syncCustomersToKlaviyo() {
  // Get customers from Supabase
  const { data: customers, error } = await supabase
    .from('customers')
    .select('email, total_spent, order_count')
    .order('total_spent', { ascending: false })
    .limit(500)

  if (error || !customers) return { synced: 0, errors: [] }

  let synced = 0
  const errors = []

  // Batch profiles via Klaviyo's import endpoint
  const batchSize = 100
  for (let i = 0; i < customers.length; i += batchSize) {
    const batch = customers.slice(i, i + batchSize)
    const result = await kPost('/profile-bulk-import-jobs/', {
      data: {
        type: 'profile-bulk-import-job',
        attributes: {
          profiles: {
            data: batch.map(c => ({
              type: 'profile',
              attributes: {
                email: c.email,
                properties: {
                  source: 'flair_hq',
                  total_spent: parseFloat(c.total_spent || 0),
                  order_count: c.order_count || 0,
                  customer_tier: parseFloat(c.total_spent || 0) >= 100 ? 'vip' : parseFloat(c.total_spent || 0) >= 50 ? 'regular' : 'new',
                },
              },
            })),
          },
        },
      },
    })

    if (result.status >= 200 && result.status < 300) {
      synced += batch.length
    } else {
      errors.push(`Batch ${Math.floor(i / batchSize) + 1}: status ${result.status}`)
    }
  }

  return { synced, total: customers.length, errors }
}

// Populate customers table from orders
async function populateCustomers() {
  const { error } = await supabase.rpc('populate_customers_from_orders').catch(() => ({ error: true }))

  // Fallback: do it via direct SQL-like approach
  if (error) {
    const { data: orders } = await supabase
      .from('orders')
      .select('email, total_price, created_at')
      .not('email', 'is', null)

    if (!orders) return { populated: 0 }

    const customerMap = {}
    for (const o of orders) {
      const email = (o.email || '').toLowerCase().trim()
      if (!email) continue
      if (!customerMap[email]) {
        customerMap[email] = { email, total_spent: 0, order_count: 0, created_at: o.created_at }
      }
      customerMap[email].total_spent += parseFloat(o.total_price || 0)
      customerMap[email].order_count += 1
      if (o.created_at < customerMap[email].created_at) {
        customerMap[email].created_at = o.created_at
      }
    }

    let populated = 0
    const customers = Object.values(customerMap)
    for (let i = 0; i < customers.length; i += 50) {
      const batch = customers.slice(i, i + 50)
      const { error: upsertError } = await supabase.from('customers').upsert(
        batch.map(c => ({
          email: c.email,
          total_spent: c.total_spent,
          order_count: c.order_count,
          created_at: c.created_at,
          updated_at: new Date().toISOString(),
        })),
        { onConflict: 'email' }
      )
      if (!upsertError) populated += batch.length
    }
    return { populated }
  }

  return { populated: 'via_rpc' }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { mode = 'full' } = req.body || {}

  try {
    const results = {}

    // Step 1: Populate customers from orders
    results.customers = await populateCustomers()

    // Step 2: Sync flows and campaigns from Klaviyo to Supabase
    const [flowResult, campaignResult] = await Promise.all([
      syncFlows(),
      syncCampaigns(),
    ])
    results.flows = flowResult
    results.campaigns = campaignResult

    // Step 3: Push customer profiles to Klaviyo
    results.profiles = await syncCustomersToKlaviyo()

    // Step 4: Update sync status
    await supabase.from('integrations').upsert({
      id: 'klaviyo_sync',
      provider: 'klaviyo',
      access_token: JSON.stringify({
        last_sync: new Date().toISOString(),
        last_sync_mode: mode,
        last_sync_result: 'success',
        flows_synced: flowResult.synced,
        campaigns_synced: campaignResult.synced,
        profiles_pushed: results.profiles.synced,
        customers_populated: results.customers.populated,
      }),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' })

    res.json({
      message: 'Sync completed',
      mode,
      ...results,
    })
  } catch (e) {
    console.error('Klaviyo sync error:', e)
    res.status(500).json({ error: e.message || 'Sync failed' })
  }
}
