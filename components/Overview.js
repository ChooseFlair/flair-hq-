import { useState, useEffect } from 'react'
import { supabase, getOrderStats, getRecentOrders, getDailyRevenue } from '../lib/supabase'
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { format, parseISO } from 'date-fns'
import {
  DollarSign,
  Calendar,
  TrendingUp,
  Target,
  Package,
  ArrowUpRight,
  Sparkles,
  Leaf,
  ShoppingBag,
  Users,
} from 'lucide-react'
import TaskWidget from './TaskWidget'

function StatCard({ title, value, subValue, trend, icon: Icon, color = 'flair' }) {
  const colorClasses = {
    flair: 'bg-flair-50 text-flair-600',
    sage: 'bg-sage-50 text-sage-600',
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
  }

  const valueColors = {
    flair: 'text-flair-700',
    sage: 'text-sage-700',
    blue: 'text-blue-600',
    purple: 'text-purple-600',
    orange: 'text-orange-600',
  }

  return (
    <div className="bg-white/60 backdrop-blur-xl border border-white/50 rounded-2xl p-6 hover:bg-white/80 hover:shadow-lg transition-all duration-300 group">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-flair-500 font-medium">{title}</p>
          <p className={`text-2xl font-bold mt-1 ${valueColors[color]}`}>{value}</p>
          {subValue && <p className="text-sm text-flair-400 mt-1">{subValue}</p>}
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClasses[color]} group-hover:scale-110 transition-transform duration-300`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      {trend !== undefined && (
        <div className={`mt-4 text-sm font-medium flex items-center gap-1 ${trend >= 0 ? 'text-sage-600' : 'text-red-500'}`}>
          <ArrowUpRight className={`w-4 h-4 ${trend < 0 ? 'rotate-90' : ''}`} />
          {Math.abs(trend).toFixed(1)}% vs last period
        </div>
      )}
    </div>
  )
}

const CustomTooltip = ({ active, payload, label, formatter }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/90 backdrop-blur-sm border border-flair-100 rounded-xl shadow-lg p-3">
        <p className="text-sm font-medium text-flair-600">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm text-flair-700" style={{ color: entry.color }}>
            {entry.name}: {formatter ? formatter(entry.value) : entry.value}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export default function Overview() {
  const [stats, setStats] = useState(null)
  const [recentOrders, setRecentOrders] = useState([])
  const [chartData, setChartData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const [statsData, ordersData, dailyData] = await Promise.all([
          getOrderStats(),
          getRecentOrders(5),
          getDailyRevenue(30)
        ])

        setStats(statsData)
        setRecentOrders(ordersData || [])
        setChartData(dailyData || [])
      } catch (err) {
        console.error('Error loading overview:', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()

    const channel = supabase
      .channel('orders-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, () => {
        loadData()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 gradient-flair rounded-xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Leaf className="w-6 h-6 text-white" />
          </div>
          <p className="text-flair-500">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  const formatCurrency = (value) => `£${parseFloat(value || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-flair-700">Dashboard Overview</h1>
          <p className="text-flair-500 mt-1">Welcome back! Here's what's happening with Flair.</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-flair-50 rounded-xl">
          <div className="w-2 h-2 bg-sage-400 rounded-full animate-pulse"></div>
          <span className="text-sm text-flair-600 font-medium">Live data</span>
        </div>
      </div>

      {/* Urgent Tasks */}
      <TaskWidget filterTag="urgent" title="Urgent Tasks" />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Revenue"
          value={formatCurrency(stats?.total_revenue)}
          subValue={`${stats?.total_orders || 0} orders`}
          icon={DollarSign}
          color="flair"
        />
        <StatCard
          title="This Month"
          value={formatCurrency(stats?.month_revenue)}
          subValue={`${stats?.month_orders || 0} orders`}
          icon={Calendar}
          color="blue"
        />
        <StatCard
          title="This Week"
          value={formatCurrency(stats?.week_revenue)}
          subValue={`${stats?.week_orders || 0} orders`}
          icon={TrendingUp}
          color="purple"
        />
        <StatCard
          title="Avg Order Value"
          value={formatCurrency(stats?.avg_order_value)}
          subValue="per order"
          icon={Target}
          color="sage"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="bg-white/60 backdrop-blur-xl border border-white/50 rounded-2xl p-6 hover:bg-white/80 transition-all duration-300">
          <h3 className="text-lg font-semibold text-flair-700 mb-4">Revenue (Last 30 Days)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="rgb(44, 74, 62)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="rgb(44, 74, 62)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(44, 74, 62, 0.1)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#567862' }}
                  tickFormatter={(date) => format(parseISO(date), 'MMM d')}
                  axisLine={{ stroke: 'rgba(44, 74, 62, 0.2)' }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#567862' }}
                  tickFormatter={(value) => `£${value}`}
                  axisLine={{ stroke: 'rgba(44, 74, 62, 0.2)' }}
                />
                <Tooltip
                  content={<CustomTooltip formatter={formatCurrency} />}
                  labelFormatter={(date) => format(parseISO(date), 'MMM d, yyyy')}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="rgb(44, 74, 62)"
                  strokeWidth={2}
                  fill="url(#revenueGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Orders Chart */}
        <div className="bg-white/60 backdrop-blur-xl border border-white/50 rounded-2xl p-6 hover:bg-white/80 transition-all duration-300">
          <h3 className="text-lg font-semibold text-flair-700 mb-4">Orders (Last 30 Days)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(44, 74, 62, 0.1)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#567862' }}
                  tickFormatter={(date) => format(parseISO(date), 'MMM d')}
                  axisLine={{ stroke: 'rgba(44, 74, 62, 0.2)' }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#567862' }}
                  axisLine={{ stroke: 'rgba(44, 74, 62, 0.2)' }}
                />
                <Tooltip
                  content={<CustomTooltip />}
                  labelFormatter={(date) => format(parseISO(date), 'MMM d, yyyy')}
                />
                <Bar dataKey="orders" fill="rgb(143, 175, 143)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white/60 backdrop-blur-xl border border-white/50 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-flair-100/50 flex items-center justify-between bg-white/30">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-flair-600" />
            <h3 className="text-lg font-semibold text-flair-700">Recent Orders</h3>
          </div>
          <span className="text-sm text-flair-400 px-3 py-1 bg-flair-50 rounded-full">Last 5</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-flair-50/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-flair-600 uppercase tracking-wider">Order</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-flair-600 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-flair-600 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-flair-600 uppercase tracking-wider">Total</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-flair-600 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-flair-100/50">
              {recentOrders.map((order) => (
                <tr key={order.shopify_id} className="hover:bg-flair-50/30 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-flair-700">
                    #{order.order_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-flair-500">
                    {order.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-lg backdrop-blur-sm ${
                      order.financial_status === 'paid'
                        ? 'bg-sage-100/80 text-sage-700 border border-sage-200/50'
                        : order.financial_status === 'pending'
                        ? 'bg-yellow-100/80 text-yellow-700 border border-yellow-200/50'
                        : 'bg-flair-100/80 text-flair-700 border border-flair-200/50'
                    }`}>
                      {order.financial_status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-flair-700">
                    {formatCurrency(order.total_price)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-flair-400">
                    {order.created_at ? format(parseISO(order.created_at), 'MMM d, yyyy h:mm a') : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="gradient-flair rounded-2xl p-6 text-white shadow-lg shadow-flair-700/20">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-5 h-5 text-white/80" />
            <h4 className="font-medium text-white/80">Top Insight</h4>
          </div>
          <p className="text-lg font-semibold">Your AOV is {formatCurrency(stats?.avg_order_value)}</p>
          <p className="text-sm text-white/70 mt-2">Focus on bundles to increase this.</p>
        </div>
        <div className="bg-gradient-to-br from-sage-400 to-sage-500 rounded-2xl p-6 text-white shadow-lg shadow-sage-400/20">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-white/80" />
            <h4 className="font-medium text-white/80">Quick Action</h4>
          </div>
          <p className="text-lg font-semibold">Check AI Researcher</p>
          <p className="text-sm text-white/70 mt-2">Get competitive insights for Q2.</p>
        </div>
        <div className="bg-gradient-to-br from-cream-400 to-cream-500 rounded-2xl p-6 text-white shadow-lg shadow-cream-400/20">
          <div className="flex items-center gap-2 mb-3">
            <ShoppingBag className="w-5 h-5 text-white/80" />
            <h4 className="font-medium text-white/80">Products</h4>
          </div>
          <p className="text-lg font-semibold">Track your bestsellers</p>
          <p className="text-sm text-white/70 mt-2">See sell-through rates & COGS.</p>
        </div>
      </div>
    </div>
  )
}
