import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'

const STATUS_STYLES = {
  ok: { color: 'text-emerald-300', bg: 'bg-emerald-400/10', dot: 'bg-emerald-400', label: 'OK' },
  stale: { color: 'text-amber-300', bg: 'bg-amber-400/10', dot: 'bg-amber-400', label: 'Stale' },
  very_stale: { color: 'text-rose-300', bg: 'bg-rose-400/10', dot: 'bg-rose-400', label: 'Very stale' },
  never_synced: { color: 'text-amber-300', bg: 'bg-amber-400/10', dot: 'bg-amber-400', label: 'Never synced' },
  not_configured: { color: 'text-rose-300', bg: 'bg-rose-400/10', dot: 'bg-rose-400', label: 'Not configured' },
  needs_auth: { color: 'text-amber-300', bg: 'bg-amber-400/10', dot: 'bg-amber-400', label: 'Needs OAuth' },
}

function StatusBadge({ status, reason }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.never_synced
  return (
    <div className={`inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full ${s.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      <span className={`text-xs ${s.color} font-medium`}>{s.label}</span>
      {reason && <span className="text-slate-400 text-xs">{reason}</span>}
    </div>
  )
}

function ConnectorCard({ connector, onSync }) {
  const [syncing, setSyncing] = useState(false)
  const [response, setResponse] = useState(null)
  const [error, setError] = useState(null)

  async function runSync() {
    if (syncing) return
    setSyncing(true)
    setError(null)
    setResponse(null)
    try {
      const res = await fetch(`/api/dashboard/resync?connector=${encodeURIComponent(connector.name)}`, { method: 'POST' })
      const text = await res.text()
      let json = null
      try { json = JSON.parse(text) } catch { json = { raw: text } }
      setResponse({ httpStatus: res.status, body: json })
      onSync?.()
    } catch (e) {
      setError(e.message)
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5 hover:border-white/[0.10] transition-colors">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="text-white text-lg font-semibold tracking-tight">{connector.name}</h3>
            <StatusBadge status={connector.status} reason={connector.statusReason} />
          </div>
          <p className="text-slate-400 text-sm mt-1.5">{connector.description}</p>
        </div>

        {connector.status !== 'not_configured' && (
          <button
            onClick={runSync}
            disabled={syncing}
            className={`text-sm px-4 py-1.5 rounded-full transition-colors ${
              syncing
                ? 'bg-white/[0.04] text-slate-400'
                : 'bg-white/[0.08] hover:bg-white/[0.14] text-white'
            }`}
          >
            {syncing ? (
              <span className="inline-flex items-center gap-2">
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" strokeWidth="3" opacity="0.3" />
                  <path strokeWidth="3" strokeLinecap="round" d="M22 12a10 10 0 00-10-10" />
                </svg>
                Syncing…
              </span>
            ) : 'Test'}
          </button>
        )}
      </div>

      {connector.envVars?.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {connector.envVars.map(v => (
            <div key={v.name} className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${
              v.present ? 'bg-emerald-400/10 text-emerald-300' : 'bg-rose-400/10 text-rose-300'
            }`}>
              <span className="font-medium">{v.present ? '✓' : '✗'}</span>
              <code className="font-mono text-xs">{v.name}</code>
              {v.alt && !v.present && <span className="text-slate-400">or {v.alt}</span>}
            </div>
          ))}
        </div>
      )}

      {(response || error) && (
        <div className="mt-4 pt-4 border-t border-white/[0.06]">
          <div className="text-xs text-slate-400 mb-2">
            {response ? `Response · HTTP ${response.httpStatus}` : 'Error'}
          </div>
          <pre className="text-xs font-mono text-slate-200 bg-black/40 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all max-h-56 leading-relaxed">
            {error || JSON.stringify(response?.body, null, 2)}
          </pre>
        </div>
      )}

      {connector.setupUrl && (
        <div className="mt-3">
          <a
            href={connector.setupUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-sky-400 hover:text-sky-300 inline-flex items-center gap-1"
          >
            Setup docs <span aria-hidden>↗</span>
          </a>
        </div>
      )}
    </div>
  )
}

export default function IntegrationsPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [bulkSyncing, setBulkSyncing] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/dashboard/connector-status')
      setData(await res.json())
    } catch (e) {
      setData({ error: e.message })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function syncAll() {
    if (bulkSyncing) return
    setBulkSyncing(true)
    try {
      await fetch('/api/dashboard/resync', { method: 'POST' })
      await load()
    } finally {
      setBulkSyncing(false)
    }
  }

  return (
    <>
      <Head>
        <title>Flair HQ — Integrations</title>
      </Head>
      <div className="min-h-screen bg-black text-white">
        <div className="border-b border-white/[0.06] px-6 py-5 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-white text-xl font-semibold tracking-tight">Integrations</h1>
            <p className="text-slate-400 text-sm mt-0.5">Connector health &amp; setup</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={syncAll}
              disabled={bulkSyncing}
              className={`text-sm px-4 py-1.5 rounded-full transition-colors ${
                bulkSyncing
                  ? 'bg-white/[0.04] text-slate-400'
                  : 'bg-white/[0.08] hover:bg-white/[0.14] text-white'
              }`}
            >
              {bulkSyncing ? 'Syncing all…' : 'Sync all'}
            </button>
            <Link
              href="/"
              className="text-sm px-4 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.10] text-slate-300 hover:text-white"
            >
              ← Jarvis
            </Link>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-6 py-8">
          {loading && !data && <div className="text-slate-400 text-sm">Loading…</div>}
          {data?.error && <div className="text-rose-300 text-sm">Error: {data.error}</div>}
          {data?.connectors && (
            <div className="space-y-3">
              {data.connectors.map(c => (
                <ConnectorCard key={c.name} connector={c} onSync={load} />
              ))}
            </div>
          )}
          <div className="mt-8 text-xs text-slate-500">
            Env vars are configured in Vercel → Settings → Environment Variables. After saving, redeploy for changes to take effect.
          </div>
        </div>
      </div>
    </>
  )
}
