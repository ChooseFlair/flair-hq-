import { supabase } from '../../../lib/supabase'

const KLAVIYO_KEY = 'pk_bce69162bc267f14cbb31eff287d6c10c8'
const BASE = 'https://a.klaviyo.com/api'
const headers = {
  'Authorization': `Klaviyo-API-Key ${KLAVIYO_KEY}`,
  'revision': '2024-10-15',
  'Content-Type': 'application/json',
  'Accept': 'application/json',
}

async function kPost(path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  const text = await r.text()
  return { status: r.status, data: text ? JSON.parse(text) : null }
}

// Create or update a profile in Klaviyo
async function upsertProfile(email, firstName, lastName, extraProps = {}) {
  const attributes = {
    email,
    ...(firstName && { first_name: firstName }),
    ...(lastName && { last_name: lastName }),
    properties: {
      source: 'flair_hq_sync',
      ...extraProps,
    },
  }

  // Use profile import (upsert) - this creates or updates
  return kPost('/profile-import/', {
    data: {
      type: 'profile',
      attributes,
    },
  })
}

// Bulk import profiles using Klaviyo's bulk import
async function bulkImportProfiles(profiles) {
  return kPost('/profile-bulk-import-jobs/', {
    data: {
      type: 'profile-bulk-import-job',
      attributes: {
        profiles: {
          data: profiles.map(p => ({
            type: 'profile',
            attributes: {
              email: p.email,
              ...(p.first_name && { first_name: p.first_name }),
              ...(p.last_name && { last_name: p.last_name }),
              properties: {
                source: 'flair_hq_sync',
                total_spent: p.total_spent || 0,
                order_count: p.order_count || 0,
                last_order_date: p.last_order_date || null,
              },
            },
          })),
        },
      },
    },
  })
}

// Track a "Placed Order" event in Klaviyo
async function trackOrderEvent(order) {
  return kPost('/events/', {
    data: {
      type: 'event',
      attributes: {
        metric: {
          data: {
            type: 'metric',
            attributes: { name: 'Placed Order' },
          },
        },
        profile: {
          data: {
            type: 'profile',
            attributes: { email: order.email },
          },
        },
        properties: {
          order_id: order.shopify_id || order.order_number,
          order_number: order.order_number,
          value: parseFloat(order.total_price || 0),
          currency: 'GBP',
          financial_status: order.financial_status,
          fulfillment_status: order.fulfillment_status,
          source: 'flair_hq_sync',
        },
        value: parseFloat(order.total_price || 0),
        unique_id: `order_${order.shopify_id || order.order_number}`,
        time: order.created_at || new Date().toISOString(),
      },
    },
  })
}

// Get last sync timestamp from Supabase
async function getLastSync() {
  const { data } = await supabase
    .from('integrations')
    .select('*')
    .eq('id', 'klaviyo_sync')
    .single()
  return data
}

// Update last sync timestamp in Supabase
async function updateSyncStatus(stats) {
  const record = {
    id: 'klaviyo_sync',
    provider: 'klaviyo',
    access_token: JSON.stringify(stats),
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabase
    .from('integrations')
    .upsert(record, { onConflict: 'id' })

  if (error) console.error('Failed to update sync status:', error)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { mode = 'full' } = req.body || {}

  try {
    const lastSync = await getLastSync()
    const lastSyncTime = lastSync?.updated_at || null
    const lastStats = lastSync?.access_token ? JSON.parse(lastSync.access_token) : {}

    // Fetch orders from Supabase
    let orderQuery = supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })

    // For incremental sync, only get orders since last sync
    if (mode === 'incremental' && lastSyncTime) {
      orderQuery = orderQuery.gte('created_at', lastSyncTime)
    }

    const { data: orders, error: orderError } = await orderQuery
    if (orderError) throw new Error(`Failed to fetch orders: ${orderError.message}`)

    if (!orders || orders.length === 0) {
      const stats = {
        ...lastStats,
        last_sync: new Date().toISOString(),
        last_sync_mode: mode,
        last_sync_result: 'no_new_orders',
      }
      await updateSyncStatus(stats)
      return res.json({ message: 'No new orders to sync', synced: 0 })
    }

    // Deduplicate by email and aggregate customer data
    const customerMap = {}
    for (const order of orders) {
      if (!order.email) continue
      const email = order.email.toLowerCase().trim()
      if (!customerMap[email]) {
        customerMap[email] = {
          email,
          first_name: null,
          last_name: null,
          total_spent: 0,
          order_count: 0,
          last_order_date: order.created_at,
          orders: [],
        }
      }
      customerMap[email].total_spent += parseFloat(order.total_price || 0)
      customerMap[email].order_count += 1
      customerMap[email].orders.push(order)
    }

    const customers = Object.values(customerMap)
    const results = { profiles_synced: 0, events_tracked: 0, errors: [] }

    // Bulk import profiles (batches of 100)
    for (let i = 0; i < customers.length; i += 100) {
      const batch = customers.slice(i, i + 100)
      const importResult = await bulkImportProfiles(batch)

      if (importResult.status >= 200 && importResult.status < 300) {
        results.profiles_synced += batch.length
      } else {
        // Fallback to individual upserts
        for (const customer of batch) {
          const r = await upsertProfile(
            customer.email,
            customer.first_name,
            customer.last_name,
            {
              total_spent: customer.total_spent,
              order_count: customer.order_count,
              last_order_date: customer.last_order_date,
            }
          )
          if (r.status >= 200 && r.status < 300) {
            results.profiles_synced += 1
          } else {
            results.errors.push(`Profile ${customer.email}: ${r.status}`)
          }
        }
      }
    }

    // Track order events (with rate limiting - Klaviyo allows 75 req/sec)
    const ordersToTrack = mode === 'incremental'
      ? orders.filter(o => o.email)
      : orders.filter(o => o.email).slice(0, 500) // Cap full sync at 500 events

    for (const order of ordersToTrack) {
      const r = await trackOrderEvent(order)
      if (r.status >= 200 && r.status < 300) {
        results.events_tracked += 1
      } else if (r.status === 409) {
        // Duplicate event (already tracked) - not an error
        results.events_tracked += 1
      } else {
        results.errors.push(`Order ${order.order_number}: ${r.status}`)
      }

      // Small delay to respect rate limits
      if (ordersToTrack.indexOf(order) % 50 === 49) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    const stats = {
      last_sync: new Date().toISOString(),
      last_sync_mode: mode,
      last_sync_result: 'success',
      profiles_synced: (lastStats.profiles_synced || 0) + results.profiles_synced,
      events_tracked: (lastStats.events_tracked || 0) + results.events_tracked,
      total_customers: customers.length,
      last_batch_profiles: results.profiles_synced,
      last_batch_events: results.events_tracked,
      error_count: results.errors.length,
    }
    await updateSyncStatus(stats)

    res.json({
      message: 'Sync completed',
      ...results,
      total_orders: orders.length,
      unique_customers: customers.length,
    })
  } catch (e) {
    console.error('Klaviyo sync error:', e)
    res.status(500).json({ error: e.message || 'Sync failed' })
  }
}
