import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { Wallet, Package, EyeOff, Sparkles, ExternalLink } from 'lucide-react'

const CATEGORIES = [
  { id: 'opex', label: 'OPEX', Icon: Wallet, color: 'emerald' },
  { id: 'inventory', label: 'Inventory', Icon: Package, color: 'amber' },
  { id: 'ignore', label: 'Ignore', Icon: EyeOff, color: 'slate' },
]
const COLOR_MAP = {
  emerald: { ring: 'border-emerald-400/40 bg-emerald-400/15 text-emerald-300', text: 'text-emerald-300' },
  amber: { ring: 'border-amber-400/40 bg-amber-400/15 text-amber-300', text: 'text-amber-300' },
  slate: { ring: 'border-slate-400/30 bg-slate-400/10 text-slate-300', text: 'text-slate-400' },
}

const fmtMoney = (n) => n == null ? '—' : `£${n.toFixed(2)}`

function KPI({ label, value, sub, color = 'default' }) {
  const c = color === 'emerald' ? 'text-emerald-300' : color === 'amber' ? 'text-amber-300' : color === 'slate' ? 'text-slate-300' : 'text-white'
  return (
    <div className="flex-1 min-w-[140px] rounded-2xl bg-white/[0.03] border border-white/[0.06] px-5 py-4">
      <div className="text-xs text-slate-400 font-medium">{label}</div>
      <div className={`text-2xl mt-1.5 tabular-nums font-mono ${c}`}>{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    </div>
  )
}

export default function OpexPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(90)
  const [filter, setFilter] = useState('all')
  const [saving, setSaving] = useState({}) // txId -> bool
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(`/api/opex/transactions?days=${days}`)
      const j = await r.json()
      setData(j)
    } catch (e) { setData({ error: e.message, transactions: [] }) }
    finally { setLoading(false) }
  }, [days])

  useEffect(() => { load() }, [load])

  async function categorise(tx, category) {
    setSaving(s => ({ ...s, [tx.transaction_id]: true }))
    try {
      const r = await fetch('/api/opex/categorize', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId: tx.transaction_id, category }),
      })
      if (r.ok) {
        // Optimistically update local state
        setData(d => ({
          ...d,
          transactions: d.transactions.map(t => t.transaction_id === tx.transaction_id ? { ...t, category, isOverride: true } : t),
          totals: recomputeTotals(d.transactions.map(t => t.transaction_id === tx.transaction_id ? { ...t, category, isOverride: true } : t)),
        }))
      }
    } finally {
      setSaving(s => ({ ...s, [tx.transaction_id]: false }))
    }
  }

  function recomputeTotals(txs) {
    return txs.reduce((acc, d) => {
      acc[d.category] = (Math.round(((acc[d.category] || 0) + d.amount) * 100) / 100)
      acc.counts[d.category] = (acc.counts[d.category] || 0) + 1
      return acc
    }, { opex: 0, inventory: 0, ignore: 0, total: txs.length, counts: { opex: 0, inventory: 0, ignore: 0 } })
  }

  const filtered = useMemo(() => {
    const txs = data?.transactions || []
    const lower = search.toLowerCase()
    return txs.filter(t => {
      if (filter !== 'all' && t.category !== filter) return false
      if (search && !(t.description || '').toLowerCase().includes(lower)) return false
      return true
    })
  }, [data, filter, search])

  return (
    <>
      <Head><title>Jarvis — OPEX</title></Head>
      <div className="min-h-screen bg-black text-white">
        <div className="border-b border-white/[0.06] px-6 py-5 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">OPEX review</h1>
            <p className="text-slate-400 text-sm mt-0.5">Categorise each Revolut debit — changes flow straight into /pnl</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {[30, 90, 180, 365].map(d => (
              <button key={d} onClick={() => setDays(d)}
                className={`text-xs px-3 py-1.5 rounded-full ${days === d ? 'bg-white/[0.10] text-white' : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'}`}>
                {d}d
              </button>
            ))}
            <Link href="/pnl" className="text-sm px-4 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.10] text-slate-300 hover:text-white">P&amp;L</Link>
            <Link href="/" className="text-sm px-4 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.10] text-slate-300 hover:text-white">← Jarvis</Link>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
          {loading && !data && <div className="text-slate-400 text-sm">Loading Revolut transactions…</div>}
          {data?.error && <div className="text-rose-300 text-sm">Error: {data.error}</div>}
          {!loading && data?.connected === false && <div className="text-amber-300 text-sm">Revolut not connected. Visit /api/revolut/auth.</div>}

          {data?.totals && (
            <div className="flex gap-3 flex-wrap">
              <KPI label="OPEX" value={fmtMoney(data.totals.opex)} sub={`${data.totals.counts.opex} txns`} color="emerald" />
              <KPI label="Inventory" value={fmtMoney(data.totals.inventory)} sub={`${data.totals.counts.inventory} txns`} color="amber" />
              <KPI label="Ignored" value={fmtMoney(data.totals.ignore)} sub={`${data.totals.counts.ignore} txns`} color="slate" />
              <KPI label="Total debits" value={data.totals.total} sub={`${days}d window`} />
            </div>
          )}

          {data?.transactions?.length > 0 && (
            <>
              <div className="flex items-center gap-3 flex-wrap">
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search description / counterparty…"
                  className="flex-1 min-w-[200px] bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-sky-400/50 focus:outline-none"
                />
                <div className="flex items-center gap-1">
                  {[
                    { id: 'all', label: `All (${data.transactions.length})` },
                    { id: 'opex', label: `OPEX (${data.totals.counts.opex})` },
                    { id: 'inventory', label: `Inventory (${data.totals.counts.inventory})` },
                    { id: 'ignore', label: `Ignored (${data.totals.counts.ignore})` },
                  ].map(f => (
                    <button key={f.id} onClick={() => setFilter(f.id)}
                      className={`text-xs px-3 py-1.5 rounded-full ${filter === f.id ? 'bg-white/[0.10] text-white' : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'}`}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-white/[0.04] border-b border-white/[0.06]">
                    <tr className="text-left text-slate-400 text-xs">
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium">Description</th>
                      <th className="px-4 py-3 font-medium text-right">Amount</th>
                      <th className="px-4 py-3 font-medium">Category</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(tx => (
                      <tr key={tx.transaction_id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                        <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                          {new Date(tx.date).toLocaleDateString('en-GB')}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-white text-sm truncate max-w-md">{tx.description || '(no description)'}</div>
                          {!tx.isOverride && tx.autoCategory && (
                            <div className="text-[10px] text-slate-500 mt-0.5 inline-flex items-center gap-1">
                              <Sparkles className="w-2.5 h-2.5" /> auto · {tx.autoCategory}
                            </div>
                          )}
                          {tx.isOverride && (
                            <div className="text-[10px] text-sky-400 mt-0.5">manual</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums text-white whitespace-nowrap">{fmtMoney(tx.amount)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {CATEGORIES.map(c => {
                              const active = tx.category === c.id
                              const cs = COLOR_MAP[c.color]
                              return (
                                <button
                                  key={c.id}
                                  onClick={() => categorise(tx, c.id)}
                                  disabled={saving[tx.transaction_id]}
                                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors inline-flex items-center gap-1 ${
                                    active ? cs.ring : 'border-white/10 text-slate-400 hover:text-white hover:bg-white/[0.06]'
                                  }`}
                                  title={c.label}
                                >
                                  <c.Icon className="w-3 h-3" strokeWidth={2} />
                                  <span className="hidden sm:inline">{c.label}</span>
                                </button>
                              )
                            })}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filtered.length === 0 && (
                      <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400 text-sm">No transactions match this filter</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <div className="text-xs text-slate-500">
            Reclassifications save instantly. The <Link href="/pnl" className="text-sky-400 hover:text-sky-300 inline-flex items-center gap-1">P&amp;L page <ExternalLink className="w-3 h-3" /></Link> picks them up on next load.
          </div>
        </div>
      </div>
    </>
  )
}
