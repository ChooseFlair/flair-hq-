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
      <div className="flex items-center justify-center py-24 text-ink-faint">
        <RefreshCw className="w-5 h-5 animate-spin mr-2" />
        <span className="text-sm font-medium">Loading your accounts…</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-lg mx-auto mt-12 glass-strong rounded-3xl p-6 text-center border-red-200/60">
        <AlertCircle className="w-6 h-6 text-red-500 mx-auto mb-2" />
        <p className="text-sm text-red-600 font-medium mb-4">{error}</p>
        <button onClick={load} className="text-sm font-semibold text-red-600 underline">Try again</button>
      </div>
    )
  }

  if (!data?.connected) {
    return (
      <div className="max-w-lg mx-auto mt-12 glass-strong rounded-3xl p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center mx-auto mb-4">
          <Landmark className="w-7 h-7 text-indigo-500" />
        </div>
        <h2 className="text-lg font-extrabold text-ink mb-1">Connect your personal banking</h2>
        <p className="text-sm text-ink-soft mb-6">
          Link Nationwide and Halifax securely via TrueLayer to see balances and recent transactions here.
        </p>
        <a
          href="/api/truelayer/auth"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-full hover:bg-gray-800 transition-colors shadow-md"
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
          <h1 className="text-2xl font-extrabold text-ink">Personal Banking</h1>
          <p className="text-sm text-ink-soft">
            Total across {accounts.length} account{accounts.length === 1 ? '' : 's'}:{' '}
            <span className="font-bold text-ink">{fmtGBP(total)}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="glass-orb w-9 h-9 rounded-full flex items-center justify-center text-ink-soft hover:text-ink"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <a
            href="/api/truelayer/auth"
            className="text-xs text-ink-faint hover:text-ink-soft underline font-medium"
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
            className={`text-left glass-strong glass-hover rounded-3xl p-5 transition-all ${
              active?.id === acc.id ? 'ring-2 ring-gray-900/80' : ''
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                <Landmark className="w-4 h-4 text-indigo-500" />
              </div>
              <span className="text-xs font-semibold text-ink-faint truncate">
                {acc.provider || acc.type}
              </span>
            </div>
            <p className="text-sm font-semibold text-ink-soft truncate">{acc.name}</p>
            <p className="text-3xl font-extrabold text-ink mt-1 tracking-tight">
              {acc.balance != null ? fmtGBP(acc.balance, acc.currency) : '—'}
            </p>
            {acc.available != null && acc.available !== acc.balance && (
              <p className="text-xs text-ink-faint mt-0.5">
                {fmtGBP(acc.available, acc.currency)} available
              </p>
            )}
          </button>
        ))}
      </div>

      {active && (
        <div className="glass-strong rounded-3xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-white/50">
            <h2 className="text-sm font-bold text-ink">
              Recent transactions · {active.name}
            </h2>
          </div>
          {active.transactions.length === 0 ? (
            <p className="px-5 py-8 text-sm text-ink-faint text-center">
              No transactions in the last 30 days
            </p>
          ) : (
            <ul className="divide-y divide-white/40">
              {active.transactions.map((t) => (
                <li key={t.id} className="px-5 py-2.5 flex items-center gap-3 hover:bg-white/40 transition-colors">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      t.amount >= 0 ? 'bg-emerald-500/15 text-emerald-600' : 'bg-gray-500/10 text-ink-faint'
                    }`}
                  >
                    {t.amount >= 0 ? (
                      <ArrowDownLeft className="w-3.5 h-3.5" />
                    ) : (
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink truncate">{t.description}</p>
                    <p className="text-[11px] text-ink-faint">
                      {fmtDate(t.date)}
                      {t.category ? ` · ${t.category.toLowerCase().replace(/_/g, ' ')}` : ''}
                    </p>
                  </div>
                  <span
                    className={`text-sm font-bold ${
                      t.amount >= 0 ? 'text-emerald-600' : 'text-ink'
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

      <p className="text-[11px] text-ink-faint text-center">
        Personal accounts are kept separate from Flair business data.
      </p>
    </div>
  )
}
