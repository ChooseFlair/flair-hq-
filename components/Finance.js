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

        const txRes = await fetch('/api/revolut/transactions?count=50')
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

  const formatCurrency = (amount, currency = 'GBP') => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency,
    }).format(amount / 100)
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

  // Process data for cash flow chart (last 14 days)
  const cashFlowData = useMemo(() => {
    const days = eachDayOfInterval({
      start: subDays(new Date(), 13),
      end: new Date()
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
        .reduce((sum, t) => sum + (t.legs?.[0]?.amount || 0), 0) / 100

      const spend = dayTransactions
        .filter(t => t.legs?.[0]?.amount < 0)
        .reduce((sum, t) => sum + Math.abs(t.legs?.[0]?.amount || 0), 0) / 100

      return {
        date: format(day, 'MMM d'),
        income,
        spend,
        net: income - spend
      }
    })
  }, [transactions])

  // Process data for income sources pie chart
  const incomeSourcesData = useMemo(() => {
    const revolutIncome = getMonthlyIncome() / 100
    const paypalIncome = paypalData?.summary?.totalIncome || 0

    const data = []
    if (revolutIncome > 0) data.push({ name: 'Revolut', value: revolutIncome })
    if (paypalIncome > 0) data.push({ name: 'PayPal', value: paypalIncome })

    return data.length > 0 ? data : [{ name: 'No Data', value: 1 }]
  }, [transactions, paypalData])

  // Colors for pie chart
  const COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B']

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
          <p className="text-xs text-green-600 mt-2">Revolut Business</p>
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
            <h3 className="font-semibold text-gray-900 mb-4">Cash Flow (Last 14 Days)</h3>
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
                        {isCredit ? '+' : ''}{formatCurrency(leg.amount || 0, leg.currency || 'GBP')}
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

      {/* Accounts Tab */}
      {activeTab === 'accounts' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Account</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Currency</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Balance</th>
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
                        {isCredit ? '+' : ''}{formatCurrency(leg.amount || 0, leg.currency || 'GBP')}
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
          ) : paypalData ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-blue-600" />
                    </div>
                    <p className="text-sm text-gray-500">PayPal Balance</p>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {paypalData.balance ? formatPayPalCurrency(parseFloat(paypalData.balance.total_balance?.value || 0), paypalData.balance.total_balance?.currency_code) : '—'}
                  </p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-green-600" />
                    </div>
                    <p className="text-sm text-gray-500">Income (31d)</p>
                  </div>
                  <p className="text-2xl font-bold text-green-600">{formatPayPalCurrency(paypalData.summary?.totalIncome || 0)}</p>
                  <p className="text-xs text-gray-400 mt-2">{paypalData.summary?.transactionCount || 0} transactions</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                      <TrendingDown className="w-5 h-5 text-red-600" />
                    </div>
                    <p className="text-sm text-gray-500">Fees (31d)</p>
                  </div>
                  <p className="text-2xl font-bold text-red-600">{formatPayPalCurrency(paypalData.summary?.totalFees || 0)}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                      <Wallet className="w-5 h-5 text-purple-600" />
                    </div>
                    <p className="text-sm text-gray-500">Net Income (31d)</p>
                  </div>
                  <p className="text-2xl font-bold text-purple-600">{formatPayPalCurrency(paypalData.summary?.netIncome || 0)}</p>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-900">PayPal Transactions (Last 31 Days)</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">From</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fee</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {paypalData.transactions?.slice(0, 50).map(tx => (
                        <tr key={tx.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                            {tx.date ? format(parseISO(tx.date), 'MMM d, yyyy HH:mm') : '-'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">{tx.payerName || '-'}</td>
                          <td className={`px-6 py-4 text-sm font-semibold whitespace-nowrap ${tx.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {tx.amount >= 0 ? '+' : ''}{formatPayPalCurrency(tx.amount, tx.currency)}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {tx.fee ? formatPayPalCurrency(Math.abs(tx.fee), tx.currency) : '—'}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
                              tx.status === 'S' ? 'bg-green-100 text-green-800' :
                              tx.status === 'P' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {tx.status === 'S' && <CheckCircle className="w-3 h-3" />}
                              {tx.status === 'P' && <Clock className="w-3 h-3" />}
                              {tx.status === 'S' ? 'Success' : tx.status === 'P' ? 'Pending' : tx.status || 'Unknown'}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {(!paypalData.transactions || paypalData.transactions.length === 0) && (
                        <tr>
                          <td colSpan={5} className="px-6 py-8 text-center text-gray-500">No transactions found</td>
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
