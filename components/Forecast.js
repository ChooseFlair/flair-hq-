import { useState, useEffect, useMemo } from 'react'
import { format, subDays, eachDayOfInterval, startOfMonth, endOfMonth, subMonths, parseISO } from 'date-fns'
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Target,
  Calendar,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Zap,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

export default function Forecast() {
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [autoRefresh, setAutoRefresh] = useState(true)

  // Data from all sources
  const [revolutData, setRevolutData] = useState({ accounts: [], transactions: [] })
  const [paypalData, setPaypalData] = useState(null)
  const [ordersData, setOrdersData] = useState([])
  const [metaData, setMetaData] = useState(null)

  // Load all data
  const loadAllData = async () => {
    setLoading(true)
    try {
      const [revolutAccounts, revolutTx, paypal, orders, meta] = await Promise.all([
        fetch('/api/revolut/accounts').then(r => r.json()).catch(() => ({ accounts: [] })),
        fetch('/api/revolut/transactions?count=100').then(r => r.json()).catch(() => ({ transactions: [] })),
        fetch('/api/paypal/transactions').then(r => r.json()).catch(() => null),
        fetch('/api/klaviyo/sync-status').then(r => r.json()).catch(() => ({})),
        fetch('/api/meta/overview').then(r => r.json()).catch(() => null),
      ])

      setRevolutData({
        accounts: revolutAccounts.accounts || [],
        transactions: revolutTx.transactions || []
      })
      setPaypalData(paypal?.needsAuth ? null : paypal)
      setOrdersData(orders?.recentOrders || [])
      setMetaData(meta?.error ? null : meta)
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Error loading forecast data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Initial load and auto-refresh
  useEffect(() => {
    loadAllData()

    // Auto-refresh every 5 minutes
    let interval
    if (autoRefresh) {
      interval = setInterval(loadAllData, 5 * 60 * 1000)
    }
    return () => clearInterval(interval)
  }, [autoRefresh])

  // Calculate all metrics
  const metrics = useMemo(() => {
    // Revolut balance (API returns amounts in pounds, not pence)
    const revolutBalance = revolutData.accounts
      .filter(a => a.currency === 'GBP')
      .reduce((sum, a) => sum + (a.balance || 0), 0)

    // PayPal balance
    const paypalBalance = paypalData?.balance?.total_balance?.value
      ? parseFloat(paypalData.balance.total_balance.value)
      : 0

    // Total balance
    const totalBalance = revolutBalance + paypalBalance

    // This month's data
    const now = new Date()
    const monthStart = startOfMonth(now)

    // Revolut income/expenses this month
    const revolutThisMonth = revolutData.transactions.filter(t => {
      const txDate = new Date(t.created_at)
      return txDate >= monthStart
    })

    const revolutIncome = revolutThisMonth
      .filter(t => t.legs?.[0]?.amount > 0)
      .reduce((sum, t) => sum + (t.legs?.[0]?.amount || 0), 0)

    const revolutExpenses = revolutThisMonth
      .filter(t => t.legs?.[0]?.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.legs?.[0]?.amount || 0), 0)

    // PayPal income this month
    const paypalIncome = paypalData?.summary?.totalIncome || 0
    const paypalFees = paypalData?.summary?.totalFees || 0

    // Ad spend (from Meta)
    const adSpend = metaData?.spend || 0

    // Total revenue and expenses
    const totalRevenue = revolutIncome + paypalIncome
    const totalExpenses = revolutExpenses + paypalFees + adSpend
    const netProfit = totalRevenue - totalExpenses
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0

    // Daily averages (for forecasting)
    const daysInMonth = now.getDate()
    const dailyRevenue = totalRevenue / daysInMonth
    const dailyExpenses = totalExpenses / daysInMonth

    // Projected month-end
    const daysRemaining = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - daysInMonth
    const projectedMonthRevenue = totalRevenue + (dailyRevenue * daysRemaining)
    const projectedMonthExpenses = totalExpenses + (dailyExpenses * daysRemaining)
    const projectedMonthProfit = projectedMonthRevenue - projectedMonthExpenses

    // Runway
    const monthlyBurn = totalExpenses > totalRevenue ? totalExpenses - totalRevenue : 0
    const runway = monthlyBurn > 0 ? totalBalance / monthlyBurn : Infinity

    // Historical monthly data (simulated from current data)
    const historicalMonths = []
    for (let i = 5; i >= 0; i--) {
      const month = subMonths(now, i)
      const growthFactor = 1 - (i * 0.08) // Assume ~8% monthly growth historically
      historicalMonths.push({
        month: format(month, 'MMM'),
        revenue: Math.max(0, totalRevenue * growthFactor * (i === 0 ? 1 : 0.9 + Math.random() * 0.2)),
        expenses: Math.max(0, totalExpenses * (0.85 + i * 0.03) * (i === 0 ? 1 : 0.9 + Math.random() * 0.2)),
        isActual: i === 0
      })
    }

    // Future projections (6 months)
    const projections = []
    let runningBalance = totalBalance

    for (let i = 0; i <= 6; i++) {
      const month = new Date()
      month.setMonth(month.getMonth() + i)

      if (i === 0) {
        projections.push({
          month: format(month, 'MMM yyyy'),
          revenue: projectedMonthRevenue,
          expenses: projectedMonthExpenses,
          profit: projectedMonthProfit,
          balance: runningBalance,
          isProjection: false
        })
      } else {
        // Growth assumptions
        const revenueGrowth = 1.05 // 5% monthly
        const expenseGrowth = 1.02 // 2% monthly

        const projRevenue = projectedMonthRevenue * Math.pow(revenueGrowth, i)
        const projExpenses = projectedMonthExpenses * Math.pow(expenseGrowth, i)
        const projProfit = projRevenue - projExpenses
        runningBalance += projProfit

        projections.push({
          month: format(month, 'MMM yyyy'),
          revenue: projRevenue,
          expenses: projExpenses,
          profit: projProfit,
          balance: runningBalance,
          isProjection: true
        })
      }
    }

    // Scenarios
    const scenarios = {
      conservative: projections.map((p, i) => ({
        ...p,
        revenue: i === 0 ? p.revenue : projectedMonthRevenue * Math.pow(1.0, i),
        balance: i === 0 ? p.balance : totalBalance + (projectedMonthRevenue - projectedMonthExpenses * 1.05) * i
      })),
      moderate: projections,
      optimistic: projections.map((p, i) => ({
        ...p,
        revenue: i === 0 ? p.revenue : projectedMonthRevenue * Math.pow(1.10, i),
        balance: i === 0 ? p.balance : totalBalance + ((projectedMonthRevenue * Math.pow(1.10, i)) - projectedMonthExpenses * 1.02) * i
      }))
    }

    // Targets
    const targetMonthly = 3000
    const gapToTarget = Math.max(0, targetMonthly - projectedMonthRevenue)
    const progressToTarget = Math.min(100, (projectedMonthRevenue / targetMonthly) * 100)
    const monthsToTarget = projectedMonthRevenue >= targetMonthly ? 0 :
      Math.ceil(Math.log(targetMonthly / Math.max(1, projectedMonthRevenue)) / Math.log(1.05))

    return {
      // Current state
      totalBalance,
      revolutBalance,
      paypalBalance,
      totalRevenue,
      totalExpenses,
      netProfit,
      profitMargin,
      adSpend,

      // Projections
      dailyRevenue,
      dailyExpenses,
      projectedMonthRevenue,
      projectedMonthExpenses,
      projectedMonthProfit,
      runway: runway === Infinity ? 'Profitable' : runway < 1 ? 'Critical' : `${runway.toFixed(1)} months`,
      runwayNumber: runway,

      // Charts
      historicalMonths,
      projections,
      scenarios,

      // Targets
      targetMonthly,
      gapToTarget,
      progressToTarget,
      monthsToTarget: monthsToTarget === 0 ? 'Achieved!' : `~${monthsToTarget} months`
    }
  }, [revolutData, paypalData, metaData])

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
          <p className="text-sm font-medium text-gray-900 mb-1">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: £{typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  const formatCurrency = (value) => `£${value.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

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
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Business Forecast</h1>
          <p className="text-gray-500 mt-1">
            Auto-updated projections based on all your data sources
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
            {lastUpdated && `Updated ${format(lastUpdated, 'HH:mm')}`}
          </div>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1.5 text-sm rounded-lg ${autoRefresh ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}
          >
            {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
          </button>
          <button
            onClick={loadAllData}
            className="p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Health Status */}
      <div className={`rounded-xl p-4 flex items-center gap-4 ${
        metrics.runwayNumber === Infinity ? 'bg-green-50 border border-green-200' :
        metrics.runwayNumber > 6 ? 'bg-blue-50 border border-blue-200' :
        metrics.runwayNumber > 3 ? 'bg-yellow-50 border border-yellow-200' :
        'bg-red-50 border border-red-200'
      }`}>
        {metrics.runwayNumber === Infinity ? (
          <CheckCircle className="w-6 h-6 text-green-600" />
        ) : metrics.runwayNumber > 3 ? (
          <Zap className="w-6 h-6 text-yellow-600" />
        ) : (
          <AlertTriangle className="w-6 h-6 text-red-600" />
        )}
        <div>
          <p className="font-medium text-gray-900">
            {metrics.runwayNumber === Infinity ? 'Business is Profitable' :
             metrics.runwayNumber > 6 ? 'Healthy Runway' :
             metrics.runwayNumber > 3 ? 'Monitor Cash Flow' :
             'Low Runway - Take Action'}
          </p>
          <p className="text-sm text-gray-600">
            {metrics.runwayNumber === Infinity
              ? `Generating £${metrics.netProfit.toFixed(0)} profit this month`
              : `${metrics.runway} of runway at current burn rate`}
          </p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-4 h-4 text-gray-400" />
            <p className="text-sm text-gray-500">Total Cash</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(metrics.totalBalance)}</p>
          <p className="text-xs text-gray-400 mt-1">Revolut + PayPal</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <p className="text-sm text-gray-500">MTD Revenue</p>
          </div>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(metrics.totalRevenue)}</p>
          <p className="text-xs text-gray-400 mt-1">Proj: {formatCurrency(metrics.projectedMonthRevenue)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-red-500" />
            <p className="text-sm text-gray-500">MTD Expenses</p>
          </div>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(metrics.totalExpenses)}</p>
          <p className="text-xs text-gray-400 mt-1">Inc. £{metrics.adSpend.toFixed(0)} ads</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-purple-500" />
            <p className="text-sm text-gray-500">Net Profit</p>
          </div>
          <p className={`text-2xl font-bold ${metrics.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(metrics.netProfit)}
          </p>
          <p className="text-xs text-gray-400 mt-1">{metrics.profitMargin.toFixed(1)}% margin</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-blue-500" />
            <p className="text-sm text-gray-500">Daily Avg</p>
          </div>
          <p className="text-2xl font-bold text-blue-600">{formatCurrency(metrics.dailyRevenue)}</p>
          <p className="text-xs text-gray-400 mt-1">revenue/day</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-orange-500" />
            <p className="text-sm text-gray-500">Runway</p>
          </div>
          <p className={`text-2xl font-bold ${
            metrics.runwayNumber === Infinity ? 'text-green-600' :
            metrics.runwayNumber > 3 ? 'text-blue-600' : 'text-red-600'
          }`}>{metrics.runway}</p>
        </div>
      </div>

      {/* 6-Month Projection Chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">6-Month Cash Projection</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={metrics.projections} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#6B7280' }} />
              <YAxis tick={{ fontSize: 12, fill: '#6B7280' }} tickFormatter={(v) => `£${(v/1000).toFixed(1)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area
                type="monotone"
                dataKey="balance"
                name="Projected Balance"
                stroke="#10B981"
                fill="url(#balanceGrad)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Revenue vs Expenses & Target */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly P&L Projection */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Monthly Revenue vs Expenses</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.projections} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6B7280' }} />
                <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} tickFormatter={(v) => `£${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="revenue" name="Revenue" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="Expenses" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Income Target */}
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Income Replacement Goal</h3>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Progress to £3,000/month</span>
                <span className="font-semibold text-purple-600">
                  {formatCurrency(metrics.projectedMonthRevenue)} / {formatCurrency(metrics.targetMonthly)}
                </span>
              </div>
              <div className="h-4 bg-white/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-500"
                  style={{ width: `${metrics.progressToTarget}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {metrics.progressToTarget.toFixed(0)}% of target
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/50 rounded-lg p-4">
                <p className="text-sm text-gray-500">Gap to Target</p>
                <p className="text-2xl font-bold text-purple-600">{formatCurrency(metrics.gapToTarget)}</p>
              </div>
              <div className="bg-white/50 rounded-lg p-4">
                <p className="text-sm text-gray-500">Time to Target</p>
                <p className="text-2xl font-bold text-indigo-600">{metrics.monthsToTarget}</p>
                <p className="text-xs text-gray-500">at 5% growth</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scenario Comparison */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Growth Scenarios (6-Month Balance)</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: '#6B7280' }}
                data={metrics.scenarios.moderate}
              />
              <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} tickFormatter={(v) => `£${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line
                data={metrics.scenarios.conservative}
                type="monotone"
                dataKey="balance"
                name="Conservative (0%)"
                stroke="#94A3B8"
                strokeWidth={2}
                dot={false}
              />
              <Line
                data={metrics.scenarios.moderate}
                type="monotone"
                dataKey="balance"
                name="Moderate (5%)"
                stroke="#8B5CF6"
                strokeWidth={2}
                dot={false}
              />
              <Line
                data={metrics.scenarios.optimistic}
                type="monotone"
                dataKey="balance"
                name="Optimistic (10%)"
                stroke="#10B981"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Projection Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Month-by-Month Projection</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Month</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expenses</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Profit</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {metrics.projections.map((row) => (
                <tr key={row.month} className={row.isProjection ? 'bg-blue-50/30' : 'bg-green-50/30'}>
                  <td className="px-6 py-3 text-sm font-medium text-gray-900">
                    {row.month}
                    {row.isProjection ? (
                      <span className="ml-2 text-xs text-blue-500">(projected)</span>
                    ) : (
                      <span className="ml-2 text-xs text-green-500">(current)</span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-sm text-green-600 font-medium">{formatCurrency(row.revenue)}</td>
                  <td className="px-6 py-3 text-sm text-red-600 font-medium">{formatCurrency(row.expenses)}</td>
                  <td className={`px-6 py-3 text-sm font-medium ${row.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(row.profit)}
                  </td>
                  <td className="px-6 py-3 text-sm font-bold text-gray-900">{formatCurrency(row.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Data Sources */}
      <div className="bg-gray-50 rounded-lg p-4">
        <p className="text-sm text-gray-600 mb-2 font-medium">Data Sources:</p>
        <div className="flex flex-wrap gap-3">
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${revolutData.accounts.length > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${revolutData.accounts.length > 0 ? 'bg-green-500' : 'bg-gray-400'}`} />
            Revolut
          </span>
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${paypalData ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${paypalData ? 'bg-green-500' : 'bg-gray-400'}`} />
            PayPal
          </span>
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${metaData ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${metaData ? 'bg-green-500' : 'bg-gray-400'}`} />
            Meta Ads
          </span>
        </div>
      </div>
    </div>
  )
}
