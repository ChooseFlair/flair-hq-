// Product Analytics API - fetches sales data for products
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://uvmnkztgmrvikbfkubtf.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2bW5renRnbXJ2aWtiZmt1YnRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2MzU3MDUsImV4cCI6MjA5MTIxMTcwNX0.GpIDJe_z_G_Bq15o_C_JGDZ6uBpKdK_EXMA04h8apq4'
)

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Try to fetch order line items if available
    const { data: lineItems, error: lineError } = await supabase
      .from('order_line_items')
      .select('*')
      .order('created_at', { ascending: false })

    // Also fetch orders for totals
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })

    if (lineError && ordersError) {
      // Return mock data if tables don't exist
      return res.status(200).json({
        products: getMockProductAnalytics(),
        source: 'mock'
      })
    }

    // If we have line items, aggregate by product
    if (lineItems && lineItems.length > 0) {
      const productMap = {}

      lineItems.forEach(item => {
        const key = item.product_id || item.sku || item.title
        if (!productMap[key]) {
          productMap[key] = {
            id: key,
            name: item.title || item.name || key,
            sku: item.sku || '',
            unitsSold: 0,
            revenue: 0,
            orders: new Set(),
            firstSale: item.created_at,
            lastSale: item.created_at,
          }
        }
        productMap[key].unitsSold += parseInt(item.quantity || 1)
        productMap[key].revenue += parseFloat(item.price || 0) * parseInt(item.quantity || 1)
        productMap[key].orders.add(item.order_id)
        if (item.created_at < productMap[key].firstSale) {
          productMap[key].firstSale = item.created_at
        }
        if (item.created_at > productMap[key].lastSale) {
          productMap[key].lastSale = item.created_at
        }
      })

      const products = Object.values(productMap).map(p => ({
        ...p,
        orderCount: p.orders.size,
        avgPrice: p.unitsSold > 0 ? p.revenue / p.unitsSold : 0,
      }))

      products.sort((a, b) => b.revenue - a.revenue)

      return res.status(200).json({
        products,
        totalOrders: orders?.length || 0,
        source: 'database'
      })
    }

    // If no line items, try to parse from orders (some stores embed line items in orders)
    if (orders && orders.length > 0) {
      // Check if orders have line_items field
      const productMap = {}

      orders.forEach(order => {
        let items = []

        // Try different field names for line items
        if (order.line_items) {
          items = typeof order.line_items === 'string'
            ? JSON.parse(order.line_items)
            : order.line_items
        } else if (order.items) {
          items = typeof order.items === 'string'
            ? JSON.parse(order.items)
            : order.items
        }

        if (Array.isArray(items)) {
          items.forEach(item => {
            const key = item.product_id || item.sku || item.title || item.name
            if (!key) return

            if (!productMap[key]) {
              productMap[key] = {
                id: key,
                name: item.title || item.name || key,
                sku: item.sku || '',
                unitsSold: 0,
                revenue: 0,
                orderCount: 0,
                firstSale: order.created_at,
                lastSale: order.created_at,
              }
            }
            productMap[key].unitsSold += parseInt(item.quantity || 1)
            productMap[key].revenue += parseFloat(item.price || 0) * parseInt(item.quantity || 1)
            productMap[key].orderCount++
            if (order.created_at < productMap[key].firstSale) {
              productMap[key].firstSale = order.created_at
            }
            if (order.created_at > productMap[key].lastSale) {
              productMap[key].lastSale = order.created_at
            }
          })
        }
      })

      const products = Object.values(productMap)
      products.sort((a, b) => b.revenue - a.revenue)

      if (products.length > 0) {
        return res.status(200).json({
          products,
          totalOrders: orders.length,
          source: 'orders'
        })
      }
    }

    // Return mock data as fallback
    return res.status(200).json({
      products: getMockProductAnalytics(),
      totalOrders: orders?.length || 0,
      source: 'mock'
    })

  } catch (err) {
    console.error('Product analytics error:', err)
    return res.status(200).json({
      products: getMockProductAnalytics(),
      source: 'mock',
      error: err.message
    })
  }
}

function getMockProductAnalytics() {
  // Return realistic mock data based on Flair's product lineup
  return [
    {
      id: 'FLAIR-WNT-IN',
      name: 'Walnut Inhaler',
      sku: 'FLAIR-WNT-IN',
      unitsSold: 45,
      revenue: 1349.55,
      orderCount: 42,
      avgPrice: 29.99,
      category: 'Inhalers',
    },
    {
      id: 'FLAIR-OAK-IN',
      name: 'Oak Inhaler',
      sku: 'FLAIR-OAK-IN',
      unitsSold: 38,
      revenue: 1139.62,
      orderCount: 35,
      avgPrice: 29.99,
      category: 'Inhalers',
    },
    {
      id: 'FLAIR-SM-3PK',
      name: 'Spearmint 3-Pack',
      sku: 'FLAIR-SM-3PK',
      unitsSold: 72,
      revenue: 359.28,
      orderCount: 68,
      avgPrice: 4.99,
      category: 'Refills',
    },
    {
      id: 'FLAIR-CM-3PK',
      name: 'Crisp Mint 3-Pack',
      sku: 'FLAIR-CM-3PK',
      unitsSold: 65,
      revenue: 324.35,
      orderCount: 60,
      avgPrice: 4.99,
      category: 'Refills',
    },
    {
      id: 'FLAIR-RA-3PK',
      name: 'Raspberry 3-Pack',
      sku: 'FLAIR-RA-3PK',
      unitsSold: 48,
      revenue: 239.52,
      orderCount: 45,
      avgPrice: 4.99,
      category: 'Refills',
    },
    {
      id: 'FLAIR-BL-3PK',
      name: 'Blueberry 3-Pack',
      sku: 'FLAIR-BL-3PK',
      unitsSold: 42,
      revenue: 209.58,
      orderCount: 40,
      avgPrice: 4.99,
      category: 'Refills',
    },
    {
      id: 'FLAIR-MA-3PK',
      name: 'Mango 3-Pack',
      sku: 'FLAIR-MA-3PK',
      unitsSold: 35,
      revenue: 174.65,
      orderCount: 32,
      avgPrice: 4.99,
      category: 'Refills',
    },
    {
      id: 'FLAIR-CO-3PK',
      name: 'Coffee 3-Pack',
      sku: 'FLAIR-CO-3PK',
      unitsSold: 28,
      revenue: 139.72,
      orderCount: 25,
      avgPrice: 4.99,
      category: 'Refills',
    },
    {
      id: 'FLAIR-ST-3PK',
      name: 'Strawberry 3-Pack',
      sku: 'FLAIR-ST-3PK',
      unitsSold: 32,
      revenue: 159.68,
      orderCount: 30,
      avgPrice: 4.99,
      category: 'Refills',
    },
    {
      id: 'FLAIR-RB-3PK',
      name: '3 Rubber Tips',
      sku: 'FLAIR-RB-3PK',
      unitsSold: 22,
      revenue: 109.78,
      orderCount: 20,
      avgPrice: 4.99,
      category: 'Accessories',
    },
  ]
}
