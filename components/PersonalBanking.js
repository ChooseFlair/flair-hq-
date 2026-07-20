import { useState, useEffect } from 'react'
import { Landmark, RefreshCw, Link2, AlertCircle, ArrowDownLeft, ArrowUpRight } from 'lucide-react'

const fmtGBP = (n, currency = 'GBP') =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(n)

const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

export default function PersonalBanking() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedAccount, setSelectedAccount] = useState(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/truelayer/data')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load banking data')
      setData(json)
      if (json.accounts?.length && !selectedAccount) {
        setSelectedAccount(json.accounts[0].id)
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('bank_connected') || params.get('bank_error')) {
      window.history.replaceState({}, '', '/')
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400">
        <RefreshCw className="w-5 h-5 animate-spin mr-2" />
        <span className="text-sm">Loading your accounts…</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-lg mx-auto mt-12 bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <AlertCircle className="w-6 h-6 text-red-500 mx-auto mb-2" />
        <p className="text-sm text-red-700 mb-4">{error}</p>
        <button onClick={load} className="text-sm font-medium text-red-700 underline">Try again</button>
      </div>
    )
  }

  if (!data?.connected) {
    return (
      <div className="max-w-lg mx-auto mt-12 bg-white border border-gray-200 rounded-2xl p-8 text-center shadow-sm">
        <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center mx-auto mb-4">
          <Landmark className="w-6 h-6 text-indigo-500" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Connect your personal banking</h2>
        <p className="text-sm text-gray-500 mb-6">
          Link Nationwide and Halifax securely via TrueLayer to see balances and recent transactions here.
        </p>
        <a
          href="/api/truelayer/auth"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
        >
          <Link2 className="w-4 h-4" />
          Connect with TrueLayer
        </a>
      </div>
    )
  }

  const accounts = data.accounts || []
  const total = accounts.reduce((s, a) => s + (a.balance ?? 0), 0)
  const active = accounts.find((a) => a.id === selectedAccount) || accounts[0]

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Personal Banking</h1>
          <p className="text-sm text-gray-500">
            Total across {accounts.length} account{accounts.length === 1 ? '' : 's'}:{' '}
            <span className="font-semibold text-gray-900">{fmtGBP(total)}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <a
            href="/api/truelayer/auth"
            className="text-xs text-gray-400 hover:text-gray-600 underline"
          >
            Reconnect
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map((acc) => (
          <button
            key={acc.id}
            onClick={() => setSelectedAccount(acc.id)}
            className={`text-left bg-white rounded-xl border p-4 transition-all ${
              active?.id === acc.id
                ? 'border-gray-900 shadow-sm'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Landmark className="w-4 h-4 text-indigo-500" />
              <span className="text-xs font-medium text-gray-500 truncate">
                {acc.provider || acc.type}
              </span>
            </div>
            <p className="text-sm font-medium text-gray-900 truncate">{acc.name}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {acc.balance != null ? fmtGBP(acc.balance, acc.currency) : '—'}
            </p>
            {acc.available != null && acc.available !== acc.balance && (
              <p className="text-xs text-gray-400 mt-0.5">
                {fmtGBP(acc.available, acc.currency)} available
              </p>
            )}
          </button>
        ))}
      </div>

      {active && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">
              Recent transactions · {active.name}
            </h2>
          </div>
          {active.transactions.length === 0 ? (
            <p className="px-4 py-8 text-sm text-gray-400 text-center">
              No transactions in the last 30 days
            </p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {active.transactions.map((t) => (
                <li key={t.id} className="px-4 py-2.5 flex items-center gap-3">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                      t.amount >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-50 text-gray-400'
                    }`}
                  >
                    {t.amount >= 0 ? (
                      <ArrowDownLeft className="w-3.5 h-3.5" />
                    ) : (
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 truncate">{t.description}</p>
                    <p className="text-[11px] text-gray-400">
                      {fmtDate(t.date)}
                      {t.category ? ` · ${t.category.toLowerCase().replace(/_/g, ' ')}` : ''}
                    </p>
                  </div>
                  <span
                    className={`text-sm font-medium ${
                      t.amount >= 0 ? 'text-emerald-600' : 'text-gray-900'
                    }`}
                  >
                    {t.amount >= 0 ? '+' : ''}
                    {fmtGBP(t.amount, t.currency)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <p className="text-[11px] text-gray-400 text-center">
        Personal accounts are kept separate from Flair business data.
      </p>
    </div>
  )
}
