import { useState, useEffect, useCallback } from 'react'

const RANGES = [
  { id: 'today', label: 'TODAY' },
  { id: 'yesterday', label: 'YDAY' },
  { id: '7d', label: '7D' },
  { id: '30d', label: '30D' },
  { id: 'mtd', label: 'MTD' },
]

const fmtMoney = (n) => {
  if (n == null) return '—'
  if (Math.abs(n) >= 1000) return `£${(n / 1000).toFixed(1)}k`
  return `£${n.toFixed(2)}`
}
const fmtInt = (n) => (n == null ? '—' : n.toLocaleString())

function StatusDot({ status }) {
  const color = status === 'ok' ? 'bg-emerald-400' : status === 'warn' ? 'bg-amber-400' : 'bg-rose-400'
  return <span className={`inline-block w-1.5 h-1.5 rounded-full ${color}`} />
}

function Stat({ label, value, hint, index = 0 }) {
  return (
    <div
      style={{ animationDelay: `${index * 60}ms` }}
      className="flex-1 min-w-[110px] border border-cyan-500/15 rounded-lg bg-cyan-500/[0.02] px-3 py-2 hover:border-cyan-400/40 hover:bg-cyan-500/[0.06] hover:-translate-y-0.5 hover:shadow-md hover:shadow-cyan-400/10 transition-all duration-200 fade-up"
    >
      <div className="text-[9px] font-mono tracking-[0.2em] text-cyan-300">{label}</div>
      <div className="text-cyan-100 font-mono text-base mt-0.5 transition-colors">{value}</div>
      {hint && <div className="text-[9px] font-mono text-cyan-400/70 mt-0.5">{hint}</div>}
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
      const [sumRes, statusRes] = await Promise.all([
        fetch(`/api/dashboard/summary?range=${r}`),
        fetch('/api/dashboard/connector-status'),
      ])
      const sumJson = await sumRes.json()
      const statusJson = await statusRes.json()
      setData(sumJson)
      setConnectors((statusJson.connectors || []).map(c => ({
        name: c.name.toUpperCase(),
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
    setSyncMsg(connector ? `${connector}...` : 'Syncing...')
    const pendingNames = connector ? [connector] : ['Shopify', 'Klaviyo', 'Meta', 'PayPal', 'Revolut']
    setSyncProgress(pendingNames.map(n => ({ name: n, status: 'syncing' })))
    try {
      const url = connector ? `/api/dashboard/resync?connector=${connector.toLowerCase()}` : '/api/dashboard/resync'
      const res = await fetch(url, { method: 'POST' })
      const json = await res.json()
      setSyncProgress(json.results || [])
      const okCount = (json.results || []).filter(r => r.status === 'ok').length
      const total = (json.results || []).length
      setSyncMsg(okCount === total ? 'Synced ✓' : `${okCount}/${total}`)
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
    <div className="relative z-30 px-4 pt-2 pb-1 border-b border-cyan-500/10 bg-black/40 backdrop-blur-sm">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1">
            {RANGES.map(r => (
              <button
                key={r.id}
                onClick={() => setRange(r.id)}
                className={`text-[10px] font-mono px-2.5 py-1 rounded border transition-all tracking-wider ${
                  range === r.id
                    ? 'border-cyan-400/50 bg-cyan-400/10 text-cyan-200'
                    : 'border-cyan-500/10 text-cyan-300/80 hover:text-cyan-300 hover:border-cyan-400/30'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-[9px] font-mono">
              {connectors.map(c => {
                const prog = syncProgress?.find(p => p.name.toUpperCase() === c.name)
                const isLoading = prog?.status === 'syncing'
                const showStatus = prog?.status === 'ok' ? 'ok' : prog?.status === 'error' ? 'error' : prog?.status === 'partial' ? 'warn' : prog?.status === 'not_configured' ? 'warn' : c.status
                const titleText = prog?.message || prog?.status || c.detail || ''
                return (
                  <button
                    key={c.name}
                    onClick={() => !syncing && resync(c.name.charAt(0) + c.name.slice(1).toLowerCase())}
                    disabled={syncing}
                    className="flex items-center gap-1 hover:opacity-80 transition-opacity disabled:cursor-wait"
                    title={`${titleText} — click to resync just this`}
                  >
                    {isLoading ? (
                      <svg className="w-2 h-2 animate-spin text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" strokeWidth="3" opacity="0.3" />
                        <path strokeWidth="3" strokeLinecap="round" d="M22 12a10 10 0 00-10-10" />
                      </svg>
                    ) : (
                      <StatusDot status={showStatus} />
                    )}
                    <span className={
                      showStatus === 'ok' ? 'text-emerald-300'
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
              className={`flex items-center gap-1.5 text-[10px] font-mono px-2.5 py-1 rounded border transition-all tracking-wider ${
                syncing
                  ? 'border-cyan-400/30 text-cyan-400/60'
                  : 'border-cyan-500/15 text-cyan-400/70 hover:text-cyan-200 hover:border-cyan-400/40 hover:bg-cyan-400/5'
              }`}
              title="Resync all connectors"
            >
              <svg className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {syncMsg || 'RESYNC'}
            </button>

            <button
              onClick={() => setExpanded(e => !e)}
              className="text-cyan-300/80 hover:text-cyan-300 transition-colors p-1"
              title={expanded ? 'Collapse' : 'Expand'}
            >
              <svg className={`w-3 h-3 transition-transform ${expanded ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
          </div>
        </div>

        <div className={`overflow-hidden transition-all duration-300 ${expanded ? 'max-h-40 mt-2' : 'max-h-0'}`}>
          <div className="flex gap-2 flex-wrap">
            <Stat label="REVENUE" value={loading ? '...' : fmtMoney(data?.revenue)} index={0} />
            <Stat label="ORDERS" value={loading ? '...' : fmtInt(data?.orderCount)} index={1} />
            <Stat label="CUSTOMERS" value={loading ? '...' : fmtInt(data?.customerCount)} index={2} />
            <Stat label="AOV" value={loading ? '...' : fmtMoney(data?.aov)} index={3} />
            <Stat label="AD SPEND" value={loading ? '...' : fmtMoney(data?.adSpend)} index={4} />
            <Stat label="ROAS" value={loading ? '...' : (data?.roas ? `${data.roas.toFixed(2)}x` : '—')} index={5} />
          </div>

          {hasIssues && (
            <div className="mt-2 flex items-start gap-2 px-2.5 py-1.5 border border-rose-500/20 rounded bg-rose-500/[0.04]">
              <svg className="w-3 h-3 text-rose-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-[10px] font-mono text-rose-300/80">
                {issues.map((i, idx) => (
                  <div key={idx}><span className="text-rose-400/90">{i.name}:</span> {i.message}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
