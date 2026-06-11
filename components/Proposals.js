import { useState, useEffect, useCallback } from 'react'

const TYPE_META = {
  daily_report: { label: 'Daily Report', color: '#6b7280' },
  klaviyo_campaign: { label: 'Klaviyo Campaign', color: '#8b5cf6' },
  restock_alert: { label: 'Restock', color: '#dc2626' },
  meta_creative: { label: 'Meta Creative', color: '#3b82f6' },
  customer_response: { label: 'Customer Response', color: '#ea580c' },
}

const STATUS_STYLE = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-blue-50 text-blue-700 border-blue-200',
  rejected: 'bg-red-50 text-red-600 border-red-200',
  executed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
}

export default function Proposals() {
  const [proposals, setProposals] = useState([])
  const [filter, setFilter] = useState('pending')
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [report, setReport] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const url = filter === 'all' ? '/api/agent/proposals' : `/api/agent/proposals?status=${filter}`
      const res = await fetch(url)
      const json = await res.json()
      setProposals(json.proposals || [])
    } catch { /* ignore */ }
    setLoading(false)
  }, [filter])

  useEffect(() => { load() }, [load])

  async function review(id, status) {
    await fetch('/api/agent/proposals', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    load()
  }

  async function runReport() {
    setReport({ loading: true })
    const res = await fetch('/api/agent/daily-report')
    const json = await res.json()
    setReport(json)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Agent Proposals</h2>
          <p className="text-xs text-gray-400 mt-0.5">Drafts wait here for your approval — nothing executes without it</p>
        </div>
        <button onClick={runReport} className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 transition-colors">
          Run Daily Report
        </button>
      </div>

      {report && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm mb-4 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">📊 Daily Report</span>
            <button onClick={() => setReport(null)} className="text-gray-400 hover:text-gray-600">×</button>
          </div>
          <div className="px-4 py-3">
            {report.loading ? (
              <p className="text-sm text-gray-400">Pulling data from Shopify, checking stock...</p>
            ) : report.error ? (
              <p className="text-sm text-red-500">{report.error}</p>
            ) : (
              <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">{report.markdown}</pre>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center gap-1 mb-3">
        {['pending', 'approved', 'executed', 'rejected', 'all'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${filter === f ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
            {f}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {loading ? (
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-400">Loading...</div>
        ) : proposals.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
            <p className="text-sm text-gray-500 font-medium">No {filter !== 'all' ? filter : ''} proposals</p>
            <p className="text-xs text-gray-400 mt-1">When the agent drafts campaigns, restocks, or ad copy, they&apos;ll appear here for review.</p>
          </div>
        ) : (
          proposals.map(p => {
            const meta = TYPE_META[p.type] || { label: p.type, color: '#6b7280' }
            const isOpen = expanded === p.id
            return (
              <div key={p.id} className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-50" onClick={() => setExpanded(isOpen ? null : p.id)}>
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0" style={{ backgroundColor: meta.color + '15', color: meta.color }}>
                      {meta.label}
                    </span>
                    <span className="text-sm font-medium text-gray-800 truncate">{p.title}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${STATUS_STYLE[p.status]}`}>{p.status}</span>
                    <span className="text-[10px] text-gray-400">{new Date(p.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                  </div>
                </div>
                {isOpen && (
                  <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">
                    <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono mb-3 max-h-48 overflow-y-auto">{JSON.stringify(p.payload, null, 2)}</pre>
                    <div className="flex gap-2">
                      {p.status === 'pending' && (
                        <>
                          <button onClick={() => review(p.id, 'approved')} className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500">
                            ✓ Approve
                          </button>
                          <button onClick={() => review(p.id, 'rejected')} className="px-4 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-600 text-xs font-semibold hover:border-red-300 hover:text-red-600">
                            ✕ Reject
                          </button>
                        </>
                      )}
                      {p.status === 'approved' && (
                        <span className="text-xs text-blue-600 font-medium">Approved — agent will execute on next run</span>
                      )}
                      {p.status === 'executed' && p.executed_at && (
                        <span className="text-xs text-emerald-600 font-medium">Executed {new Date(p.executed_at).toLocaleString('en-GB')}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
