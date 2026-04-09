import { useState, useEffect, useMemo } from 'react'
import { getAllOrders } from '../lib/supabase'
import { format, parseISO, subDays, eachDayOfInterval, startOfDay, isWithinInterval, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import {
  Package,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Users,
  RefreshCw,
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  Truck,
  MapPin,
  BarChart3,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import DateRangePicker from './DateRangePicker'
import TaskWidget from './TaskWidget'

export default function Orders({ activeSubTab, setActiveSubTab }) {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [fulfillmentFilter, setFulfillmentFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)

  // Use sidebar navigation if available, otherwise fallback to internal state
  const activeTab = activeSubTab || 'analytics'
  const setActiveTab = setActiveSubTab || (() => {})
  const ordersPerPage = 20

  // Date range state
  const [dateRange, setDateRange] = useState({
    startDate: subDays(new Date(), 30),
    endDate: new Date(),
    preset: '30d',
  })

  useEffect(() => {
    loadOrders()
  }, [])

  const loadOrders = async () => {
    setLoading(true)
    try {
      const data = await getAllOrders()
      setOrders(data || [])
    } catch (err) {
      console.error('Error loading orders:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value) => `£${parseFloat(value || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  // Filter orders by date range
  const dateFilteredOrders = useMemo(() => {
    return orders.filter(order => {
      if (!order.created_at) return false
      const orderDate = parseISO(order.created_at)
      return isWithinInterval(orderDate, {
        start: startOfDay(dateRange.startDate),
        end: new Date(dateRange.endDate.setHours(23, 59, 59, 999))
      })
    })
  }, [orders, dateRange])

  // Filter orders by search and status
  const filteredOrders = useMemo(() => {
    return dateFilteredOrders.filter(order => {
      const matchesSearch = search === '' ||
        order.order_number?.toString().includes(search) ||
        order.email?.toLowerCase().includes(search.toLowerCase())

      const matchesStatus = statusFilter === 'all' || order.financial_status === statusFilter
      const matchesFulfillment = fulfillmentFilter === 'all' ||
        (fulfillmentFilter === 'unfulfilled' ? !order.fulfillment_status : order.fulfillment_status === fulfillmentFilter)

      return matchesSearch && matchesStatus && matchesFulfillment
    })
  }, [dateFilteredOrders, search, statusFilter, fulfillmentFilter])

  // Pagination
  const totalPages = Math.ceil(filteredOrders.length / ordersPerPage)
  const startIndex = (currentPage - 1) * ordersPerPage
  const paginatedOrders = filteredOrders.slice(startIndex, startIndex + ordersPerPage)

  // Analytics calculations
  const analytics = useMemo(() => {
    const total = dateFilteredOrders.length
    const revenue = dateFilteredOrders.reduce((sum, o) => sum + parseFloat(o.total_price || 0), 0)
    const paid = dateFilteredOrders.filter(o => o.financial_status === 'paid').length
    const pending = dateFilteredOrders.filter(o => o.financial_status === 'pending').length
    const refunded = dateFilteredOrders.filter(o => o.financial_status === 'refunded').length
    const fulfilled = dateFilteredOrders.filter(o => o.fulfillment_status === 'fulfilled').length
    const unfulfilled = dateFilteredOrders.filter(o => !o.fulfillment_status).length
    const partial = dateFilteredOrders.filter(o => o.fulfillment_status === 'partial').length

    const aov = total > 0 ? revenue / total : 0
    const refundRate = total > 0 ? (refunded / total) * 100 : 0
    const fulfillmentRate = total > 0 ? (fulfilled / total) * 100 : 0

    // Compare with previous period
    const periodLength = Math.ceil((dateRange.endDate - dateRange.startDate) / (1000 * 60 * 60 * 24))
    const prevStart = subDays(dateRange.startDate, periodLength)
    const prevEnd = subDays(dateRange.startDate, 1)

    const prevOrders = orders.filter(order => {
      if (!order.created_at) return false
      const orderDate = parseISO(order.created_at)
      return isWithinInterval(orderDate, { start: prevStart, end: prevEnd })
    })

    const prevRevenue = prevOrders.reduce((sum, o) => sum + parseFloat(o.total_price || 0), 0)
    const prevTotal = prevOrders.length
    const revenueChange = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0
    const ordersChange = prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : 0

    return {
      total, revenue, paid, pending, refunded, fulfilled, unfulfilled, partial,
      aov, refundRate, fulfillmentRate, revenueChange, ordersChange, prevRevenue, prevTotal
    }
  }, [dateFilteredOrders, orders, dateRange])

  // Daily revenue chart data
  const dailyData = useMemo(() => {
    const days = eachDayOfInterval({
      start: dateRange.startDate,
      end: dateRange.endDate
    })

    return days.map(day => {
      const dayStart = startOfDay(day)
      const dayOrders = dateFilteredOrders.filter(order => {
        if (!order.created_at) return false
        const orderDate = parseISO(order.created_at)
        return format(orderDate, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
      })

      const revenue = dayOrders.reduce((sum, o) => sum + parseFloat(o.total_price || 0), 0)
      const orderCount = dayOrders.length
      const aov = orderCount > 0 ? revenue / orderCount : 0

      return {
        date: format(day, 'MMM d'),
        fullDate: format(day, 'yyyy-MM-dd'),
        revenue,
        orders: orderCount,
        aov
      }
    })
  }, [dateFilteredOrders, dateRange])

  // Order status distribution
  const statusData = useMemo(() => {
    return [
      { name: 'Paid', value: analytics.paid, color: '#10B981' },
      { name: 'Pending', value: analytics.pending, color: '#F59E0B' },
      { name: 'Refunded', value: analytics.refunded, color: '#EF4444' },
    ].filter(d => d.value > 0)
  }, [analytics])

  // Fulfillment status distribution
  const fulfillmentData = useMemo(() => {
    return [
      { name: 'Fulfilled', value: analytics.fulfilled, color: '#3B82F6' },
      { name: 'Unfulfilled', value: analytics.unfulfilled, color: '#6B7280' },
      { name: 'Partial', value: analytics.partial, color: '#F97316' },
    ].filter(d => d.value > 0)
  }, [analytics])

  // Top customers
  const topCustomers = useMemo(() => {
    const customerMap = {}
    dateFilteredOrders.forEach(order => {
      const email = order.email || 'Unknown'
      if (!customerMap[email]) {
        customerMap[email] = { email, orders: 0, revenue: 0 }
      }
      customerMap[email].orders++
      customerMap[email].revenue += parseFloat(order.total_price || 0)
    })
    return Object.values(customerMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
  }, [dateFilteredOrders])

  // Hourly distribution
  const hourlyData = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({ hour: i, orders: 0, revenue: 0 }))
    dateFilteredOrders.forEach(order => {
      if (order.created_at) {
        const hour = parseISO(order.created_at).getHours()
        hours[hour].orders++
        hours[hour].revenue += parseFloat(order.total_price || 0)
      }
    })
    return hours.map(h => ({
      ...h,
      label: `${h.hour.toString().padStart(2, '0')}:00`
    }))
  }, [dateFilteredOrders])

  // Day of week distribution
  const dayOfWeekData = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => ({ day: d, orders: 0, revenue: 0 }))
    dateFilteredOrders.forEach(order => {
      if (order.created_at) {
        const dayIndex = parseISO(order.created_at).getDay()
        days[dayIndex].orders++
        days[dayIndex].revenue += parseFloat(order.total_price || 0)
      }
    })
    return days
  }, [dateFilteredOrders])

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
          <p className="text-sm font-medium text-gray-900">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.name.toLowerCase().includes('revenue') || entry.name === 'AOV'
                ? `£${entry.value.toFixed(2)}`
                : entry.value}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  const COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444']

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
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-gray-500 mt-1">Analytics and management for your Shopify orders.</p>
        </div>
        <div className="flex items-center gap-3">
          <DateRangePicker value={dateRange} onChange={setDateRange} />
          <button
            onClick={loadOrders}
            className="p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Task Widget */}
      <TaskWidget filterTag="orders" title="Order Tasks" />

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <ShoppingCart className="w-4 h-4 text-gray-400" />
            <p className="text-sm text-gray-500">Orders</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{analytics.total}</p>
          <p className={`text-xs mt-1 ${analytics.ordersChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {analytics.ordersChange >= 0 ? '↑' : '↓'} {Math.abs(analytics.ordersChange).toFixed(1)}% vs prev period
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-gray-400" />
            <p className="text-sm text-gray-500">Revenue</p>
          </div>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(analytics.revenue)}</p>
          <p className={`text-xs mt-1 ${analytics.revenueChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {analytics.revenueChange >= 0 ? '↑' : '↓'} {Math.abs(analytics.revenueChange).toFixed(1)}% vs prev period
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-4 h-4 text-gray-400" />
            <p className="text-sm text-gray-500">Avg Order Value</p>
          </div>
          <p className="text-2xl font-bold text-purple-600">{formatCurrency(analytics.aov)}</p>
          <p className="text-xs text-gray-400 mt-1">per order</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-gray-400" />
            <p className="text-sm text-gray-500">Paid</p>
          </div>
          <p className="text-2xl font-bold text-green-600">{analytics.paid}</p>
          <p className="text-xs text-gray-400 mt-1">{analytics.total > 0 ? ((analytics.paid / analytics.total) * 100).toFixed(0) : 0}% of orders</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Truck className="w-4 h-4 text-gray-400" />
            <p className="text-sm text-gray-500">Fulfilled</p>
          </div>
          <p className="text-2xl font-bold text-blue-600">{analytics.fulfilled}</p>
          <p className="text-xs text-gray-400 mt-1">{analytics.fulfillmentRate.toFixed(0)}% rate</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="w-4 h-4 text-gray-400" />
            <p className="text-sm text-gray-500">Refunded</p>
          </div>
          <p className="text-2xl font-bold text-red-600">{analytics.refunded}</p>
          <p className="text-xs text-gray-400 mt-1">{analytics.refundRate.toFixed(1)}% rate</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { id: 'analytics', label: 'Analytics' },
          { id: 'orders', label: 'All Orders' },
          { id: 'customers', label: 'Customers' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-green-100 text-green-700'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Revenue Trend */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Revenue & Orders Trend</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#6B7280' }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 12, fill: '#6B7280' }} tickFormatter={(v) => `£${v}`} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12, fill: '#6B7280' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="revenue"
                    name="Revenue"
                    stroke="#10B981"
                    fill="url(#revenueGradient)"
                    strokeWidth={2}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="orders"
                    name="Orders"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Status Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Payment Status */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Payment Status</h3>
              <div className="h-56">
                {statusData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => value} />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-500">No data</div>
                )}
              </div>
            </div>

            {/* Fulfillment Status */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Fulfillment Status</h3>
              <div className="h-56">
                {fulfillmentData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={fulfillmentData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {fulfillmentData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => value} />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-500">No data</div>
                )}
              </div>
            </div>
          </div>

          {/* Time Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Orders by Hour */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Orders by Hour</h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#6B7280' }} interval={2} />
                    <YAxis tick={{ fontSize: 12, fill: '#6B7280' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="orders" name="Orders" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Orders by Day of Week */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Orders by Day of Week</h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dayOfWeekData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#6B7280' }} />
                    <YAxis tick={{ fontSize: 12, fill: '#6B7280' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="orders" name="Orders" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* AOV Trend */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Average Order Value Trend</h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyData.filter(d => d.orders > 0)} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#6B7280' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#6B7280' }} tickFormatter={(v) => `£${v}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="aov"
                    name="AOV"
                    stroke="#8B5CF6"
                    strokeWidth={2}
                    dot={{ fill: '#8B5CF6', r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Orders Tab */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search by order # or email..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setCurrentPage(1) }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                />
              </div>
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1) }}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none bg-white"
                >
                  <option value="all">All Payment Status</option>
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                  <option value="refunded">Refunded</option>
                </select>
              </div>
              <div>
                <select
                  value={fulfillmentFilter}
                  onChange={(e) => { setFulfillmentFilter(e.target.value); setCurrentPage(1) }}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none bg-white"
                >
                  <option value="all">All Fulfillment</option>
                  <option value="fulfilled">Fulfilled</option>
                  <option value="unfulfilled">Unfulfilled</option>
                  <option value="partial">Partial</option>
                </select>
              </div>
            </div>
          </div>

          {/* Orders Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fulfillment</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedOrders.map((order) => (
                    <tr key={order.shopify_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">#{order.order_number}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600">{order.email || '-'}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
                          order.financial_status === 'paid'
                            ? 'bg-green-100 text-green-800'
                            : order.financial_status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : order.financial_status === 'refunded'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {order.financial_status === 'paid' && <CheckCircle className="w-3 h-3" />}
                          {order.financial_status === 'pending' && <Clock className="w-3 h-3" />}
                          {order.financial_status === 'refunded' && <XCircle className="w-3 h-3" />}
                          {order.financial_status || 'unknown'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
                          order.fulfillment_status === 'fulfilled'
                            ? 'bg-blue-100 text-blue-800'
                            : order.fulfillment_status === 'partial'
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {order.fulfillment_status === 'fulfilled' && <Truck className="w-3 h-3" />}
                          {order.fulfillment_status || 'unfulfilled'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">{formatCurrency(order.total_price)}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {order.created_at ? format(parseISO(order.created_at), 'MMM d, yyyy HH:mm') : '-'}
                      </td>
                    </tr>
                  ))}
                  {paginatedOrders.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                        No orders found matching your filters
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Showing {startIndex + 1} to {Math.min(startIndex + ordersPerPage, filteredOrders.length)} of {filteredOrders.length}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-600">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Customers Tab */}
      {activeTab === 'customers' && (
        <div className="space-y-6">
          {/* Top Customers */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Top Customers by Revenue</h3>
            <div className="space-y-4">
              {topCustomers.map((customer, idx) => (
                <div key={customer.email} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{customer.email}</p>
                      <p className="text-sm text-gray-500">{customer.orders} order{customer.orders > 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">{formatCurrency(customer.revenue)}</p>
                    <p className="text-xs text-gray-500">AOV: {formatCurrency(customer.revenue / customer.orders)}</p>
                  </div>
                </div>
              ))}
              {topCustomers.length === 0 && (
                <p className="text-center text-gray-500 py-8">No customer data available</p>
              )}
            </div>
          </div>

          {/* Customer Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-2">
                <Users className="w-5 h-5 text-blue-500" />
                <p className="text-sm text-gray-500">Unique Customers</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {new Set(dateFilteredOrders.map(o => o.email).filter(Boolean)).size}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="w-5 h-5 text-green-500" />
                <p className="text-sm text-gray-500">Repeat Customer Rate</p>
              </div>
              <p className="text-2xl font-bold text-green-600">
                {(() => {
                  const customerCounts = {}
                  dateFilteredOrders.forEach(o => {
                    if (o.email) customerCounts[o.email] = (customerCounts[o.email] || 0) + 1
                  })
                  const repeatCustomers = Object.values(customerCounts).filter(c => c > 1).length
                  const totalCustomers = Object.keys(customerCounts).length
                  return totalCustomers > 0 ? ((repeatCustomers / totalCustomers) * 100).toFixed(1) : 0
                })()}%
              </p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-2">
                <ShoppingCart className="w-5 h-5 text-purple-500" />
                <p className="text-sm text-gray-500">Orders per Customer</p>
              </div>
              <p className="text-2xl font-bold text-purple-600">
                {(() => {
                  const uniqueCustomers = new Set(dateFilteredOrders.map(o => o.email).filter(Boolean)).size
                  return uniqueCustomers > 0 ? (dateFilteredOrders.length / uniqueCustomers).toFixed(1) : 0
                })()}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
