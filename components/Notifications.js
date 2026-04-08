import { useState, useEffect } from 'react'
import { supabase, getOrderStats, getAllOrders } from '../lib/supabase'
import { format, parseISO, subDays, differenceInDays } from 'date-fns'

// Stock data - would come from Shopify inventory API in production
const stockLevels = [
  { sku: 'FLAIR-WNT-IN', name: 'Walnut Inhaler', stock: 45, reorderPoint: 20, status: 'ok' },
  { sku: 'FLAIR-OAK-IN', name: 'Oak Inhaler', stock: 38, reorderPoint: 20, status: 'ok' },
  { sku: 'FLAIR-SM-3PK', name: 'Spearmint 3-Pack', stock: 124, reorderPoint: 50, status: 'ok' },
  { sku: 'FLAIR-CM-3PK', name: 'Crisp Mint 3-Pack', stock: 89, reorderPoint: 50, status: 'ok' },
  { sku: 'FLAIR-RA-3PK', name: 'Raspberry 3-Pack', stock: 67, reorderPoint: 50, status: 'ok' },
  { sku: 'FLAIR-BL-3PK', name: 'Blueberry 3-Pack', stock: 42, reorderPoint: 50, status: 'warning' },
  { sku: 'FLAIR-CO-3PK', name: 'Coffee 3-Pack', stock: 78, reorderPoint: 50, status: 'ok' },
  { sku: 'FLAIR-MA-3PK', name: 'Mango 3-Pack', stock: 23, reorderPoint: 50, status: 'low' },
  { sku: 'FLAIR-ST-3PK', name: 'Strawberry 3-Pack', stock: 56, reorderPoint: 50, status: 'ok' },
  { sku: 'FLAIR-RB-3PK', name: '3 Rubber Tips', stock: 156, reorderPoint: 40, status: 'ok' },
  { sku: 'PKG-POLY', name: 'Poly Mailers', stock: 230, reorderPoint: 100, status: 'ok' },
  { sku: 'PKG-KRAFT', name: 'Kraft Mailers', stock: 85, reorderPoint: 100, status: 'warning' },
]

export default function Notifications() {
  const [stats, setStats] = useState(null)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [priorities, setPriorities] = useState([])
  const [insights, setInsights] = useState([])

  useEffect(() => {
    async function loadData() {
      try {
        const [statsData, ordersData] = await Promise.all([
          getOrderStats(),
          getAllOrders()
        ])

        setStats(statsData)
        setOrders(ordersData || [])

        // Generate AI priorities and insights
        generatePriorities(statsData, ordersData || [])
        generateInsights(statsData, ordersData || [])
      } catch (err) {
        console.error('Error loading data:', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const generatePriorities = (stats, orders) => {
    const priorities = []
    const now = new Date()

    // Check stock levels
    const lowStock = stockLevels.filter(s => s.status === 'low')
    const warningStock = stockLevels.filter(s => s.status === 'warning')

    if (lowStock.length > 0) {
      priorities.push({
        id: 1,
        type: 'urgent',
        title: 'Low Stock Alert',
        description: `${lowStock.map(s => s.name).join(', ')} ${lowStock.length === 1 ? 'is' : 'are'} running low. Reorder immediately.`,
        action: 'Reorder Now',
        icon: '🚨'
      })
    }

    if (warningStock.length > 0) {
      priorities.push({
        id: 2,
        type: 'warning',
        title: 'Stock Warning',
        description: `${warningStock.map(s => s.name).join(', ')} approaching reorder point.`,
        action: 'Review Stock',
        icon: '⚠️'
      })
    }

    // Check recent performance
    if (stats) {
      const avgDaily = stats.month_revenue / 30
      const todayRevenue = stats.today_revenue || 0

      if (todayRevenue > avgDaily * 1.5) {
        priorities.push({
          id: 3,
          type: 'success',
          title: 'Strong Sales Day',
          description: `Today's revenue is ${((todayRevenue / avgDaily - 1) * 100).toFixed(0)}% above your daily average.`,
          action: 'View Orders',
          icon: '🎉'
        })
      }

      // AOV check
      if (stats.avg_order_value < 50) {
        priorities.push({
          id: 4,
          type: 'info',
          title: 'AOV Below Target',
          description: `Current AOV is £${stats.avg_order_value.toFixed(2)} vs £50 target. Consider bundle promotions.`,
          action: 'Review Pricing',
          icon: '💡'
        })
      }
    }

    // Unfulfilled orders check
    const unfulfilled = orders.filter(o => !o.fulfillment_status || o.fulfillment_status === 'unfulfilled')
    if (unfulfilled.length > 0) {
      priorities.push({
        id: 5,
        type: 'warning',
        title: 'Pending Fulfillment',
        description: `${unfulfilled.length} order${unfulfilled.length > 1 ? 's' : ''} waiting to be fulfilled.`,
        action: 'Fulfill Orders',
        icon: '📦'
      })
    }

    // Tax deadline reminder (Companies House)
    const taxDate = new Date('2026-05-13')
    const daysUntilTax = differenceInDays(taxDate, now)
    if (daysUntilTax > 0 && daysUntilTax <= 45) {
      priorities.push({
        id: 6,
        type: 'info',
        title: 'Companies House Deadline',
        description: `Confirmation statement due in ${daysUntilTax} days (May 13, 2026).`,
        action: 'Set Reminder',
        icon: '📋'
      })
    }

    setPriorities(priorities)
  }

  const generateInsights = (stats, orders) => {
    const insights = []

    if (stats && orders.length > 0) {
      // Revenue trend
      insights.push({
        id: 1,
        category: 'Revenue',
        title: 'Monthly Performance',
        content: `This month you've generated £${stats.month_revenue?.toLocaleString('en-GB', { minimumFractionDigits: 2 }) || '0.00'} from ${stats.month_orders || 0} orders. Your average order value is £${stats.avg_order_value?.toFixed(2) || '0.00'}.`,
        recommendation: stats.avg_order_value < 50
          ? 'Focus on bundle offers to increase AOV toward your £50 target.'
          : 'Great AOV! Consider upselling accessories at checkout.'
      })

      // Repeat purchase insight
      insights.push({
        id: 2,
        category: 'Retention',
        title: 'Customer Loyalty',
        content: `Your repeat purchase rate is estimated at 13-15%. This is typical for DTC brands but has room for improvement.`,
        recommendation: 'Launch a post-purchase refill reminder flow in Klaviyo. Aim for 20%+ repeat rate.'
      })

      // Best performing day
      const ordersByDay = {}
      orders.forEach(o => {
        const day = new Date(o.created_at).toLocaleDateString('en-GB', { weekday: 'long' })
        ordersByDay[day] = (ordersByDay[day] || 0) + 1
      })
      const bestDay = Object.entries(ordersByDay).sort((a, b) => b[1] - a[1])[0]

      if (bestDay) {
        insights.push({
          id: 3,
          category: 'Timing',
          title: 'Peak Sales Day',
          content: `${bestDay[0]} is your strongest day with ${bestDay[1]} orders historically.`,
          recommendation: 'Schedule email campaigns and Meta ads to peak on this day.'
        })
      }

      // Marketing insight
      insights.push({
        id: 4,
        category: 'Marketing',
        title: 'Channel Strategy',
        content: `Meta Ads (Pixel ID: 500331839710867) should be your primary acquisition channel for a visual product like inhalers.`,
        recommendation: 'Focus budget on video creatives showcasing the product experience. Target wellness and ex-smoker audiences.'
      })
    }

    setInsights(insights)
  }

  const formatCurrency = (value) => `£${parseFloat(value || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Notifications & Priorities</h1>
        <p className="text-gray-500 mt-1">AI-powered insights and action items for your business.</p>
      </div>

      {/* Priority Actions */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <span>🎯</span> Priority Actions
        </h2>
        {priorities.length === 0 ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
            <span className="text-2xl">✅</span>
            <p className="text-green-800 font-medium mt-2">All clear! No urgent actions needed.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {priorities.map(priority => (
              <div
                key={priority.id}
                className={`rounded-xl p-4 border ${
                  priority.type === 'urgent' ? 'bg-red-50 border-red-200' :
                  priority.type === 'warning' ? 'bg-yellow-50 border-yellow-200' :
                  priority.type === 'success' ? 'bg-green-50 border-green-200' :
                  'bg-blue-50 border-blue-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{priority.icon}</span>
                  <div className="flex-1">
                    <h3 className={`font-semibold ${
                      priority.type === 'urgent' ? 'text-red-800' :
                      priority.type === 'warning' ? 'text-yellow-800' :
                      priority.type === 'success' ? 'text-green-800' :
                      'text-blue-800'
                    }`}>
                      {priority.title}
                    </h3>
                    <p className={`text-sm mt-1 ${
                      priority.type === 'urgent' ? 'text-red-700' :
                      priority.type === 'warning' ? 'text-yellow-700' :
                      priority.type === 'success' ? 'text-green-700' :
                      'text-blue-700'
                    }`}>
                      {priority.description}
                    </p>
                  </div>
                  <button className={`px-3 py-1 text-sm font-medium rounded-lg ${
                    priority.type === 'urgent' ? 'bg-red-600 text-white hover:bg-red-700' :
                    priority.type === 'warning' ? 'bg-yellow-600 text-white hover:bg-yellow-700' :
                    priority.type === 'success' ? 'bg-green-600 text-white hover:bg-green-700' :
                    'bg-blue-600 text-white hover:bg-blue-700'
                  }`}>
                    {priority.action}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stock Levels */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <span>📦</span> Stock Levels
          </h2>
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500"></span> OK
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-yellow-500"></span> Warning
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500"></span> Low
            </span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reorder At</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {stockLevels.map(item => (
                <tr key={item.sku} className={`hover:bg-gray-50 ${
                  item.status === 'low' ? 'bg-red-50' :
                  item.status === 'warning' ? 'bg-yellow-50' : ''
                }`}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                    {item.sku}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            item.status === 'low' ? 'bg-red-500' :
                            item.status === 'warning' ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(100, (item.stock / (item.reorderPoint * 3)) * 100)}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{item.stock}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.reorderPoint}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      item.status === 'low' ? 'bg-red-100 text-red-800' :
                      item.status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {item.status === 'low' ? 'Reorder Now' :
                       item.status === 'warning' ? 'Running Low' : 'In Stock'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI Insights */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <span>🤖</span> AI Business Insights
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {insights.map(insight => (
            <div key={insight.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                  {insight.category}
                </span>
              </div>
              <h3 className="font-semibold text-gray-900">{insight.title}</h3>
              <p className="text-sm text-gray-600 mt-2">{insight.content}</p>
              <div className="mt-3 p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-green-800">
                  <strong>Recommendation:</strong> {insight.recommendation}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Summary Card */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl p-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
            <span className="text-xl">📊</span>
          </div>
          <h3 className="text-lg font-semibold">Daily Summary</h3>
        </div>
        <p className="text-gray-300 leading-relaxed">
          {stats ? (
            <>
              Today: {formatCurrency(stats.today_revenue)} from {stats.today_orders || 0} orders.
              This month: {formatCurrency(stats.month_revenue)} ({stats.month_orders || 0} orders).
              {stockLevels.filter(s => s.status !== 'ok').length > 0
                ? ` Watch stock levels for ${stockLevels.filter(s => s.status !== 'ok').map(s => s.name).join(', ')}.`
                : ' All stock levels healthy.'}
            </>
          ) : (
            'Loading business summary...'
          )}
        </p>
      </div>
    </div>
  )
}
