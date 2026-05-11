import { supabase } from '../../../lib/supabase'

export const config = { maxDuration: 60 }

const API_VERSION = '2024-10'

function parseLink(header) {
  if (!header) return null
  const match = header.match(/<([^>]+)>;\s*rel="next"/)
  return match ? match[1] : null
}

async function fetchShopify(url, token) {
  const res = await fetch(url, {
    headers: {
      'X-Shopify-Access-Token': token,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Shopify API ${res.status}: ${text.substring(0, 200)}`)
  }
  return { data: await res.json(), nextUrl: parseLink(res.headers.get('link')) }
}

function mapOrder(o) {
  return {
    id: String(o.id),
    order_number: o.order_number || o.name,
    email: o.email,
    total_price: parseFloat(o.total_price || 0),
    subtotal_price: parseFloat(o.subtotal_price || 0),
    total_shipping: parseFloat(o.total_shipping_price_set?.shop_money?.amount || 0),
    total_discount: parseFloat(o.total_discounts || 0),
    financial_status: o.financial_status,
    fulfillment_status: o.fulfillment_status,
    created_at: o.created_at,
    updated_at: o.updated_at,
  }
}

function mapCustomer(c) {
  return {
    id: String(c.id),
    email: c.email,
    first_name: c.first_name,
    last_name: c.last_name,
    orders_count: c.orders_count || 0,
    total_spent: parseFloat(c.total_spent || 0),
    created_at: c.created_at,
    updated_at: c.updated_at,
  }
}

export default async function handler(req, res) {
  const shop = process.env.SHOPIFY_SHOP_DOMAIN
  const token = process.env.SHOPIFY_ADMIN_TOKEN

  if (!shop || !token) {
    return res.status(200).json({
      name: 'Shopify',
      status: 'not_configured',
      message: 'Set SHOPIFY_SHOP_DOMAIN and SHOPIFY_ADMIN_TOKEN in Vercel env vars',
    })
  }

  const since = new Date(Date.now() - 90 * 86400000).toISOString()
  let orderCount = 0
  let customerCount = 0
  const errors = []

  try {
    let url = `https://${shop}/admin/api/${API_VERSION}/orders.json?status=any&limit=250&updated_at_min=${encodeURIComponent(since)}`
    let pages = 0
    while (url && pages < 8) {
      const { data, nextUrl } = await fetchShopify(url, token)
      if (data.orders?.length) {
        const rows = data.orders.map(mapOrder)
        const { error } = await supabase.from('orders').upsert(rows, { onConflict: 'id' })
        if (error) errors.push(`orders: ${error.message}`)
        else orderCount += rows.length
      }
      url = nextUrl
      pages++
    }
  } catch (e) {
    errors.push(`orders: ${e.message}`)
  }

  try {
    let url = `https://${shop}/admin/api/${API_VERSION}/customers.json?limit=250&updated_at_min=${encodeURIComponent(since)}`
    let pages = 0
    while (url && pages < 4) {
      const { data, nextUrl } = await fetchShopify(url, token)
      if (data.customers?.length) {
        const rows = data.customers.map(mapCustomer)
        const { error } = await supabase.from('customers').upsert(rows, { onConflict: 'id' })
        if (error) errors.push(`customers: ${error.message}`)
        else customerCount += rows.length
      }
      url = nextUrl
      pages++
    }
  } catch (e) {
    errors.push(`customers: ${e.message}`)
  }

  try {
    await supabase.from('integrations').upsert({
      id: 'shopify_sync',
      last_sync: new Date().toISOString(),
      meta: { orders: orderCount, customers: customerCount, errors },
    })
  } catch {}

  const ok = errors.length === 0
  res.status(200).json({
    name: 'Shopify',
    status: ok ? 'ok' : 'partial',
    orders: orderCount,
    customers: customerCount,
    errors,
  })
}
