import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'
import { Eye, EyeOff, Copy, Check, Plus, Trash2, Pencil, ExternalLink } from 'lucide-react'

function CopyBtn({ value, label }) {
  const [copied, setCopied] = useState(false)
  if (!value) return null
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value)
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        } catch {}
      }}
      title={`Copy ${label}`}
      className="p-1 rounded hover:bg-white/[0.08] text-slate-400 hover:text-white"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  )
}

function PasswordCell({ value }) {
  const [show, setShow] = useState(false)
  if (!value) return <span className="text-slate-500">—</span>
  return (
    <div className="flex items-center gap-2">
      <code className="font-mono text-sm text-white">{show ? value : '•'.repeat(Math.min(value.length, 14))}</code>
      <button
        onClick={() => setShow(s => !s)}
        className="p-1 rounded hover:bg-white/[0.08] text-slate-400 hover:text-white"
        title={show ? 'Hide' : 'Reveal'}
      >
        {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
      </button>
      <CopyBtn value={value} label="password" />
    </div>
  )
}

const EMPTY = { platform: '', url: '', email: '', password: '', notes: '' }

export default function AccountsPage() {
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null) // id of row being edited or 'new'
  const [draft, setDraft] = useState(EMPTY)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/accounts')
      const j = await r.json()
      setAccounts(j.accounts || [])
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  function startNew() {
    setDraft(EMPTY)
    setEditing('new')
  }
  function startEdit(a) {
    setDraft({ platform: a.platform || '', url: a.url || '', email: a.email || '', password: a.password || '', notes: a.notes || '' })
    setEditing(a.id)
  }
  function cancel() {
    setEditing(null)
    setDraft(EMPTY)
    setError(null)
  }

  async function save() {
    setError(null)
    try {
      if (editing === 'new') {
        const r = await fetch('/api/accounts', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(draft),
        })
        const j = await r.json()
        if (!r.ok) return setError(j.error || `HTTP ${r.status}`)
      } else {
        const r = await fetch(`/api/accounts/${editing}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(draft),
        })
        const j = await r.json()
        if (!r.ok) return setError(j.error || `HTTP ${r.status}`)
      }
      cancel()
      await load()
    } catch (e) { setError(e.message) }
  }

  async function remove(id) {
    if (!confirm('Delete this account entry?')) return
    try {
      const r = await fetch(`/api/accounts/${id}`, { method: 'DELETE' })
      if (!r.ok) {
        const j = await r.json()
        setError(j.error)
      } else {
        await load()
      }
    } catch (e) { setError(e.message) }
  }

  return (
    <>
      <Head><title>Jarvis — Accounts</title></Head>
      <div className="min-h-screen bg-black text-white">
        <div className="border-b border-white/[0.06] px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Accounts</h1>
            <p className="text-slate-400 text-sm mt-0.5">Platform credentials &amp; notes</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={startNew}
              className="text-sm px-4 py-1.5 rounded-full bg-sky-500/90 hover:bg-sky-500 text-white font-medium inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={2} /> Add account
            </button>
            <Link href="/" className="text-sm px-4 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.10] text-slate-300 hover:text-white">← Jarvis</Link>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-4">
          {error && <div className="rounded-lg bg-rose-400/10 text-rose-300 px-4 py-3 text-sm">{error}</div>}
          {loading && !accounts.length && <div className="text-slate-400 text-sm">Loading…</div>}

          {editing === 'new' && (
            <EditForm draft={draft} setDraft={setDraft} onSave={save} onCancel={cancel} />
          )}

          {accounts.length > 0 && (
            <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] overflow-x-auto">
              <table className="w-full text-sm min-w-[720px]">
                <thead className="bg-white/[0.04] border-b border-white/[0.06]">
                  <tr className="text-left text-slate-400 text-xs">
                    <th className="px-4 py-3 font-medium">Platform</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Password</th>
                    <th className="px-4 py-3 font-medium">Notes</th>
                    <th className="px-4 py-3 font-medium w-24"></th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map(a => editing === a.id ? (
                    <tr key={a.id} className="border-b border-white/[0.04]">
                      <td colSpan={5} className="px-4 py-4">
                        <EditForm draft={draft} setDraft={setDraft} onSave={save} onCancel={cancel} inline />
                      </td>
                    </tr>
                  ) : (
                    <tr key={a.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                      <td className="px-4 py-3">
                        <div className="text-white font-medium">{a.platform}</div>
                        {a.url && (
                          <a href={a.url.startsWith('http') ? a.url : `https://${a.url}`} target="_blank" rel="noopener noreferrer" className="text-xs text-sky-400 hover:text-sky-300 inline-flex items-center gap-1">
                            {a.url} <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {a.email ? (
                          <div className="flex items-center gap-2">
                            <span className="text-slate-200">{a.email}</span>
                            <CopyBtn value={a.email} label="email" />
                          </div>
                        ) : <span className="text-slate-500">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <PasswordCell value={a.password} />
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{a.notes || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => startEdit(a)} className="p-1.5 rounded hover:bg-white/[0.08] text-slate-400 hover:text-white" title="Edit">
                            <Pencil className="w-3.5 h-3.5" strokeWidth={1.75} />
                          </button>
                          <button onClick={() => remove(a.id)} className="p-1.5 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-300" title="Delete">
                            <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="text-xs text-slate-500 pt-2">
            Passwords are stored as plaintext in Supabase, protected only by the dashboard login. Use a real password manager for anything critical.
          </div>
        </div>
      </div>
    </>
  )
}

function EditForm({ draft, setDraft, onSave, onCancel, inline = false }) {
  const set = (k, v) => setDraft(d => ({ ...d, [k]: v }))
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-3 ${inline ? '' : 'rounded-2xl bg-white/[0.04] border border-white/[0.08] p-5'}`}>
      <Field label="Platform">
        <input value={draft.platform} onChange={e => set('platform', e.target.value)} placeholder="Shopify" />
      </Field>
      <Field label="URL">
        <input value={draft.url} onChange={e => set('url', e.target.value)} placeholder="https://..." />
      </Field>
      <Field label="Email">
        <input value={draft.email} onChange={e => set('email', e.target.value)} placeholder="you@example.com" />
      </Field>
      <Field label="Password">
        <input value={draft.password} onChange={e => set('password', e.target.value)} placeholder="••••" />
      </Field>
      <Field label="Notes" full>
        <textarea value={draft.notes} onChange={e => set('notes', e.target.value)} rows={2} placeholder="2FA notes, recovery codes, etc." />
      </Field>
      <div className="md:col-span-2 flex justify-end gap-2">
        <button onClick={onCancel} className="text-sm px-4 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.10] text-slate-300 hover:text-white">Cancel</button>
        <button onClick={onSave} className="text-sm px-4 py-1.5 rounded-full bg-sky-500/90 hover:bg-sky-500 text-white font-medium">Save</button>
      </div>
    </div>
  )
}

function Field({ label, children, full }) {
  return (
    <label className={`block ${full ? 'md:col-span-2' : ''}`}>
      <span className="text-xs text-slate-400 font-medium block mb-1">{label}</span>
      <div className="[&_input]:w-full [&_input]:bg-white/[0.04] [&_input]:border [&_input]:border-white/10 [&_input]:rounded-lg [&_input]:px-3 [&_input]:py-2 [&_input]:text-white [&_input]:text-sm [&_input]:focus:border-sky-400/50 [&_input]:focus:outline-none [&_textarea]:w-full [&_textarea]:bg-white/[0.04] [&_textarea]:border [&_textarea]:border-white/10 [&_textarea]:rounded-lg [&_textarea]:px-3 [&_textarea]:py-2 [&_textarea]:text-white [&_textarea]:text-sm [&_textarea]:focus:border-sky-400/50 [&_textarea]:focus:outline-none">
        {children}
      </div>
    </label>
  )
}
