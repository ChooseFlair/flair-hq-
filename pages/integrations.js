import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'

const STATUS_STYLES = {
  ok: { color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/30', label: 'OK' },
  stale: { color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/30', label: 'STALE' },
  very_stale: { color: 'text-rose-400', bg: 'bg-rose-400/10', border: 'border-rose-400/30', label: 'VERY STALE' },
  never_synced: { color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/30', label: 'NEVER SYNCED' },
  not_configured: { color: 'text-rose-400', bg: 'bg-rose-400/10', border: 'border-rose-400/30', label: 'NOT CONFIGURED' },
  needs_auth: { color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/30', label: 'NEEDS OAUTH' },
}

function StatusBadge({ status, reason }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.never_synced
  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border ${s.border} ${s.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.color.replace('text-', 'bg-')}`} />
      <span className={`text-[10px] font-mono tracking-wider ${s.color}`}>{s.label}</span>
      <span className="text-cyan-500/40 text-[10px] font-mono">{reason}</span>
    </div>
  )
}

function ConnectorCard({ connector, onSync }) {
  const [syncing, setSyncing] = useState(false)
  const [response, setResponse] = useState(null)
  const [error, setError] = useState(null)

  async function runSync() {
    if (syncing || !connector.syncPath) return
    setSyncing(true)
    setError(null)
    setResponse(null)
    try {
      const res = await fetch(connector.syncPath, { method: connector.syncMethod || 'GET' })
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
    <div className="border border-cyan-500/15 rounded-lg bg-cyan-500/[0.02] p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="text-cyan-100 font-mono text-base tracking-wider">{connector.name.toUpperCase()}</h3>
            <StatusBadge status={connector.status} reason={connector.statusReason} />
          </div>
          <p className="text-cyan-500/50 text-xs mt-1 font-mono">{connector.description}</p>
        </div>

        {connector.syncPath && (
          <button
            onClick={runSync}
            disabled={syncing}
            className={`text-[10px] font-mono px-3 py-1.5 rounded border tracking-wider transition-all ${
              syncing
                ? 'border-cyan-400/30 text-cyan-400/60 bg-cyan-400/5'
                : 'border-cyan-400/40 text-cyan-300 bg-cyan-400/10 hover:bg-cyan-400/20 hover:border-cyan-400/60'
            }`}
          >
            {syncing ? (
              <span className="inline-flex items-center gap-1.5">
                <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" strokeWidth="3" opacity="0.3" />
                  <path strokeWidth="3" strokeLinecap="round" d="M22 12a10 10 0 00-10-10" />
                </svg>
                SYNCING...
              </span>
            ) : 'SYNC NOW'}
          </button>
        )}
      </div>

      {connector.envVars.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {connector.envVars.map(v => (
            <div key={v.name} className={`flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded border ${
              v.present ? 'border-emerald-400/30 bg-emerald-400/5 text-emerald-400' : 'border-rose-400/30 bg-rose-400/5 text-rose-400'
            }`}>
              <span>{v.present ? '✓' : '✗'}</span>
              <span>{v.name}</span>
              {v.alt && !v.present && <span className="text-cyan-500/40">(or {v.alt})</span>}
            </div>
          ))}
        </div>
      )}

      {connector.requiresOAuth && (
        <div className="mt-2">
          <a
            href={connector.requiresOAuth}
            className="text-[10px] font-mono text-cyan-400 hover:text-cyan-200 underline tracking-wider"
          >
            {connector.oauthDone ? 'RECONNECT OAUTH' : 'COMPLETE OAUTH SETUP →'}
          </a>
        </div>
      )}

      {connector.lastSync && (
        <div className="mt-2 text-[10px] font-mono text-cyan-500/40">
          Last sync: {new Date(connector.lastSync).toLocaleString()}
        </div>
      )}

      {(response || error || connector.lastResult) && (
        <div className="mt-3 pt-3 border-t border-cyan-500/10">
          <div className="text-[9px] font-mono text-cyan-500/50 tracking-widest mb-1">
            {response ? `HTTP ${response.httpStatus} RESPONSE` : error ? 'ERROR' : 'LAST RESULT'}
          </div>
          <pre className="text-[10px] font-mono text-cyan-200/70 bg-black/40 border border-cyan-500/10 rounded p-2 overflow-x-auto whitespace-pre-wrap break-all max-h-48">
            {error || JSON.stringify(response?.body || connector.lastResult, null, 2)}
          </pre>
        </div>
      )}

      {connector.setupUrl && (
        <div className="mt-2">
          <a
            href={connector.setupUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-mono text-cyan-500/40 hover:text-cyan-300 tracking-wider"
          >
            SETUP DOCS →
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
        <title>Flair HQ - Integrations</title>
      </Head>
      <div className="min-h-screen bg-black text-cyan-200">
        <div className="border-b border-cyan-500/10 px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-cyan-300 font-mono text-sm tracking-[0.3em] uppercase">Integrations</h1>
            <p className="text-cyan-500/40 text-[10px] font-mono tracking-widest">CONNECTOR HEALTH &amp; SETUP</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={syncAll}
              disabled={bulkSyncing}
              className={`text-[10px] font-mono px-3 py-1.5 rounded border tracking-wider transition-all ${
                bulkSyncing
                  ? 'border-cyan-400/30 text-cyan-400/60'
                  : 'border-cyan-400/40 text-cyan-300 hover:bg-cyan-400/10'
              }`}
            >
              {bulkSyncing ? 'SYNCING ALL...' : 'SYNC ALL'}
            </button>
            <Link
              href="/"
              className="text-[10px] font-mono px-3 py-1.5 rounded border border-cyan-500/15 text-cyan-400/70 hover:text-cyan-200 hover:border-cyan-400/40 tracking-wider"
            >
              ← JARVIS
            </Link>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-6 py-6">
          {loading && !data && <div className="text-cyan-500/40 font-mono text-sm">Loading...</div>}
          {data?.error && <div className="text-rose-400 font-mono text-sm">Error: {data.error}</div>}
          {data?.connectors && (
            <div className="space-y-3">
              {data.connectors.map(c => (
                <ConnectorCard key={c.name} connector={c} onSync={load} />
              ))}
            </div>
          )}
          <div className="mt-6 text-[10px] font-mono text-cyan-500/30 tracking-wider">
            Env vars are configured in Vercel → Settings → Environment Variables. After saving, redeploy for changes to take effect.
          </div>
        </div>
      </div>
    </>
  )
}
