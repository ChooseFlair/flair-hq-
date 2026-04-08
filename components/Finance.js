import { useState, useEffect } from 'react'
import { format, parseISO } from 'date-fns'

export default function Finance() {
  const [accounts, setAccounts] = useState([])
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [needsAuth, setNeedsAuth] = useState(false)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    // Check URL params for connection status
    const params = new URLSearchParams(window.location.search)
    if (params.get('revolut_connected') === 'true') {
      // Clear the URL param
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
    setError(null)

    try {
      // Fetch accounts
      const accountsRes = await fetch('/api/revolut/accounts')
      const accountsData = await accountsRes.json()

      if (accountsData.needsAuth) {
        setNeedsAuth(true)
        setLoading(false)
        return
      }

      if (accountsData.error) {
        throw new Error(accountsData.error)
      }

      setAccounts(accountsData.accounts || [])
      setNeedsAuth(false)

      // Fetch transactions
      const txRes = await fetch('/api/revolut/transactions?count=50')
      const txData = await txRes.json()

      if (!txData.error) {
        setTransactions(txData.transactions || [])
      }
    } catch (err) {
      console.error('Error loading Revolut data:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const connectRevolut = () => {
    window.location.href = '/api/revolut/auth'
  }

  const formatCurrency = (amount, currency = 'GBP') => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency,
    }).format(amount / 100) // Revolut amounts are in minor units (pence)
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

  // Calculate runway (months of runway based on average monthly spend)
  const calculateRunway = () => {
    const balance = getTotalBalance()
    const monthlySpend = getMonthlySpend()
    if (monthlySpend === 0) return 'N/A'
    const months = balance / monthlySpend
    return months.toFixed(1)
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
            <span className="text-3xl">🏦</span>
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Finance</h1>
          <p className="text-gray-500 mt-1">Revolut Business cash flow and transactions.</p>
        </div>
        <button
          onClick={loadData}
          className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          Error: {error}
        </div>
      )}

      {/* Account Balances */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500 mb-1">Total Balance (GBP)</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(getTotalBalance())}</p>
          <p className="text-xs text-green-600 mt-2">Revolut Business</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500 mb-1">This Month Income</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(getMonthlyIncome())}</p>
          <p className="text-xs text-gray-400 mt-2">Money in</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500 mb-1">This Month Spend</p>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(getMonthlySpend())}</p>
          <p className="text-xs text-gray-400 mt-2">Money out</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500 mb-1">Runway</p>
          <p className="text-2xl font-bold text-blue-600">{calculateRunway()} months</p>
          <p className="text-xs text-gray-400 mt-2">At current burn rate</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {['overview', 'accounts', 'transactions'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
              activeTab === tab
                ? 'bg-green-100 text-green-700'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Accounts Summary */}
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
                <div className="px-6 py-8 text-center text-gray-500">
                  No accounts found
                </div>
              )}
            </div>
          </div>

          {/* Recent Transactions */}
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
                <div className="px-6 py-8 text-center text-gray-500">
                  No transactions found
                </div>
              )}
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
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {account.name || 'Main Account'}
                  </td>
                  <td className="px-6 py-4 text-gray-500">{account.currency}</td>
                  <td className="px-6 py-4 font-semibold text-gray-900">
                    {formatCurrency(account.balance, account.currency)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      account.state === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
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
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {tx.reference || leg.description || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 capitalize">
                        {tx.type?.replace('_', ' ') || '-'}
                      </td>
                      <td className={`px-6 py-4 text-sm font-semibold whitespace-nowrap ${
                        isCredit ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {isCredit ? '+' : ''}{formatCurrency(leg.amount || 0, leg.currency || 'GBP')}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          tx.state === 'completed' ? 'bg-green-100 text-green-800' :
                          tx.state === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
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

      {/* Connection Status */}
      <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-sm text-gray-600">Connected to Revolut Business</span>
        </div>
        <button
          onClick={connectRevolut}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Reconnect
        </button>
      </div>
    </div>
  )
}
