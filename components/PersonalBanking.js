import { useState, useEffect, useRef } from 'react'
import {
  Landmark, Upload, FileText, Trash2, Link2, AlertCircle, X,
  ArrowDownLeft, ArrowUpRight, Plus, CheckCircle2,
} from 'lucide-react'
import { parseBankCsv, currentBalance, netImported, mergeTransactions } from '../lib/parseBankCsv'

const STORAGE_KEY = 'flair_personal_accounts'

const BANKS = [
  { id: 'nationwide', name: 'Nationwide', color: '#003366' },
  { id: 'halifax', name: 'Halifax', color: '#005b99' },
  { id: 'other', name: 'Other', color: '#4a5b54' },
]

const fmtGBP = (n, currency = 'GBP') =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(n)

const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

export default function PersonalBanking() {
  const [accounts, setAccounts] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState(null)
  const [showImport, setShowImport] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setAccounts(parsed)
        if (parsed.length) setSelectedAccount(parsed[0].id)
      } catch {}
    }
    setLoaded(true)
  }, [])

  useEffect(() => {
    if (loaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts))
  }, [accounts, loaded])

  function saveImport({ name, bank, transactions }) {
    setAccounts((prev) => {
      const existing = prev.find((a) => a.name.toLowerCase() === name.toLowerCase())
      let next
      if (existing) {
        next = prev.map((a) =>
          a.id === existing.id
            ? { ...a, bank, transactions: mergeTransactions(a.transactions, transactions), importedAt: new Date().toISOString() }
            : a
        )
        setSelectedAccount(existing.id)
      } else {
        const acc = {
          id: `${bank}-${name}-${transactions.length}-${transactions[0]?.id || ''}`,
          name,
          bank,
          transactions: transactions.slice().sort((a, b) => new Date(b.date) - new Date(a.date)),
          importedAt: new Date().toISOString(),
        }
        next = [...prev, acc]
        setSelectedAccount(acc.id)
      }
      return next
    })
    setShowImport(false)
  }

  function removeAccount(id) {
    setAccounts((prev) => {
      const next = prev.filter((a) => a.id !== id)
      if (selectedAccount === id) setSelectedAccount(next[0]?.id || null)
      return next
    })
  }

  if (!loaded) return null

  // ── Empty state ──────────────────────────────────────────────
  if (!accounts.length) {
    return (
      <>
        <div className="max-w-lg mx-auto mt-12 glass-strong rounded-3xl p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center mx-auto mb-4">
            <Landmark className="w-7 h-7 text-indigo-500" />
          </div>
          <h2 className="text-lg font-extrabold text-ink mb-1">Import your bank statements</h2>
          <p className="text-sm text-ink-soft mb-6">
            Download a CSV of your transactions from Nationwide or Halifax online banking, then drop it
            in here. Everything stays private in your browser.
          </p>
          <button
            onClick={() => setShowImport(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-full hover:bg-gray-800 transition-colors shadow-md"
          >
            <Upload className="w-4 h-4" />
            Import CSV
          </button>
          <div className="mt-6 pt-5 border-t border-white/50">
            <a href="/api/truelayer/auth" className="text-xs text-ink-faint hover:text-ink-soft underline inline-flex items-center gap-1">
              <Link2 className="w-3 h-3" /> Or connect a bank automatically (TrueLayer)
            </a>
          </div>
        </div>
        {showImport && <ImportModal onClose={() => setShowImport(false)} onSave={saveImport} />}
      </>
    )
  }

  // ── Populated ────────────────────────────────────────────────
  const active = accounts.find((a) => a.id === selectedAccount) || accounts[0]
  const totalKnown = accounts.reduce((s, a) => {
    const bal = currentBalance(a.transactions)
    return bal != null ? s + bal : s
  }, 0)

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">Personal Banking</h1>
          <p className="text-sm text-ink-soft">
            {accounts.length} account{accounts.length === 1 ? '' : 's'} ·{' '}
            <span className="font-bold text-ink">{fmtGBP(totalKnown)}</span> known balance
          </p>
        </div>
        <button
          onClick={() => setShowImport(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded-full hover:bg-gray-800 transition-colors shadow-md"
        >
          <Plus className="w-4 h-4" /> Import CSV
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map((acc) => {
          const bal = currentBalance(acc.transactions)
          const bank = BANKS.find((b) => b.id === acc.bank) || BANKS[2]
          return (
            <button
              key={acc.id}
              onClick={() => setSelectedAccount(acc.id)}
              className={`text-left glass-strong glass-hover rounded-3xl p-5 transition-all group relative ${
                active?.id === acc.id ? 'ring-2 ring-gray-900/80' : ''
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${bank.color}1a` }}>
                  <Landmark className="w-4 h-4" style={{ color: bank.color }} />
                </div>
                <span className="text-xs font-semibold text-ink-faint truncate">{bank.name}</span>
                <span
                  onClick={(e) => { e.stopPropagation(); removeAccount(acc.id) }}
                  className="ml-auto p-1 rounded-full hover:bg-red-500/10 text-ink-faint/50 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                  title="Remove account"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </span>
              </div>
              <p className="text-sm font-semibold text-ink-soft truncate">{acc.name}</p>
              <p className="text-3xl font-extrabold text-ink mt-1 tracking-tight">
                {bal != null ? fmtGBP(bal) : fmtGBP(netImported(acc.transactions))}
              </p>
              <p className="text-xs text-ink-faint mt-0.5">
                {bal != null ? 'latest balance' : 'net of imported'} · {acc.transactions.length} txns
              </p>
            </button>
          )
        })}
      </div>

      {active && (
        <div className="glass-strong rounded-3xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-white/50 flex items-center justify-between">
            <h2 className="text-sm font-bold text-ink">Transactions · {active.name}</h2>
            <span className="text-[11px] text-ink-faint">Imported {fmtDate(active.importedAt)}</span>
          </div>
          {active.transactions.length === 0 ? (
            <p className="px-5 py-8 text-sm text-ink-faint text-center">No transactions</p>
          ) : (
            <ul className="divide-y divide-white/40 max-h-[520px] overflow-y-auto">
              {active.transactions.map((t) => (
                <li key={t.id} className="px-5 py-2.5 flex items-center gap-3 hover:bg-white/40 transition-colors">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    t.amount >= 0 ? 'bg-emerald-500/15 text-emerald-600' : 'bg-gray-500/10 text-ink-faint'
                  }`}>
                    {t.amount >= 0 ? <ArrowDownLeft className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink truncate">{t.description}</p>
                    <p className="text-[11px] text-ink-faint">{fmtDate(t.date)}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-sm font-bold ${t.amount >= 0 ? 'text-emerald-600' : 'text-ink'}`}>
                      {t.amount >= 0 ? '+' : ''}{fmtGBP(t.amount)}
                    </span>
                    {t.balance != null && (
                      <p className="text-[11px] text-ink-faint">{fmtGBP(t.balance)}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <p className="text-[11px] text-ink-faint text-center">
        Statements are stored only in this browser and kept separate from Flair business data.
      </p>

      {showImport && <ImportModal onClose={() => setShowImport(false)} onSave={saveImport} />}
    </div>
  )
}

// ── Import modal ───────────────────────────────────────────────
function ImportModal({ onClose, onSave }) {
  const [bank, setBank] = useState('nationwide')
  const [name, setName] = useState('Nationwide')
  const [parsed, setParsed] = useState(null)
  const [error, setError] = useState(null)
  const [fileName, setFileName] = useState(null)
  const inputRef = useRef(null)

  function pickBank(id) {
    setBank(id)
    const b = BANKS.find((x) => x.id === id)
    if (b && (name === '' || BANKS.some((x) => x.name === name))) setName(b.name)
  }

  async function handleFile(file) {
    if (!file) return
    setError(null)
    setFileName(file.name)
    try {
      const text = await file.text()
      const txns = parseBankCsv(text)
      setParsed(txns)
    } catch (e) {
      setParsed(null)
      setError(e.message)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm" onClick={onClose}>
      <div className="glass-strong rounded-3xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-extrabold text-ink">Import statement CSV</h2>
          <button onClick={onClose} className="glass-orb w-8 h-8 rounded-full flex items-center justify-center text-ink-faint hover:text-ink">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div>
          <label className="text-xs font-semibold text-ink-soft mb-1.5 block">Bank</label>
          <div className="flex gap-1.5">
            {BANKS.map((b) => (
              <button
                key={b.id}
                onClick={() => pickBank(b.id)}
                className={`flex-1 px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${
                  bank === b.id ? 'border-gray-900 bg-gray-900 text-white' : 'border-white/70 bg-white/40 text-ink-soft hover:bg-white/60'
                }`}
              >
                {b.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-ink-soft mb-1.5 block">Account name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Nationwide FlexAccount"
            className="w-full px-4 py-2.5 text-sm bg-white/60 border border-white/70 rounded-2xl focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:bg-white/80"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-ink-soft mb-1.5 block">CSV file</label>
          <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
          <button
            onClick={() => inputRef.current?.click()}
            className="w-full px-4 py-6 rounded-2xl border-2 border-dashed border-white/70 bg-white/30 hover:bg-white/50 transition-colors flex flex-col items-center gap-1.5 text-ink-soft"
          >
            <FileText className="w-6 h-6 text-ink-faint" />
            <span className="text-sm font-medium">{fileName || 'Choose a CSV file'}</span>
            <span className="text-[11px] text-ink-faint">Nationwide, Halifax, or any bank export</span>
          </button>
        </div>

        {error && (
          <div className="flex items-start gap-2 text-xs text-red-600 bg-red-500/5 rounded-xl px-3 py-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {parsed && (
          <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-500/10 rounded-xl px-3 py-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>Found <strong>{parsed.length}</strong> transactions ready to import.</span>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-semibold text-ink-soft bg-white/50 rounded-full hover:bg-white/70 transition-colors">
            Cancel
          </button>
          <button
            onClick={() => parsed && name.trim() && onSave({ name: name.trim(), bank, transactions: parsed })}
            disabled={!parsed || !name.trim()}
            className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-gray-900 rounded-full hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Import
          </button>
        </div>
      </div>
    </div>
  )
}
