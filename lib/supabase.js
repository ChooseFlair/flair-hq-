import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://uvmnkztgmrvikbfkubtf.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2bW5renRnbXJ2aWtiZmt1YnRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2MzU3MDUsImV4cCI6MjA5MTIxMTcwNX0.GpIDJe_z_G_Bq15o_C_JGDZ6uBpKdK_EXMA04h8apq4'

export const supabase = createClient(supabaseUrl, supabaseKey)

// Helper functions for common queries
export async function getOrderStats() {
  const { data, error } = await supabase.rpc('get_order_stats')
  if (error) {
    // Fallback to manual query if RPC doesn't exist
    const { data: orders } = await supabase
      .from('orders')
      .select('total_price, created_at')

    if (!orders) return null

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const todayOrders = orders.filter(o => new Date(o.created_at) >= today)
    const weekOrders = orders.filter(o => new Date(o.created_at) >= thisWeek)
    const monthOrders = orders.filter(o => new Date(o.created_at) >= thisMonth)

    return {
      total_orders: orders.length,
      total_revenue: orders.reduce((sum, o) => sum + parseFloat(o.total_price || 0), 0),
      today_orders: todayOrders.length,
      today_revenue: todayOrders.reduce((sum, o) => sum + parseFloat(o.total_price || 0), 0),
      week_orders: weekOrders.length,
      week_revenue: weekOrders.reduce((sum, o) => sum + parseFloat(o.total_price || 0), 0),
      month_orders: monthOrders.length,
      month_revenue: monthOrders.reduce((sum, o) => sum + parseFloat(o.total_price || 0), 0),
      avg_order_value: orders.length > 0 ? orders.reduce((sum, o) => sum + parseFloat(o.total_price || 0), 0) / orders.length : 0
    }
  }
  return data
}

export async function getRecentOrders(limit = 10) {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data
}

export async function getAllOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function getProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('title')

  if (error) throw error
  return data
}

export async function getCompetitors() {
  const { data, error } = await supabase
    .from('competitors')
    .select('*')
    .order('name')

  if (error) throw error
  return data
}

export async function getDailyMetrics(days = 30) {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const { data, error } = await supabase
    .from('daily_metrics')
    .select('*')
    .gte('date', startDate.toISOString().split('T')[0])
    .order('date', { ascending: true })

  if (error) throw error
  return data
}

// Calculate daily revenue from orders for charts
export async function getDailyRevenue(days = 30) {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const { data: orders, error } = await supabase
    .from('orders')
    .select('total_price, created_at')
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: true })

  if (error) throw error

  // Group by date
  const dailyData = {}
  orders?.forEach(order => {
    const date = order.created_at.split('T')[0]
    if (!dailyData[date]) {
      dailyData[date] = { date, revenue: 0, orders: 0 }
    }
    dailyData[date].revenue += parseFloat(order.total_price || 0)
    dailyData[date].orders += 1
  })

  return Object.values(dailyData)
}
