import { useState, useEffect, useRef, useMemo } from 'react'
import {
  Landmark, Upload, FileText, Trash2, Link2, AlertCircle, X,
  ArrowDownLeft, ArrowUpRight, Plus, CheckCircle2, TrendingUp, TrendingDown, Repeat,
} from 'lucide-react'
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from 'recharts'
import { parseBankCsv, currentBalance, netImported, mergeTransactions } from '../lib/parseBankCsv'
import {
  monthlyCashflow, cashflowSummary, categoryBreakdown, detectRecurringBills,
} from '../lib/bankAnalytics'

const STORAGE_KEY = 'flair_personal_accounts'

const BANKS = [
  { id: 'nationwide', name: 'Nationwide', color: '#003366' },
  { id: 'halifax', name: 'Halifax', color: '#005b99' },
  { id: 'other', name: 'Other', color: '#4a5b54' },
]

const fmtGBP = (n, opts = {}) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', ...opts }).format(n || 0)
const fmtGBP0 = (n) => fmtGBP(n, { maximumFractionDigits: 0 })
const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

export default function PersonalBanking({ activeSubTab, setActiveSubTab }) {
  const [accounts, setAccounts] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [scope, setScope] = useState('all') // 'all' | accountId
  const [showImport, setShowImport] = useState(false)

  const activeTab = activeSubTab || 'overview'

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try { setAccounts(JSON.parse(saved)) } catch {}
    }
    setLoaded(true)
  }, [])

  useEffect(() => {
    if (loaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts))
  }, [accounts, loaded])

  function saveImport({ name, bank, transactions }) {
    setAccounts((prev) => {
      const existing = prev.find((a) => a.name.toLowerCase() === name.toLowerCase())
      if (existing) {
        setScope(existing.id)
        return prev.map((a) =>
          a.id === existing.id
            ? { ...a, bank, transactions: mergeTransactions(a.transactions, transactions), importedAt: new Date().toISOString() }
            : a
        )
      }
      const acc = {
        id: `${bank}-${Date.now()}`,
        name, bank,
        transactions: transactions.slice().sort((a, b) => new Date(b.date) - new Date(a.date)),
        importedAt: new Date().toISOString(),
      }
      setScope(acc.id)
      return [...prev, acc]
    })
    setShowImport(false)
  }

  function removeAccount(id) {
    setAccounts((prev) => prev.filter((a) => a.id !== id))
    if (scope === id) setScope('all')
  }

  const scopedTxns = useMemo(() => {
    const src = scope === 'all' ? accounts.flatMap((a) => a.transactions) : (accounts.find((a) => a.id === scope)?.transactions || [])
    return src.slice().sort((a, b) => new Date(b.date) - new Date(a.date))
  }, [accounts, scope])

  if (!loaded) return null

  if (!accounts.length) {
    return (
      <>
        <EmptyState onImport={() => setShowImport(true)} />
        {showImport && <ImportModal onClose={() => setShowImport(false)} onSave={saveImport} />}
      </>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">Personal Banking</h1>
          <p className="text-sm text-ink-soft capitalize">{activeTab === 'overview' ? `${accounts.length} account${accounts.length === 1 ? '' : 's'}` : activeTab}</p>
        </div>
        <button
          onClick={() => setShowImport(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded-full hover:bg-gray-800 transition-colors shadow-md"
        >
          <Plus className="w-4 h-4" /> Import CSV
        </button>
      </div>

      {/* Scope selector */}
      {accounts.length > 1 && (
        <div className="flex gap-1.5 flex-wrap">
          <ScopeChip active={scope === 'all'} onClick={() => setScope('all')}>All accounts</ScopeChip>
          {accounts.map((a) => (
            <ScopeChip key={a.id} active={scope === a.id} onClick={() => setScope(a.id)}>{a.name}</ScopeChip>
          ))}
        </div>
      )}

      {activeTab === 'overview' && (
        <OverviewTab accounts={accounts} scope={scope} scopedTxns={scopedTxns} onSelect={setScope} onRemove={removeAccount} />
      )}
      {activeTab === 'cashflow' && <CashFlowTab txns={scopedTxns} />}
      {activeTab === 'bills' && <BillsTab txns={scopedTxns} />}
      {activeTab === 'breakdown' && <BreakdownTab txns={scopedTxns} />}

      <p className="text-[11px] text-ink-faint text-center">
        Statements are stored only in this browser and kept separate from Flair business data.
      </p>

      {showImport && <ImportModal onClose={() => setShowImport(false)} onSave={saveImport} />}
    </div>
  )
}

// ── Overview ───────────────────────────────────────────────────
function OverviewTab({ accounts, scope, scopedTxns, onSelect, onRemove }) {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map((acc) => {
          const bal = currentBalance(acc.transactions)
          const bank = BANKS.find((b) => b.id === acc.bank) || BANKS[2]
          return (
            <button
              key={acc.id}
              onClick={() => onSelect(acc.id)}
              className={`text-left glass-strong glass-hover rounded-3xl p-5 transition-all group relative ${scope === acc.id ? 'ring-2 ring-gray-900/80' : ''}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${bank.color}1a` }}>
                  <Landmark className="w-4 h-4" style={{ color: bank.color }} />
                </div>
                <span className="text-xs font-semibold text-ink-faint truncate">{bank.name}</span>
                <span
                  onClick={(e) => { e.stopPropagation(); onRemove(acc.id) }}
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

      <div className="glass-strong rounded-3xl overflow-hidden mt-5">
        <div className="px-5 py-3.5 border-b border-white/50">
          <h2 className="text-sm font-bold text-ink">Transactions</h2>
        </div>
        <TransactionList txns={scopedTxns} />
      </div>
    </>
  )
}

function TransactionList({ txns, max = 200 }) {
  if (!txns.length) return <p className="px-5 py-8 text-sm text-ink-faint text-center">No transactions</p>
  return (
    <ul className="divide-y divide-white/40 max-h-[520px] overflow-y-auto">
      {txns.slice(0, max).map((t) => (
        <li key={t.id} className="px-5 py-2.5 flex items-center gap-3 hover:bg-white/40 transition-colors">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${t.amount >= 0 ? 'bg-emerald-500/15 text-emerald-600' : 'bg-gray-500/10 text-ink-faint'}`}>
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
            {t.balance != null && <p className="text-[11px] text-ink-faint">{fmtGBP(t.balance)}</p>}
          </div>
        </li>
      ))}
    </ul>
  )
}

// ── Cash Flow ──────────────────────────────────────────────────
function CashFlowTab({ txns }) {
  const data = useMemo(() => monthlyCashflow(txns), [txns])
  const summary = useMemo(() => cashflowSummary(txns), [txns])

  if (!data.length) return <EmptyTab label="Not enough data yet — import a statement with dated transactions." />

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <StatTile label="Avg money in" value={fmtGBP0(summary.avgIn)} tone="in" icon={<TrendingUp className="w-4 h-4" />} sub="per month" />
        <StatTile label="Avg money out" value={fmtGBP0(summary.avgOut)} tone="out" icon={<TrendingDown className="w-4 h-4" />} sub="per month" />
        <StatTile label="Avg net" value={fmtGBP0(summary.avgNet)} tone={summary.avgNet >= 0 ? 'in' : 'neg'} sub={`over ${summary.months} mo`} />
      </div>

      <div className="glass-strong rounded-3xl p-5">
        <h2 className="text-sm font-bold text-ink mb-4">Money in vs out by month</h2>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <ComposedChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(44,74,62,0.08)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#8a988f' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#8a988f' }} axisLine={false} tickLine={false} tickFormatter={(v) => `£${Math.round(v / 1000)}k`} />
              <Tooltip
                formatter={(v, n) => [fmtGBP(v), n]}
                contentStyle={{ borderRadius: 14, border: '1px solid rgba(255,255,255,0.7)', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)', fontSize: 12 }}
              />
              <Bar dataKey="in" name="In" fill="#10b981" radius={[5, 5, 0, 0]} maxBarSize={26} />
              <Bar dataKey="out" name="Out" fill="#cbd5e1" radius={[5, 5, 0, 0]} maxBarSize={26} />
              <Line dataKey="net" name="Net" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 3, fill: '#6366f1' }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center gap-5 mt-3 text-[11px] text-ink-soft">
          <Legend color="#10b981" label="Money in" />
          <Legend color="#cbd5e1" label="Money out" />
          <Legend color="#6366f1" label="Net" />
        </div>
      </div>
    </div>
  )
}

// ── Bills ──────────────────────────────────────────────────────
function BillsTab({ txns }) {
  const bills = useMemo(() => detectRecurringBills(txns), [txns])
  const monthlyTotal = bills.reduce((s, b) => s + b.monthly, 0)

  if (!bills.length) return <EmptyTab label="No recurring payments detected yet. Import a few months of statements so repeats can be spotted." />

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <StatTile label="Monthly commitments" value={fmtGBP(monthlyTotal)} tone="out" icon={<Repeat className="w-4 h-4" />} sub={`${bills.length} recurring payments`} />
        <StatTile label="Yearly" value={fmtGBP0(monthlyTotal * 12)} tone="neg" sub="estimated" />
      </div>

      <div className="glass-strong rounded-3xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-white/50">
          <h2 className="text-sm font-bold text-ink">Recurring payments</h2>
        </div>
        <ul className="divide-y divide-white/40">
          {bills.map((b, i) => (
            <li key={i} className="px-5 py-3 flex items-center gap-3 hover:bg-white/40 transition-colors">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: b.color }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-ink truncate">{b.payee}</p>
                <p className="text-[11px] text-ink-faint">{b.category} · seen in {b.months} months · last {fmtDate(b.lastDate)}</p>
              </div>
              <span className="text-sm font-bold text-ink">{fmtGBP(b.monthly)}<span className="text-[11px] font-normal text-ink-faint">/mo</span></span>
            </li>
          ))}
        </ul>
      </div>
      <p className="text-[11px] text-ink-faint text-center">
        Detected automatically from payments that repeat across months — treat as a guide.
      </p>
    </div>
  )
}

// ── Breakdown ──────────────────────────────────────────────────
function BreakdownTab({ txns }) {
  const { total, rows } = useMemo(() => categoryBreakdown(txns), [txns])
  const income = useMemo(() => txns.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0), [txns])

  if (!rows.length) return <EmptyTab label="No spending to break down yet — import a statement first." />

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <StatTile label="Total in" value={fmtGBP0(income)} tone="in" />
        <StatTile label="Total out" value={fmtGBP0(total)} tone="out" />
        <StatTile label="Net" value={fmtGBP0(income - total)} tone={income - total >= 0 ? 'in' : 'neg'} />
      </div>

      <div className="glass-strong rounded-3xl p-5">
        <h2 className="text-sm font-bold text-ink mb-4">Spending by category</h2>
        <div className="space-y-3">
          {rows.map((r) => {
            const pct = total > 0 ? (r.amount / total) * 100 : 0
            return (
              <div key={r.category}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-ink flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: r.color }} />
                    {r.category}
                  </span>
                  <span className="text-sm font-bold text-ink">{fmtGBP(r.amount)} <span className="text-[11px] font-normal text-ink-faint">{pct.toFixed(0)}%</span></span>
                </div>
                <div className="h-2 rounded-full bg-white/50 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: r.color }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Shared bits ────────────────────────────────────────────────
function ScopeChip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-3.5 py-1.5 text-xs font-semibold rounded-full border transition-colors ${active ? 'border-gray-900 bg-gray-900 text-white' : 'border-white/70 bg-white/40 text-ink-soft hover:bg-white/60'}`}
    >
      {children}
    </button>
  )
}

function StatTile({ label, value, sub, tone, icon }) {
  const toneColor = tone === 'in' ? 'text-emerald-600' : tone === 'out' ? 'text-ink' : tone === 'neg' ? 'text-red-500' : 'text-ink'
  return (
    <div className="glass-strong rounded-3xl p-4">
      <div className="flex items-center gap-1.5 text-ink-faint mb-1">
        {icon}<span className="text-[11px] font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <p className={`text-xl font-extrabold tracking-tight ${toneColor}`}>{value}</p>
      {sub && <p className="text-[11px] text-ink-faint mt-0.5">{sub}</p>}
    </div>
  )
}

function Legend({ color, label }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />{label}
    </span>
  )
}

function EmptyTab({ label }) {
  return <div className="glass-strong rounded-3xl p-10 text-center text-sm text-ink-soft">{label}</div>
}

function EmptyState({ onImport }) {
  return (
    <div className="max-w-lg mx-auto mt-12 glass-strong rounded-3xl p-8 text-center">
      <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center mx-auto mb-4">
        <Landmark className="w-7 h-7 text-indigo-500" />
      </div>
      <h2 className="text-lg font-extrabold text-ink mb-1">Import your bank statements</h2>
      <p className="text-sm text-ink-soft mb-6">
        Download a CSV of your transactions from Nationwide or Halifax online banking, then drop it in here.
        Everything stays private in your browser.
      </p>
      <button onClick={onImport} className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-full hover:bg-gray-800 transition-colors shadow-md">
        <Upload className="w-4 h-4" /> Import CSV
      </button>
      <div className="mt-6 pt-5 border-t border-white/50">
        <a href="/api/truelayer/auth" className="text-xs text-ink-faint hover:text-ink-soft underline inline-flex items-center gap-1">
          <Link2 className="w-3 h-3" /> Or connect a bank automatically (TrueLayer)
        </a>
      </div>
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
      setParsed(parseBankCsv(await file.text()))
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
              <button key={b.id} onClick={() => pickBank(b.id)}
                className={`flex-1 px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${bank === b.id ? 'border-gray-900 bg-gray-900 text-white' : 'border-white/70 bg-white/40 text-ink-soft hover:bg-white/60'}`}>
                {b.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-ink-soft mb-1.5 block">Account name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Nationwide FlexAccount"
            className="w-full px-4 py-2.5 text-sm bg-white/60 border border-white/70 rounded-2xl focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:bg-white/80" />
        </div>

        <div>
          <label className="text-xs font-semibold text-ink-soft mb-1.5 block">CSV file</label>
          <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
          <button onClick={() => inputRef.current?.click()}
            className="w-full px-4 py-6 rounded-2xl border-2 border-dashed border-white/70 bg-white/30 hover:bg-white/50 transition-colors flex flex-col items-center gap-1.5 text-ink-soft">
            <FileText className="w-6 h-6 text-ink-faint" />
            <span className="text-sm font-medium">{fileName || 'Choose a CSV file'}</span>
            <span className="text-[11px] text-ink-faint">Nationwide, Halifax, or any bank export</span>
          </button>
        </div>

        {error && (
          <div className="flex items-start gap-2 text-xs text-red-600 bg-red-500/5 rounded-xl px-3 py-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /><span>{error}</span>
          </div>
        )}
        {parsed && (
          <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-500/10 rounded-xl px-3 py-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" /><span>Found <strong>{parsed.length}</strong> transactions ready to import.</span>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-semibold text-ink-soft bg-white/50 rounded-full hover:bg-white/70 transition-colors">Cancel</button>
          <button onClick={() => parsed && name.trim() && onSave({ name: name.trim(), bank, transactions: parsed })} disabled={!parsed || !name.trim()}
            className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-gray-900 rounded-full hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            Import
          </button>
        </div>
      </div>
    </div>
  )
}
