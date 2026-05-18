import { useState, useEffect, useCallback } from 'react'

const RANGES = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: '7d', label: '7d' },
  { id: '30d', label: '30d' },
  { id: 'mtd', label: 'MTD' },
]

const fmtMoney = (n) => {
  if (n == null) return '—'
  if (Math.abs(n) >= 1000) return `£${(n / 1000).toFixed(1)}k`
  return `£${n.toFixed(2)}`
}
const fmtInt = (n) => (n == null ? '—' : n.toLocaleString())

function daysInRange(r) {
  if (r === '7d') return 7
  if (r === '30d') return 30
  if (r === 'mtd') return new Date().getDate()
  return 1
}

function StatusDot({ status }) {
  const color = status === 'ok' ? 'bg-emerald-400' : status === 'warn' ? 'bg-amber-400' : 'bg-rose-400'
  return <span className={`inline-block w-1.5 h-1.5 rounded-full ${color}`} />
}

function Stat({ label, value, index = 0 }) {
  return (
    <div
      style={{ animationDelay: `${index * 60}ms` }}
      className="flex-1 basis-[44%] sm:basis-auto min-w-[44%] sm:min-w-[120px] rounded-xl bg-white/[0.03] border border-white/[0.06] px-3 sm:px-4 py-3 hover:bg-white/[0.06] hover:border-white/[0.12] hover:-translate-y-0.5 transition-all duration-200 fade-up"
    >
      <div className="text-xs text-slate-400 font-medium">{label}</div>
      <div className="text-white text-xl mt-1 tabular-nums font-mono">{value}</div>
    </div>
  )
}

export default function DashboardWidgets() {
  const [range, setRange] = useState('today')
  const [data, setData] = useState(null)
  const [connectors, setConnectors] = useState([])
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')
  const [syncProgress, setSyncProgress] = useState(null)
  const [expanded, setExpanded] = useState(true)

  const load = useCallback(async (r) => {
    setLoading(true)
    try {
      const [sumRes, statusRes, cashRes, pnlRes] = await Promise.all([
        fetch(`/api/dashboard/summary?range=${r}`),
        fetch('/api/dashboard/connector-status'),
        fetch('/api/dashboard/cash'),
        fetch(`/api/pnl-live?range=${r}&compare=false`),
      ])
      const sumJson = await sumRes.json()
      const statusJson = await statusRes.json()
      const cashJson = await cashRes.json()
      const pnlJson = await pnlRes.json()
      setData({ ...sumJson, cash: cashJson, pnl: pnlJson?.totals || null })
      setConnectors((statusJson.connectors || []).map(c => ({
        name: c.name,
        status: c.status === 'ok' ? 'ok' : c.status === 'not_configured' ? 'warn' : 'error',
        detail: c.statusReason || c.message || '',
      })))
    } catch (e) {
      setData({ error: e.message, issues: [{ name: 'API', status: 'error', message: e.message }] })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(range) }, [range, load])

  useEffect(() => {
    const onFocus = () => load(range)
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [range, load])

  async function resync(connector = null) {
    if (syncing) return
    setSyncing(true)
    setSyncMsg(connector ? `Syncing ${connector}…` : 'Syncing…')
    const pendingNames = connector ? [connector] : ['Shopify', 'Klaviyo', 'Meta', 'PayPal', 'Windsor']
    setSyncProgress(pendingNames.map(n => ({ name: n, status: 'syncing' })))
    try {
      const url = connector ? `/api/dashboard/resync?connector=${connector.toLowerCase()}` : '/api/dashboard/resync'
      const res = await fetch(url, { method: 'POST' })
      const json = await res.json()
      setSyncProgress(json.results || [])
      const okCount = (json.results || []).filter(r => r.status === 'ok').length
      const total = (json.results || []).length
      setSyncMsg(okCount === total ? 'Synced' : `${okCount}/${total}`)
      await load(range)
    } catch (e) {
      setSyncMsg('Failed')
      setSyncProgress(prev => (prev || []).map(p => ({ ...p, status: 'error', message: e.message })))
    } finally {
      setSyncing(false)
      setTimeout(() => { setSyncMsg(''); setSyncProgress(null) }, 6000)
    }
  }

  const issues = data?.issues || []
  const hasIssues = issues.length > 0

  return (
    <div className="relative z-30 px-4 sm:px-5 pt-3 pb-2 border-b border-white/[0.06] bg-black/40 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1">
            {RANGES.map(r => (
              <button
                key={r.id}
                onClick={() => setRange(r.id)}
                className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                  range === r.id
                    ? 'bg-white/[0.10] text-white'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-3 text-xs">
              {connectors.map(c => {
                const prog = syncProgress?.find(p => p.name.toLowerCase() === c.name.toLowerCase())
                const isLoading = prog?.status === 'syncing'
                const showStatus = prog?.status === 'ok' ? 'ok' : prog?.status === 'error' ? 'error' : prog?.status === 'partial' ? 'warn' : prog?.status === 'not_configured' ? 'warn' : c.status
                const titleText = prog?.message || c.detail || ''
                return (
                  <button
                    key={c.name}
                    onClick={() => !syncing && resync(c.name)}
                    disabled={syncing}
                    className="flex items-center gap-1.5 hover:opacity-80 disabled:cursor-wait"
                    title={`${titleText} — click to resync`}
                  >
                    {isLoading ? (
                      <svg className="w-2.5 h-2.5 animate-spin text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" strokeWidth="3" opacity="0.3" />
                        <path strokeWidth="3" strokeLinecap="round" d="M22 12a10 10 0 00-10-10" />
                      </svg>
                    ) : (
                      <StatusDot status={showStatus} />
                    )}
                    <span className={
                      showStatus === 'ok' ? 'text-slate-300'
                      : showStatus === 'warn' ? 'text-amber-300'
                      : 'text-rose-300'
                    }>{c.name}</span>
                  </button>
                )
              })}
            </div>

            <button
              onClick={() => resync()}
              disabled={syncing}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white"
              title="Resync all connectors"
            >
              <svg className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {syncMsg || 'Resync'}
            </button>

            <button
              onClick={() => setExpanded(e => !e)}
              className="text-slate-400 hover:text-white p-1"
              title={expanded ? 'Collapse' : 'Expand'}
            >
              <svg className={`w-4 h-4 transition-transform ${expanded ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
          </div>
        </div>

        <div className={`overflow-hidden transition-all duration-300 ${expanded ? 'max-h-[28rem] mt-3' : 'max-h-0'}`}>
          <div className="flex gap-3 flex-wrap">
            {(() => {
              const ebitda = data?.pnl?.profit?.ebitda
              const pct = data?.pnl?.profit?.ebitdaPct
              const pos = ebitda == null || ebitda >= 0
              return (
                <div
                  style={{ animationDelay: '0ms' }}
                  className={`flex-1 basis-[44%] sm:basis-auto min-w-[44%] sm:min-w-[140px] rounded-xl border px-3 sm:px-4 py-3 hover:-translate-y-0.5 transition-all duration-200 fade-up ${pos ? 'border-emerald-400/40 bg-emerald-400/[0.08]' : 'border-rose-400/40 bg-rose-400/[0.08]'}`}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <div className={`text-xs font-medium ${pos ? 'text-emerald-200' : 'text-rose-200'}`}>EBITDA</div>
                    {pct != null && (
                      <div className={`text-[10px] font-medium ${pos ? 'text-emerald-300/80' : 'text-rose-300/80'}`}>{pct.toFixed(1)}%</div>
                    )}
                  </div>
                  <div className={`text-xl mt-1 tabular-nums font-mono font-semibold ${pos ? 'text-emerald-100' : 'text-rose-100'}`}>
                    {loading ? '…' : fmtMoney(ebitda)}
                  </div>
                </div>
              )
            })()}
            <Stat label="Ad spend" value={loading ? '…' : fmtMoney(data?.adSpend)} index={1} />
            <Stat
              label="OpEx / mo"
              value={loading ? '…' : fmtMoney(data?.pnl?.costs?.opex != null ? data.pnl.costs.opex * (30 / daysInRange(range)) : null)}
              index={2}
            />
            <Stat label="COGS" value={loading ? '…' : fmtMoney(data?.pnl?.costs?.cogs)} index={3} />
            <Stat label="ROAS" value={loading ? '…' : (data?.roas ? `${data.roas.toFixed(2)}x` : '—')} index={4} />
          </div>

          {hasIssues && (
            <div className="mt-3 flex items-start gap-2 px-3 py-2 rounded-lg bg-rose-500/[0.08] border border-rose-500/20">
              <svg className="w-4 h-4 text-rose-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-xs text-rose-200">
                {issues.map((i, idx) => (
                  <div key={idx}><span className="text-rose-300 font-medium">{i.name}:</span> {i.message}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
