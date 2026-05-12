import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'

const STATUS = {
  out: { label: 'Out', dot: 'bg-rose-400', text: 'text-rose-300', bg: 'bg-rose-400/10' },
  critical: { label: 'Critical', dot: 'bg-rose-400', text: 'text-rose-300', bg: 'bg-rose-400/10' },
  low: { label: 'Low', dot: 'bg-amber-400', text: 'text-amber-300', bg: 'bg-amber-400/10' },
  ok: { label: 'OK', dot: 'bg-emerald-400', text: 'text-emerald-300', bg: 'bg-emerald-400/10' },
}

function KPI({ label, value, accent, index = 0 }) {
  const color = accent === 'rose' ? 'text-rose-300' : accent === 'amber' ? 'text-amber-300' : accent === 'emerald' ? 'text-emerald-300' : 'text-white'
  return (
    <div
      style={{ animationDelay: `${index * 40}ms` }}
      className="flex-1 min-w-[140px] rounded-2xl bg-white/[0.03] border border-white/[0.06] px-5 py-4 fade-up"
    >
      <div className="text-xs text-slate-400 font-medium">{label}</div>
      <div className={`text-2xl mt-1.5 tabular-nums font-mono ${color}`}>{value}</div>
    </div>
  )
}

export default function InventoryPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/dashboard/inventory')
      setData(await r.json())
    } catch (e) { setData({ error: e.message }) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const variants = (data?.variants || []).filter(v => filter === 'all' || v.status === filter || (filter === 'attention' && v.status !== 'ok'))

  return (
    <>
      <Head><title>Flair HQ — Inventory</title></Head>
      <style jsx global>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .fade-up { animation: fadeUp 0.6s ease-out both; }
      `}</style>
      <div className="min-h-screen bg-black text-white">
        <div className="border-b border-white/[0.06] px-6 py-5 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Inventory</h1>
            <p className="text-slate-400 text-sm mt-0.5">Stock levels + velocity (last {data?.days || 30} days)</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} disabled={loading} className="text-sm px-4 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-white">{loading ? 'Refreshing…' : 'Refresh'}</button>
            <Link href="/" className="text-sm px-4 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.10] text-slate-300 hover:text-white">← Jarvis</Link>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
          {loading && !data && <div className="text-slate-400 text-sm">Loading inventory…</div>}
          {data?.error && <div className="text-rose-300 text-sm">Error: {data.error}</div>}
          {data?.summary && (
            <>
              <div className="flex gap-3 flex-wrap">
                <KPI label="Total SKUs" value={data.summary.total} index={0} />
                <KPI label="Total units" value={data.summary.totalUnits.toLocaleString()} index={1} />
                <KPI label="Out of stock" value={data.summary.out} accent={data.summary.out > 0 ? 'rose' : 'emerald'} index={2} />
                <KPI label="Critical (<7d)" value={data.summary.critical} accent={data.summary.critical > 0 ? 'rose' : 'emerald'} index={3} />
                <KPI label="Low (<21d)" value={data.summary.low} accent={data.summary.low > 0 ? 'amber' : 'emerald'} index={4} />
                <KPI label="OK" value={data.summary.ok} accent="emerald" index={5} />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {[
                  { id: 'attention', label: `Needs attention (${data.summary.out + data.summary.critical + data.summary.low})` },
                  { id: 'out', label: `Out (${data.summary.out})` },
                  { id: 'critical', label: `Critical (${data.summary.critical})` },
                  { id: 'low', label: `Low (${data.summary.low})` },
                  { id: 'ok', label: `OK (${data.summary.ok})` },
                  { id: 'all', label: `All (${data.summary.total})` },
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setFilter(f.id)}
                    className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                      filter === f.id ? 'bg-white/[0.10] text-white' : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-white/[0.04] border-b border-white/[0.06]">
                    <tr className="text-left text-slate-400 text-xs">
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Product</th>
                      <th className="px-4 py-3 font-medium">SKU</th>
                      <th className="px-4 py-3 font-medium text-right">Stock</th>
                      <th className="px-4 py-3 font-medium text-right">Sold {data.days}d</th>
                      <th className="px-4 py-3 font-medium text-right">/day</th>
                      <th className="px-4 py-3 font-medium text-right">Days left</th>
                    </tr>
                  </thead>
                  <tbody>
                    {variants.map(v => {
                      const s = STATUS[v.status]
                      return (
                        <tr key={v.variantId} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full ${s.bg}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                              <span className={`text-xs ${s.text}`}>{s.label}</span>
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-white">{v.productTitle}</div>
                            {v.variantTitle && <div className="text-slate-400 text-xs">{v.variantTitle}</div>}
                          </td>
                          <td className="px-4 py-3 text-slate-400 text-xs font-mono">{v.sku || '—'}</td>
                          <td className="px-4 py-3 text-right tabular-nums font-mono text-white">{v.quantity}</td>
                          <td className="px-4 py-3 text-right tabular-nums font-mono text-slate-300">{v.sold30d}</td>
                          <td className="px-4 py-3 text-right tabular-nums font-mono text-slate-400">{v.dailyVelocity.toFixed(1)}</td>
                          <td className={`px-4 py-3 text-right tabular-nums font-mono ${v.status === 'out' ? 'text-rose-300' : v.status === 'critical' ? 'text-rose-300' : v.status === 'low' ? 'text-amber-300' : 'text-emerald-300'}`}>
                            {v.daysRemaining != null ? `${v.daysRemaining}d` : '∞'}
                          </td>
                        </tr>
                      )
                    })}
                    {variants.length === 0 && (
                      <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400 text-sm">No SKUs match this filter</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
