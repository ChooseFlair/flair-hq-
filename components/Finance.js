import { useState, useEffect, useMemo } from 'react'
import { format, parseISO, subDays, startOfDay, eachDayOfInterval } from 'date-fns'
import {
  Building2,
  CreditCard,
  Wallet,
  TrendingUp,
  TrendingDown,
  Clock,
  RefreshCw,
  CheckCircle,
  AlertCircle,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import DateRangePicker from './DateRangePicker'
import AISummary from './AISummary'
import TaskWidget from './TaskWidget'

export default function Finance({ activeSubTab, setActiveSubTab }) {
  const [accounts, setAccounts] = useState([])
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [needsAuth, setNeedsAuth] = useState(false)
  const [error, setError] = useState(null)

  // Use prop or default to 'overview'
  const activeTab = activeSubTab || 'overview'
  const setActiveTab = (tab) => setActiveSubTab?.(tab)

  // PayPal state
  const [paypalData, setPaypalData] = useState(null)
  const [paypalLoading, setPaypalLoading] = useState(true)
  const [paypalNeedsAuth, setPaypalNeedsAuth] = useState(false)

  // Date range state
  const [dateRange, setDateRange] = useState({
    startDate: subDays(new Date(), 30),
    endDate: new Date(),
    preset: '30d',
  })

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('revolut_connected') === 'true') {
      window.history.replaceState({}, '', '/')
    }
    if (params.get('revolut_error')) {
      setError(params.get('revolut_error'))
      window.history.replaceState({}, '', '/')
    }

    loadData()
  }, [])

  // Reload transactions when date range changes
  useEffect(() => {
    if (!needsAuth && accounts.length > 0) {
      loadTransactions()
    }
  }, [dateRange])

  const loadTransactions = async () => {
    try {
      const fromDate = dateRange.startDate.toISOString()
      const toDate = dateRange.endDate.toISOString()
      const txRes = await fetch(`/api/revolut/transactions?from=${fromDate}&to=${toDate}&count=1000`)
      const txData = await txRes.json()

      if (!txData.error) {
        setTransactions(txData.transactions || [])
      }
    } catch (err) {
      console.error('Error loading transactions:', err)
    }
  }

  const loadData = async () => {
    setLoading(true)
    setPaypalLoading(true)
    setError(null)

    try {
      const accountsRes = await fetch('/api/revolut/accounts')
      const accountsData = await accountsRes.json()

      if (accountsData.needsAuth) {
        setNeedsAuth(true)
        setLoading(false)
      } else if (accountsData.error) {
        throw new Error(accountsData.error)
      } else {
        setAccounts(accountsData.accounts || [])
        setNeedsAuth(false)

        // Fetch transactions for the selected date range
        const fromDate = dateRange.startDate.toISOString()
        const toDate = dateRange.endDate.toISOString()
        const txRes = await fetch(`/api/revolut/transactions?from=${fromDate}&to=${toDate}&count=1000`)
        const txData = await txRes.json()

        if (!txData.error) {
          setTransactions(txData.transactions || [])
        }
        setLoading(false)
      }
    } catch (err) {
      console.error('Error loading Revolut data:', err)
      setError(err.message)
      setLoading(false)
    }

    try {
      const paypalRes = await fetch('/api/paypal/transactions')
      const paypalJson = await paypalRes.json()

      if (paypalJson.needsAuth) {
        setPaypalNeedsAuth(true)
      } else if (paypalJson.error) {
        console.error('PayPal error:', paypalJson.error)
      } else {
        setPaypalData(paypalJson)
        setPaypalNeedsAuth(false)
      }
    } catch (err) {
      console.error('Error loading PayPal data:', err)
    } finally {
      setPaypalLoading(false)
    }
  }

  const connectRevolut = () => {
    window.location.href = '/api/revolut/auth'
  }

  // Format currency - Revolut returns account balances in major units (pounds)
  const formatCurrency = (amount, currency = 'GBP') => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency,
    }).format(amount)
  }

  // Format for transaction amounts (Revolut returns amounts in major units - pounds)
  const formatMinorCurrency = (amount, currency = 'GBP') => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency,
    }).format(amount)
  }

  const formatPayPalCurrency = (amount, currency = 'GBP') => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency,
    }).format(amount)
  }

  const getTotalBalance = () => {
    return accounts
      .filter(a => a.currency === 'GBP')
      .reduce((sum, a) => sum + a.balance, 0)
  }

  const getMonthlySpend = () => {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    return transactions
      .filter(t => {
        const txDate = new Date(t.created_at)
        return txDate >= startOfMonth && t.type === 'transfer' && t.legs?.[0]?.amount < 0
      })
      .reduce((sum, t) => sum + Math.abs(t.legs?.[0]?.amount || 0), 0)
  }

  const getMonthlyIncome = () => {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    return transactions
      .filter(t => {
        const txDate = new Date(t.created_at)
        return txDate >= startOfMonth && t.legs?.[0]?.amount > 0
      })
      .reduce((sum, t) => sum + (t.legs?.[0]?.amount || 0), 0)
  }

  const calculateRunway = () => {
    const balance = getTotalBalance()
    const monthlySpend = getMonthlySpend()
    if (monthlySpend === 0) return 'N/A'
    const months = balance / monthlySpend
    return months.toFixed(1)
  }

  // Build AI summary data
  const getAISummaryData = () => ({
    totalBalance: formatCurrency(getTotalBalance()),
    monthlyIncome: formatCurrency(getMonthlyIncome()),
    monthlySpend: formatCurrency(getMonthlySpend()),
    paypalIncome: paypalData?.summary?.totalIncome ? formatPayPalCurrency(paypalData.summary.totalIncome) : 'N/A',
    paypalFees: paypalData?.summary?.totalFees ? formatPayPalCurrency(paypalData.summary.totalFees) : 'N/A',
  })

  // Process data for cash flow chart (uses selected date range)
  const cashFlowData = useMemo(() => {
    const days = eachDayOfInterval({
      start: startOfDay(dateRange.startDate),
      end: startOfDay(dateRange.endDate)
    })

    return days.map(day => {
      const dayStart = startOfDay(day)
      const dayEnd = new Date(dayStart)
      dayEnd.setDate(dayEnd.getDate() + 1)

      const dayTransactions = transactions.filter(t => {
        const txDate = new Date(t.created_at)
        return txDate >= dayStart && txDate < dayEnd
      })

      const income = dayTransactions
        .filter(t => t.legs?.[0]?.amount > 0)
        .reduce((sum, t) => sum + (t.legs?.[0]?.amount || 0), 0)

      const spend = dayTransactions
        .filter(t => t.legs?.[0]?.amount < 0)
        .reduce((sum, t) => sum + Math.abs(t.legs?.[0]?.amount || 0), 0)

      return {
        date: format(day, 'MMM d'),
        income,
        spend,
        net: income - spend
      }
    })
  }, [transactions, dateRange])

  // Process data for income sources pie chart
  const incomeSourcesData = useMemo(() => {
    const revolutIncome = getMonthlyIncome()
    const paypalIncome = paypalData?.summary?.totalIncome || 0

    const data = []
    if (revolutIncome > 0) data.push({ name: 'Revolut', value: revolutIncome })
    if (paypalIncome > 0) data.push({ name: 'PayPal', value: paypalIncome })

    return data.length > 0 ? data : [{ name: 'No Data', value: 1 }]
  }, [transactions, paypalData])

  // Colors for pie chart
  const COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899', '#14B8A6']

  // Revolut expense categories analysis
  const revolutAnalytics = useMemo(() => {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    // Categorize transactions
    const categories = {}
    const expenseTransactions = transactions.filter(t => {
      const txDate = new Date(t.created_at)
      return txDate >= startOfMonth && t.legs?.[0]?.amount < 0
    })

    expenseTransactions.forEach(tx => {
      const desc = (tx.reference || tx.legs?.[0]?.description || 'Other').toLowerCase()
      let category = 'Other'

      if (desc.includes('meta') || desc.includes('facebook') || desc.includes('google') || desc.includes('tiktok') || desc.includes('ad')) {
        category = 'Advertising'
      } else if (desc.includes('shopify') || desc.includes('stripe') || desc.includes('payment')) {
        category = 'Platform Fees'
      } else if (desc.includes('klaviyo') || desc.includes('mailchimp') || desc.includes('software') || desc.includes('subscription')) {
        category = 'Software/SaaS'
      } else if (desc.includes('shipping') || desc.includes('royal mail') || desc.includes('dhl') || desc.includes('post')) {
        category = 'Shipping'
      } else if (desc.includes('supplier') || desc.includes('inventory') || desc.includes('stock') || desc.includes('alibaba')) {
        category = 'Inventory/COGS'
      } else if (desc.includes('transfer') || desc.includes('salary') || desc.includes('wage')) {
        category = 'Payroll'
      }

      if (!categories[category]) categories[category] = 0
      categories[category] += Math.abs(tx.legs?.[0]?.amount || 0)
    })

    const categoryData = Object.entries(categories)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)

    // Transaction volume by type
    const typeVolume = {}
    transactions.forEach(tx => {
      const type = tx.type || 'other'
      if (!typeVolume[type]) typeVolume[type] = 0
      typeVolume[type]++
    })

    // Calculate metrics
    const totalExpenses = expenseTransactions.reduce((sum, t) => sum + Math.abs(t.legs?.[0]?.amount || 0), 0)
    const avgTransactionSize = transactions.length > 0
      ? transactions.reduce((sum, t) => sum + Math.abs(t.legs?.[0]?.amount || 0), 0) / transactions.length
      : 0

    return {
      categoryData,
      typeVolume: Object.entries(typeVolume).map(([name, value]) => ({ name: name.replace('_', ' '), value })),
      totalExpenses,
      avgTransactionSize,
      transactionCount: transactions.length,
      expenseCount: expenseTransactions.length
    }
  }, [transactions])

  // PayPal analytics
  const paypalAnalytics = useMemo(() => {
    if (!paypalData?.transactions) return null

    const txs = paypalData.transactions

    // Daily revenue for last 14 days
    const days = eachDayOfInterval({
      start: subDays(new Date(), 13),
      end: new Date()
    })

    const dailyRevenue = days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd')
      const dayTxs = txs.filter(t => t.date?.startsWith(dayStr) && t.amount > 0)
      const revenue = dayTxs.reduce((sum, t) => sum + t.amount, 0)
      const fees = dayTxs.reduce((sum, t) => sum + Math.abs(t.fee || 0), 0)
      return {
        date: format(day, 'MMM d'),
        revenue,
        fees,
        net: revenue - fees,
        orders: dayTxs.length
      }
    })

    // Fee analysis
    const totalRevenue = txs.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0)
    const totalFees = txs.reduce((sum, t) => sum + Math.abs(t.fee || 0), 0)
    const feePercentage = totalRevenue > 0 ? (totalFees / totalRevenue * 100) : 0

    // Order metrics
    const successfulOrders = txs.filter(t => t.amount > 0 && t.status === 'S')
    const avgOrderValue = successfulOrders.length > 0
      ? successfulOrders.reduce((sum, t) => sum + t.amount, 0) / successfulOrders.length
      : 0

    // Top customers (by transaction count)
    const customerCounts = {}
    txs.forEach(t => {
      if (t.payerName && t.amount > 0) {
        if (!customerCounts[t.payerName]) customerCounts[t.payerName] = { count: 0, total: 0 }
        customerCounts[t.payerName].count++
        customerCounts[t.payerName].total += t.amount
      }
    })
    const topCustomers = Object.entries(customerCounts)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)

    return {
      dailyRevenue,
      totalRevenue,
      totalFees,
      feePercentage,
      avgOrderValue,
      orderCount: successfulOrders.length,
      topCustomers
    }
  }, [paypalData])

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
          <p className="text-sm font-medium text-gray-900">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: £{entry.value.toFixed(2)}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    )
  }

  if (needsAuth) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Finance</h1>
          <p className="text-gray-500 mt-1">Connect Revolut Business to see your financial data.</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Connect Revolut Business</h2>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Link your Revolut Business account to see real-time balances, transactions, and cash flow analytics.
          </p>
          <button
            onClick={connectRevolut}
            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Connect Revolut
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            Error: {error}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* AI Summary */}
      <AISummary pageType="finance" data={getAISummaryData()} />

      {/* Task Widget */}
      <TaskWidget filterTag="finance" title="Finance Tasks" />

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Finance</h1>
          <p className="text-gray-500 mt-1">Cash flow and transactions overview.</p>
        </div>
        <div className="flex items-center gap-3">
          <DateRangePicker value={dateRange} onChange={setDateRange} />
          <button
            onClick={loadData}
            className="p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          Error: {error}
        </div>
      )}

      {/* Account Balances */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
              <Wallet className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-sm text-gray-500">Total Balance</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(getTotalBalance())}</p>
          <p className="text-xs text-green-600 mt-2">Revolut Business (raw: {getTotalBalance()})</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <p className="text-sm text-gray-500">This Month Income</p>
          </div>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(getMonthlyIncome())}</p>
          <p className="text-xs text-gray-400 mt-2">Money in</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-red-600" />
            </div>
            <p className="text-sm text-gray-500">This Month Spend</p>
          </div>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(getMonthlySpend())}</p>
          <p className="text-xs text-gray-400 mt-2">Money out</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-sm text-gray-500">Runway</p>
          </div>
          <p className="text-2xl font-bold text-blue-600">{calculateRunway()} months</p>
          <p className="text-xs text-gray-400 mt-2">At current burn rate</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'accounts', label: 'Revolut' },
          { id: 'transactions', label: 'Transactions' },
          { id: 'paypal', label: 'PayPal' },
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

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Cash Flow Chart */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Cash Flow ({format(dateRange.startDate, 'MMM d')} - {format(dateRange.endDate, 'MMM d')})</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cashFlowData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12, fill: '#6B7280' }}
                    axisLine={{ stroke: '#E5E7EB' }}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: '#6B7280' }}
                    axisLine={{ stroke: '#E5E7EB' }}
                    tickFormatter={(value) => `£${value}`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="income" name="Income" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="spend" name="Spend" fill="#EF4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Net Cash Flow Area Chart */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Net Cash Flow Trend</h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={cashFlowData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="netGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: '#6B7280' }}
                      axisLine={{ stroke: '#E5E7EB' }}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#6B7280' }}
                      axisLine={{ stroke: '#E5E7EB' }}
                      tickFormatter={(value) => `£${value}`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="net"
                      name="Net"
                      stroke="#8B5CF6"
                      fill="url(#netGradient)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Income Sources Pie Chart */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Income Sources (This Month)</h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={incomeSourcesData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {incomeSourcesData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => `£${value.toFixed(2)}`}
                      contentStyle={{ backgroundColor: 'white', border: '1px solid #E5E7EB', borderRadius: '8px' }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      formatter={(value, entry) => (
                        <span className="text-sm text-gray-600">{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Account Balances & Recent Transactions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">Account Balances</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {accounts.map(account => (
                  <div key={account.id} className="px-6 py-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{account.name || account.currency + ' Account'}</p>
                      <p className="text-sm text-gray-500">{account.currency}</p>
                    </div>
                    <p className="font-semibold text-gray-900">
                      {formatCurrency(account.balance, account.currency)}
                    </p>
                  </div>
                ))}
                {accounts.length === 0 && (
                  <div className="px-6 py-8 text-center text-gray-500">No accounts found</div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">Recent Transactions</h3>
              </div>
              <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
                {transactions.slice(0, 10).map(tx => {
                  const leg = tx.legs?.[0] || {}
                  const isCredit = leg.amount > 0
                  return (
                    <div key={tx.id} className="px-6 py-3 flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {tx.reference || leg.description || tx.type}
                        </p>
                        <p className="text-xs text-gray-500">
                          {tx.created_at ? format(parseISO(tx.created_at), 'MMM d, yyyy') : '-'}
                        </p>
                      </div>
                      <p className={`font-semibold ${isCredit ? 'text-green-600' : 'text-red-600'}`}>
                        {isCredit ? '+' : ''}{formatMinorCurrency(leg.amount || 0, leg.currency || 'GBP')}
                      </p>
                    </div>
                  )
                })}
                {transactions.length === 0 && (
                  <div className="px-6 py-8 text-center text-gray-500">No transactions found</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Accounts Tab - Revolut Analytics */}
      {activeTab === 'accounts' && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Total Expenses (MTD)</p>
              <p className="text-2xl font-bold text-red-600">£{revolutAnalytics.totalExpenses.toFixed(2)}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Avg Transaction</p>
              <p className="text-2xl font-bold text-gray-900">£{revolutAnalytics.avgTransactionSize.toFixed(2)}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Total Transactions</p>
              <p className="text-2xl font-bold text-blue-600">{revolutAnalytics.transactionCount}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Expense Txns</p>
              <p className="text-2xl font-bold text-purple-600">{revolutAnalytics.expenseCount}</p>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Expense Categories Pie Chart */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">OpEx Breakdown (This Month)</h3>
              <div className="h-64">
                {revolutAnalytics.categoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={revolutAnalytics.categoryData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {revolutAnalytics.categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `£${value.toFixed(2)}`} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-500">No expense data</div>
                )}
              </div>
            </div>

            {/* Expense Categories Breakdown */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Expense Categories</h3>
              <div className="space-y-3">
                {revolutAnalytics.categoryData.map((cat, idx) => (
                  <div key={cat.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                      />
                      <span className="text-sm text-gray-700">{cat.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">£{cat.value.toFixed(2)}</p>
                      <p className="text-xs text-gray-500">
                        {revolutAnalytics.totalExpenses > 0
                          ? ((cat.value / revolutAnalytics.totalExpenses) * 100).toFixed(1)
                          : 0}%
                      </p>
                    </div>
                  </div>
                ))}
                {revolutAnalytics.categoryData.length === 0 && (
                  <p className="text-gray-500 text-center py-4">No expenses this month</p>
                )}
              </div>
            </div>
          </div>

          {/* Account Balances Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Account Balances</h3>
            </div>
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Account</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Currency</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Balance</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Raw Value</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {accounts.map(account => (
                  <tr key={account.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{account.name || 'Main Account'}</td>
                    <td className="px-6 py-4 text-gray-500">{account.currency}</td>
                    <td className="px-6 py-4 font-semibold text-gray-900">
                      {formatCurrency(account.balance, account.currency)}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-400 font-mono">
                      {account.balance}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
                        account.state === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        <CheckCircle className="w-3 h-3" />
                        {account.state || 'active'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Transaction Type Distribution */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Transaction Types</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revolutAnalytics.typeVolume} layout="vertical" margin={{ left: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis type="number" tick={{ fontSize: 12, fill: '#6B7280' }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 12, fill: '#6B7280' }} />
                  <Tooltip />
                  <Bar dataKey="value" name="Count" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Transactions Tab */}
      {activeTab === 'transactions' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {transactions.map(tx => {
                  const leg = tx.legs?.[0] || {}
                  const isCredit = leg.amount > 0
                  return (
                    <tr key={tx.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                        {tx.created_at ? format(parseISO(tx.created_at), 'MMM d, yyyy HH:mm') : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{tx.reference || leg.description || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-500 capitalize">{tx.type?.replace('_', ' ') || '-'}</td>
                      <td className={`px-6 py-4 text-sm font-semibold whitespace-nowrap ${isCredit ? 'text-green-600' : 'text-red-600'}`}>
                        {isCredit ? '+' : ''}{formatMinorCurrency(leg.amount || 0, leg.currency || 'GBP')}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
                          tx.state === 'completed' ? 'bg-green-100 text-green-800' :
                          tx.state === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {tx.state === 'completed' && <CheckCircle className="w-3 h-3" />}
                          {tx.state === 'pending' && <Clock className="w-3 h-3" />}
                          {tx.state || 'completed'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PayPal Tab */}
      {activeTab === 'paypal' && (
        <div className="space-y-6">
          {paypalLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          ) : paypalNeedsAuth ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <CreditCard className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">PayPal Not Connected</h3>
              <p className="text-gray-500 text-sm">Configure PayPal API credentials to see transaction data.</p>
            </div>
          ) : paypalData && paypalAnalytics ? (
            <>
              {/* Key Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <p className="text-sm text-gray-500">PayPal Balance</p>
                  <p className="text-xl font-bold text-gray-900">
                    {paypalData.balance ? formatPayPalCurrency(parseFloat(paypalData.balance.total_balance?.value || 0)) : '—'}
                  </p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <p className="text-sm text-gray-500">Revenue (31d)</p>
                  <p className="text-xl font-bold text-green-600">£{paypalAnalytics.totalRevenue.toFixed(2)}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <p className="text-sm text-gray-500">Fees (31d)</p>
                  <p className="text-xl font-bold text-red-600">£{paypalAnalytics.totalFees.toFixed(2)}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <p className="text-sm text-gray-500">Fee Rate</p>
                  <p className="text-xl font-bold text-orange-600">{paypalAnalytics.feePercentage.toFixed(1)}%</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <p className="text-sm text-gray-500">Orders</p>
                  <p className="text-xl font-bold text-blue-600">{paypalAnalytics.orderCount}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <p className="text-sm text-gray-500">Avg Order Value</p>
                  <p className="text-xl font-bold text-purple-600">£{paypalAnalytics.avgOrderValue.toFixed(2)}</p>
                </div>
              </div>

              {/* Revenue Chart */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Daily Revenue & Fees (Last 14 Days)</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={paypalAnalytics.dailyRevenue} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="feeGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#6B7280' }} />
                      <YAxis tick={{ fontSize: 12, fill: '#6B7280' }} tickFormatter={(v) => `£${v}`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#10B981" fill="url(#revenueGradient)" strokeWidth={2} />
                      <Area type="monotone" dataKey="fees" name="Fees" stroke="#EF4444" fill="url(#feeGradient)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Orders and Top Customers */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Orders per Day */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Orders per Day</h3>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={paypalAnalytics.dailyRevenue} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6B7280' }} />
                        <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} />
                        <Tooltip />
                        <Bar dataKey="orders" name="Orders" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Top Customers */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Top Customers (31d)</h3>
                  <div className="space-y-3">
                    {paypalAnalytics.topCustomers.map((customer, idx) => (
                      <div key={customer.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-sm">
                            {idx + 1}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{customer.name}</p>
                            <p className="text-xs text-gray-500">{customer.count} order{customer.count > 1 ? 's' : ''}</p>
                          </div>
                        </div>
                        <p className="font-semibold text-gray-900">£{customer.total.toFixed(2)}</p>
                      </div>
                    ))}
                    {paypalAnalytics.topCustomers.length === 0 && (
                      <p className="text-gray-500 text-center py-4">No customer data</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Fee Analysis */}
              <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-xl p-6">
                <h3 className="font-semibold text-gray-900 mb-3">Fee Analysis</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <p className="text-sm text-gray-600">Total Fees Paid</p>
                    <p className="text-2xl font-bold text-red-600">£{paypalAnalytics.totalFees.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Effective Fee Rate</p>
                    <p className="text-2xl font-bold text-orange-600">{paypalAnalytics.feePercentage.toFixed(2)}%</p>
                    <p className="text-xs text-gray-500 mt-1">PayPal standard: 2.9% + £0.30</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Avg Fee per Order</p>
                    <p className="text-2xl font-bold text-gray-900">
                      £{paypalAnalytics.orderCount > 0 ? (paypalAnalytics.totalFees / paypalAnalytics.orderCount).toFixed(2) : '0.00'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Transactions Table */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-900">Recent Transactions</h3>
                </div>
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fee</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Net</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {paypalData.transactions?.slice(0, 50).map(tx => (
                        <tr key={tx.id} className="hover:bg-gray-50">
                          <td className="px-6 py-3 text-sm text-gray-500 whitespace-nowrap">
                            {tx.date ? format(parseISO(tx.date), 'MMM d, HH:mm') : '-'}
                          </td>
                          <td className="px-6 py-3 text-sm text-gray-900">{tx.payerName || '-'}</td>
                          <td className={`px-6 py-3 text-sm font-semibold ${tx.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {tx.amount >= 0 ? '+' : ''}£{tx.amount.toFixed(2)}
                          </td>
                          <td className="px-6 py-3 text-sm text-red-500">
                            {tx.fee ? `-£${Math.abs(tx.fee).toFixed(2)}` : '—'}
                          </td>
                          <td className="px-6 py-3 text-sm font-medium text-gray-900">
                            £{(tx.amount - Math.abs(tx.fee || 0)).toFixed(2)}
                          </td>
                          <td className="px-6 py-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
                              tx.status === 'S' ? 'bg-green-100 text-green-800' :
                              tx.status === 'P' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {tx.status === 'S' && <CheckCircle className="w-3 h-3" />}
                              {tx.status === 'S' ? 'Success' : tx.status === 'P' ? 'Pending' : tx.status || '-'}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {(!paypalData.transactions || paypalData.transactions.length === 0) && (
                        <tr>
                          <td colSpan={6} className="px-6 py-8 text-center text-gray-500">No transactions found</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
              No PayPal data available
            </div>
          )}
        </div>
      )}

      {/* Connection Status */}
      <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${needsAuth ? 'bg-gray-400' : 'bg-green-500'}`}></div>
            <span className="text-sm text-gray-600">Revolut {needsAuth ? 'Disconnected' : 'Connected'}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${paypalNeedsAuth ? 'bg-gray-400' : 'bg-green-500'}`}></div>
            <span className="text-sm text-gray-600">PayPal {paypalNeedsAuth ? 'Not Configured' : 'Connected'}</span>
          </div>
        </div>
        <button
          onClick={connectRevolut}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Reconnect Revolut
        </button>
      </div>
    </div>
  )
}
