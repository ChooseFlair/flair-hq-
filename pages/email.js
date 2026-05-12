import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'

const RANGES = [
  { id: '7d', label: '7d' },
  { id: '30d', label: '30d' },
  { id: '90d', label: '90d' },
  { id: 'mtd', label: 'MTD' },
  { id: 'ytd', label: 'YTD' },
]

const fmtMoney = (n) => n == null ? '—' : Math.abs(n) >= 1000 ? `£${(n/1000).toFixed(1)}k` : `£${n.toFixed(0)}`
const fmtInt = (n) => n == null ? '—' : n.toLocaleString()
const fmtPct = (n) => n == null ? '—' : `${n.toFixed(1)}%`

function KPI({ label, value, sub, accent, index = 0 }) {
  const color = accent === 'emerald' ? 'text-emerald-300' : 'text-white'
  return (
    <div style={{ animationDelay: `${index * 40}ms` }}
      className="flex-1 min-w-[150px] rounded-2xl bg-white/[0.03] border border-white/[0.06] px-5 py-4 fade-up">
      <div className="text-xs text-slate-400 font-medium">{label}</div>
      <div className={`text-2xl mt-1.5 tabular-nums font-mono ${color}`}>{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    </div>
  )
}

function Table({ rows, type }) {
  if (!rows.length) return <div className="text-slate-400 text-sm py-8 text-center">No {type} data in this range</div>
  return (
    <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-white/[0.04] border-b border-white/[0.06]">
          <tr className="text-left text-slate-400 text-xs">
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium text-right">Recipients</th>
            <th className="px-4 py-3 font-medium text-right">Open %</th>
            <th className="px-4 py-3 font-medium text-right">Click %</th>
            <th className="px-4 py-3 font-medium text-right">Conv %</th>
            <th className="px-4 py-3 font-medium text-right">Revenue</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
              <td className="px-4 py-3">
                <div className="text-white">{r.name}</div>
                {r.trigger && <div className="text-xs text-slate-400">{r.trigger}</div>}
                {r.sendTime && <div className="text-xs text-slate-400">{new Date(r.sendTime).toLocaleDateString()}</div>}
              </td>
              <td className="px-4 py-3">
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  r.status === 'live' || r.status === 'Sent' ? 'bg-emerald-400/15 text-emerald-300'
                    : r.status === 'draft' ? 'bg-slate-400/15 text-slate-300'
                    : 'bg-amber-400/15 text-amber-300'
                }`}>{r.status}</span>
              </td>
              <td className="px-4 py-3 text-right tabular-nums font-mono text-slate-300">{fmtInt(r.recipients)}</td>
              <td className="px-4 py-3 text-right tabular-nums font-mono text-slate-300">{fmtPct(r.openRate)}</td>
              <td className="px-4 py-3 text-right tabular-nums font-mono text-slate-300">{fmtPct(r.clickRate)}</td>
              <td className="px-4 py-3 text-right tabular-nums font-mono text-slate-300">{fmtPct(r.conversionRate)}</td>
              <td className="px-4 py-3 text-right tabular-nums font-mono text-emerald-300 font-medium">{fmtMoney(r.revenue)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function EmailPage() {
  const [range, setRange] = useState('30d')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('flows')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(`/api/dashboard/email-performance?range=${range}`)
      setData(await r.json())
    } catch (e) { setData({ error: e.message }) }
    finally { setLoading(false) }
  }, [range])

  useEffect(() => { load() }, [load])

  const t = data?.totals
  return (
    <>
      <Head><title>Flair HQ — Email</title></Head>
      <style jsx global>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .fade-up { animation: fadeUp 0.6s ease-out both; }
      `}</style>
      <div className="min-h-screen bg-black text-white">
        <div className="border-b border-white/[0.06] px-6 py-5 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Email</h1>
            <p className="text-slate-400 text-sm mt-0.5">Klaviyo flows + campaigns · {data?.label || '…'}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {RANGES.map(r => (
              <button key={r.id} onClick={() => setRange(r.id)}
                className={`text-xs px-3 py-1.5 rounded-full ${range === r.id ? 'bg-white/[0.10] text-white' : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'}`}>
                {r.label}
              </button>
            ))}
            <Link href="/" className="text-xs px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.10] text-slate-300 hover:text-white">← Jarvis</Link>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
          {loading && !data && <div className="text-slate-400 text-sm">Loading email performance…</div>}
          {data?.error && <div className="text-rose-300 text-sm">Error: {data.error}</div>}
          {data?.errors?.length > 0 && (
            <div className="px-3 py-2 rounded-lg bg-amber-400/10 text-amber-300 text-xs">
              Some data couldn&apos;t be fetched: {data.errors.join(' · ')}
            </div>
          )}
          {!data?.reportsAvailable && t && (
            <div className="px-3 py-2 rounded-lg bg-slate-400/10 text-slate-300 text-xs">
              Revenue / engagement metrics need Klaviyo Reports API access. List view is available; revenue columns may be 0.
            </div>
          )}
          {t && (
            <>
              <div className="flex gap-3 flex-wrap">
                <KPI label="Email revenue" value={fmtMoney(t.totalRevenue)} sub="flows + campaigns" accent="emerald" index={0} />
                <KPI label="Flow revenue" value={fmtMoney(t.flowRevenue)} sub={`${t.flowCount} live`} index={1} />
                <KPI label="Campaign revenue" value={fmtMoney(t.campaignRevenue)} sub={`${t.campaignCount} sent`} index={2} />
                <KPI label="Flow conversions" value={fmtInt(t.flowConversions)} index={3} />
                <KPI label="Campaign conversions" value={fmtInt(t.campaignConversions)} index={4} />
              </div>

              <div className="flex items-center gap-2">
                <button onClick={() => setTab('flows')} className={`text-sm px-4 py-1.5 rounded-full ${tab === 'flows' ? 'bg-white/[0.10] text-white' : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'}`}>
                  Flows ({data.flows.length})
                </button>
                <button onClick={() => setTab('campaigns')} className={`text-sm px-4 py-1.5 rounded-full ${tab === 'campaigns' ? 'bg-white/[0.10] text-white' : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'}`}>
                  Campaigns ({data.campaigns.length})
                </button>
              </div>

              {tab === 'flows' && <Table rows={data.flows} type="flow" />}
              {tab === 'campaigns' && <Table rows={data.campaigns} type="campaign" />}
            </>
          )}
        </div>
      </div>
    </>
  )
}
