import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import {
  Landmark, Upload, FileText, Trash2, Link2, AlertCircle, X,
  ArrowDownLeft, ArrowUpRight, Plus, CheckCircle2, TrendingUp, TrendingDown, Repeat,
  Pencil, Cloud, CloudOff, RefreshCw, EyeOff, Eye, Filter, ArrowUpDown, Search,
  PiggyBank, CreditCard, Home, Calendar, Tag, ChevronDown, Sparkles,
} from 'lucide-react'
import {
  ResponsiveContainer, ComposedChart, Bar, BarChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
  PieChart, Pie,
} from 'recharts'
import { parseBankCsv, currentBalance, netImported, mergeTransactions } from '../lib/parseBankCsv'
import {
  monthlyCashflow, cashflowSummary, categoryBreakdown, categorise, CATEGORY_COLORS,
  groupPlannedBills, DEFAULT_PLANNED_BILLS, BILL_CATEGORY_ORDER, BILL_CATEGORY_COLORS, billBankAverages,
} from '../lib/bankAnalytics'

// Backfill statement-match keywords onto bills saved before matching existed,
// pairing them to the seed list by name so the bank average can be computed.
function hydrateBillMatchers(bills) {
  return bills.map((b) => {
    if (b.match && b.match.length) return b
    const seed = DEFAULT_PLANNED_BILLS.find(
      (d) => d.name.toLowerCase() === (b.name || '').toLowerCase()
    )
    return seed ? { ...b, match: seed.match } : b
  })
}

const STORAGE_KEY = 'flair_personal_accounts'
const BILLS_KEY = 'flair_personal_bills'
const SETTINGS_KEY = 'flair_personal_settings'

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
  const [bills, setBills] = useState(DEFAULT_PLANNED_BILLS)
  const [settings, setSettings] = useState({ monthlyIncome: null, excludedTxns: [] }) // excludedTxns = transaction IDs to ignore
  const [loaded, setLoaded] = useState(false)
  const [scope, setScope] = useState('all') // 'all' | accountId
  const [flowFilter, setFlowFilter] = useState('all') // 'all' | 'in' | 'out'
  const [showImport, setShowImport] = useState(false)
  const [storageError, setStorageError] = useState(null)
  const [syncStatus, setSyncStatus] = useState('idle') // 'idle' | 'syncing' | 'synced' | 'error'
  const [lastSynced, setLastSynced] = useState(null)
  const saveTimeoutRef = useRef(null)
  const initialLoadDone = useRef(false)

  const activeTab = activeSubTab || 'overview'

  // Load data from Supabase (with localStorage as fast cache)
  useEffect(() => {
    async function loadData() {
      // First, load from localStorage for instant display
      const localAccounts = localStorage.getItem(STORAGE_KEY)
      if (localAccounts) {
        try { setAccounts(JSON.parse(localAccounts)) } catch {}
      }
      const localBills = localStorage.getItem(BILLS_KEY)
      if (localBills) {
        try {
          const parsed = JSON.parse(localBills)
          if (Array.isArray(parsed)) setBills(hydrateBillMatchers(parsed))
        } catch {}
      }
      const localSettings = localStorage.getItem(SETTINGS_KEY)
      if (localSettings) {
        try { setSettings(JSON.parse(localSettings)) } catch {}
      }

      // Then fetch from Supabase for cross-device sync
      setSyncStatus('syncing')
      try {
        const [accRes, billsRes, settingsRes] = await Promise.all([
          fetch('/api/personal/data?key=accounts'),
          fetch('/api/personal/data?key=bills'),
          fetch('/api/personal/data?key=settings'),
        ])
        const accData = await accRes.json()
        const billsData = await billsRes.json()
        const settingsData = await settingsRes.json()

        // Use cloud data if it exists and is newer
        if (accData.value && Array.isArray(accData.value)) {
          setAccounts(accData.value)
          localStorage.setItem(STORAGE_KEY, JSON.stringify(accData.value))
        }
        if (billsData.value && Array.isArray(billsData.value)) {
          setBills(hydrateBillMatchers(billsData.value))
          localStorage.setItem(BILLS_KEY, JSON.stringify(billsData.value))
        }
        if (settingsData.value && typeof settingsData.value === 'object') {
          setSettings(settingsData.value)
          localStorage.setItem(SETTINGS_KEY, JSON.stringify(settingsData.value))
        }

        setSyncStatus('synced')
        setLastSynced(new Date())
      } catch (e) {
        console.error('Failed to load from cloud:', e)
        setSyncStatus('error')
      }

      setLoaded(true)
      initialLoadDone.current = true
    }
    loadData()
  }, [])

  // Debounced save to both localStorage and Supabase
  const saveToCloud = useCallback(async (key, value) => {
    // Save to localStorage immediately
    const localKey = key === 'accounts' ? STORAGE_KEY : key === 'bills' ? BILLS_KEY : SETTINGS_KEY
    try {
      localStorage.setItem(localKey, JSON.stringify(value))
      if (storageError) setStorageError(null)
    } catch (e) {
      console.error('Failed to save to localStorage:', e)
      setStorageError(key)
    }

    // Debounced save to Supabase
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(async () => {
      setSyncStatus('syncing')
      try {
        const res = await fetch('/api/personal/data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key, value }),
        })
        if (!res.ok) throw new Error('Save failed')
        setSyncStatus('synced')
        setLastSynced(new Date())
      } catch (e) {
        console.error('Failed to save to cloud:', e)
        setSyncStatus('error')
      }
    }, 1000) // 1 second debounce
  }, [storageError])

  // Save accounts when they change
  useEffect(() => {
    if (!initialLoadDone.current) return
    saveToCloud('accounts', accounts)
  }, [accounts, saveToCloud])

  // Save bills when they change
  useEffect(() => {
    if (!initialLoadDone.current) return
    saveToCloud('bills', bills)
  }, [bills, saveToCloud])

  // Save settings when they change
  useEffect(() => {
    if (!initialLoadDone.current) return
    saveToCloud('settings', settings)
  }, [settings, saveToCloud])

  // Auto-update savings & debt monthly
  useEffect(() => {
    if (!loaded) return
    const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM
    const lastUpdate = settings.lastMonthlyUpdate
    if (lastUpdate === currentMonth) return // Already updated this month

    // Check if we have any goals or debts to update
    const goals = settings.savingsGoals || []
    const debts = settings.debts || []
    if (goals.length === 0 && debts.length === 0) return

    // Calculate months passed since last update
    let monthsPassed = 1
    if (lastUpdate) {
      const [lastY, lastM] = lastUpdate.split('-').map(Number)
      const [curY, curM] = currentMonth.split('-').map(Number)
      monthsPassed = (curY - lastY) * 12 + (curM - lastM)
      if (monthsPassed <= 0) return
    }

    setSettings((s) => ({
      ...s,
      lastMonthlyUpdate: currentMonth,
      // Increase savings by contribution for each month passed
      savingsGoals: (s.savingsGoals || []).map((g) => ({
        ...g,
        saved: Math.min(g.target, (Number(g.saved) || 0) + (Number(g.contribution) || 0) * monthsPassed),
      })),
      // Decrease debt by payment for each month passed (but don't go below 0)
      debts: (s.debts || []).map((d) => ({
        ...d,
        balance: Math.max(0, (Number(d.balance) || 0) - (Number(d.minPayment) || 0) * monthsPassed),
      })),
    }))
  }, [loaded, settings.lastMonthlyUpdate, settings.savingsGoals?.length, settings.debts?.length])

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

  // All transactions for display
  const scopedTxns = useMemo(() => {
    const src = scope === 'all' ? accounts.flatMap((a) => a.transactions) : (accounts.find((a) => a.id === scope)?.transactions || [])
    return src.slice().sort((a, b) => new Date(b.date) - new Date(a.date))
  }, [accounts, scope])

  // Filtered transactions for calculations (excludes marked transactions + flow filter)
  const excludedSet = useMemo(() => new Set(settings.excludedTxns || []), [settings.excludedTxns])
  const filteredTxns = useMemo(() => {
    let txns = scopedTxns.filter((t) => !excludedSet.has(t.id))
    if (flowFilter === 'in') txns = txns.filter((t) => t.amount >= 0)
    if (flowFilter === 'out') txns = txns.filter((t) => t.amount < 0)
    return txns
  }, [scopedTxns, excludedSet, flowFilter])

  function toggleExcludeTxn(id) {
    setSettings((s) => {
      const excluded = new Set(s.excludedTxns || [])
      if (excluded.has(id)) excluded.delete(id)
      else excluded.add(id)
      return { ...s, excludedTxns: [...excluded] }
    })
  }

  if (!loaded) return null

  // The planned-bills budget is maintained by hand, so it stays usable even
  // before any statement has been imported. Every other tab needs data first.
  if (!accounts.length && activeTab !== 'bills') {
    return (
      <>
        <EmptyState onImport={() => setShowImport(true)} />
        {showImport && <ImportModal onClose={() => setShowImport(false)} onSave={saveImport} />}
      </>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Storage error warning */}
      {storageError && (
        <div className="flex items-start gap-3 px-4 py-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800">Storage limit reached</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Your {storageError === 'accounts' ? 'bank statements' : 'bills'} couldn't be saved — browser storage is full.
              Try removing old accounts or clearing other site data.
            </p>
          </div>
          <button onClick={() => setStorageError(null)} className="text-amber-600 hover:text-amber-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">Personal Banking</h1>
          <div className="flex items-center gap-2">
            <p className="text-sm text-ink-soft capitalize">{activeTab === 'overview' ? `${accounts.length} account${accounts.length === 1 ? '' : 's'}` : activeTab}</p>
            <SyncIndicator status={syncStatus} lastSynced={lastSynced} />
          </div>
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

      {/* Flow filter - Money In vs Out */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-ink-faint">Show:</span>
        <div className="flex gap-1">
          <button
            onClick={() => setFlowFilter('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
              flowFilter === 'all' ? 'bg-gray-900 text-white' : 'bg-white/50 text-ink-soft hover:bg-white/70'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFlowFilter('in')}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors flex items-center gap-1 ${
              flowFilter === 'in' ? 'bg-emerald-600 text-white' : 'bg-white/50 text-ink-soft hover:bg-white/70'
            }`}
          >
            <ArrowDownLeft className="w-3 h-3" /> Money In
          </button>
          <button
            onClick={() => setFlowFilter('out')}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors flex items-center gap-1 ${
              flowFilter === 'out' ? 'bg-red-500 text-white' : 'bg-white/50 text-ink-soft hover:bg-white/70'
            }`}
          >
            <ArrowUpRight className="w-3 h-3" /> Money Out
          </button>
        </div>
      </div>

      {activeTab === 'overview' && (
        <OverviewTab
          accounts={accounts}
          scope={scope}
          scopedTxns={scopedTxns}
          filteredTxns={filteredTxns}
          excludedSet={excludedSet}
          onToggleExclude={toggleExcludeTxn}
          onSelect={setScope}
          onRemove={removeAccount}
          bills={bills}
          settings={settings}
        />
      )}
      {activeTab === 'transactions' && <TransactionsTab txns={scopedTxns} settings={settings} setSettings={setSettings} />}
      {activeTab === 'cashflow' && <CashFlowTab txns={filteredTxns} />}
      {activeTab === 'bills' && <BillsTab txns={filteredTxns} bills={bills} setBills={setBills} settings={settings} setSettings={setSettings} />}
      {activeTab === 'savings' && <SavingsTab txns={filteredTxns} settings={settings} setSettings={setSettings} />}
      {activeTab === 'debt' && <DebtTab settings={settings} setSettings={setSettings} />}
      {activeTab === 'mortgage' && <MortgageTab settings={settings} setSettings={setSettings} />}
      {activeTab === 'breakdown' && <BreakdownTab txns={filteredTxns} />}

      <p className="text-[11px] text-ink-faint text-center">
        Statements sync across your devices and are kept separate from Flair business data.
      </p>

      {showImport && <ImportModal onClose={() => setShowImport(false)} onSave={saveImport} />}
    </div>
  )
}

// ── Overview ───────────────────────────────────────────────────
function OverviewTab({ accounts, scope, scopedTxns, filteredTxns, excludedSet, onToggleExclude, onSelect, onRemove, bills, settings }) {
  const [sortBy, setSortBy] = useState('date') // 'date' | 'amount'
  const [sortDir, setSortDir] = useState('desc') // 'asc' | 'desc'
  const [filterMin, setFilterMin] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  // Summary calculations
  const summary = useMemo(() => cashflowSummary(filteredTxns || []), [filteredTxns])
  const { total: billsTotal } = useMemo(() => groupPlannedBills(bills || []), [bills])
  const savingsGoals = settings?.savingsGoals || []
  const debts = settings?.debts || []
  const mortgage = settings?.mortgage || {}

  const income = settings?.monthlyIncome ?? summary.avgIn
  const totalSavingsContrib = savingsGoals.reduce((s, g) => s + (Number(g.contribution) || 0), 0)
  const totalDebtPayment = debts.reduce((s, d) => s + (Number(d.minPayment) || 0), 0)
  const mortgagePayment = Number(mortgage.payment) || 0
  const committed = billsTotal + totalSavingsContrib + totalDebtPayment + mortgagePayment
  const freeSpend = Math.max(0, income - committed)
  const weeklyBudget = freeSpend / 4.33

  // Total balances across all accounts
  const totalBalance = accounts.reduce((s, acc) => {
    const bal = currentBalance(acc.transactions)
    return s + (bal ?? netImported(acc.transactions))
  }, 0)

  const processedTxns = useMemo(() => {
    let txns = [...scopedTxns]

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      txns = txns.filter((t) => t.description.toLowerCase().includes(term))
    }

    // Amount filter
    if (filterMin) {
      const min = Number(filterMin)
      txns = txns.filter((t) => Math.abs(t.amount) >= min)
    }

    // Sort
    txns.sort((a, b) => {
      if (sortBy === 'date') {
        return sortDir === 'desc'
          ? new Date(b.date) - new Date(a.date)
          : new Date(a.date) - new Date(b.date)
      }
      return sortDir === 'desc'
        ? Math.abs(b.amount) - Math.abs(a.amount)
        : Math.abs(a.amount) - Math.abs(b.amount)
    })

    return txns
  }, [scopedTxns, sortBy, sortDir, filterMin, searchTerm])

  const excludedCount = scopedTxns.filter((t) => excludedSet.has(t.id)).length
  return (
    <>
      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatTile label="Total balance" value={fmtGBP0(totalBalance)} tone={totalBalance >= 0 ? 'in' : 'neg'} icon={<Landmark className="w-4 h-4" />} sub={`${accounts.length} accounts`} />
        <StatTile label="Income" value={fmtGBP0(income)} tone="in" icon={<ArrowDownLeft className="w-4 h-4" />} sub="avg / month" />
        <StatTile label="Spending" value={fmtGBP0(summary.avgOut)} tone="out" icon={<ArrowUpRight className="w-4 h-4" />} sub="avg / month" />
        <StatTile label="Weekly budget" value={fmtGBP0(weeklyBudget)} tone={weeklyBudget > 0 ? 'in' : 'neg'} sub="after commitments" />
      </div>

      {/* Commitments breakdown */}
      {committed > 0 && (
        <div className="glass-strong rounded-3xl p-4 mb-4">
          <h3 className="text-xs font-bold text-ink-faint uppercase tracking-wider mb-3">Monthly commitments</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
            <div className="flex justify-between">
              <span className="text-ink-soft">Bills</span>
              <span className="font-semibold text-ink">{fmtGBP0(billsTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-soft">Savings</span>
              <span className="font-semibold text-emerald-600">{fmtGBP0(totalSavingsContrib)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-soft">Debt</span>
              <span className="font-semibold text-ink">{fmtGBP0(totalDebtPayment)}</span>
            </div>
            {mortgagePayment > 0 && (
              <div className="flex justify-between">
                <span className="text-ink-soft">Mortgage</span>
                <span className="font-semibold text-ink">{fmtGBP0(mortgagePayment)}</span>
              </div>
            )}
          </div>
          <div className="flex justify-between mt-3 pt-3 border-t border-white/40">
            <span className="text-ink font-semibold">Free to spend</span>
            <span className={`font-bold ${freeSpend > 0 ? 'text-emerald-600' : 'text-red-500'}`}>{fmtGBP0(freeSpend)}/mo</span>
          </div>
        </div>
      )}

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
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-ink">Transactions</h2>
              {excludedCount > 0 && (
                <span className="text-[10px] font-medium text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full">
                  {excludedCount} hidden
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs bg-white/50 border border-white/70 rounded-full w-32 focus:w-48 focus:outline-none focus:ring-2 focus:ring-gray-900/10 transition-all"
                />
              </div>
              {/* Filter toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`p-1.5 rounded-full transition-colors ${showFilters ? 'bg-gray-900 text-white' : 'bg-white/50 text-ink-faint hover:bg-white/70'}`}
                title="Filter"
              >
                <Filter className="w-3.5 h-3.5" />
              </button>
              {/* Sort */}
              <button
                onClick={() => {
                  if (sortBy === 'date') {
                    setSortBy('amount')
                    setSortDir('desc')
                  } else {
                    setSortBy('date')
                    setSortDir('desc')
                  }
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium bg-white/50 rounded-full hover:bg-white/70 transition-colors"
                title="Sort by"
              >
                <ArrowUpDown className="w-3 h-3" />
                {sortBy === 'date' ? 'Date' : 'Amount'}
              </button>
            </div>
          </div>
          {/* Filter controls */}
          {showFilters && (
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/30">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-ink-faint">Min £</span>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={filterMin}
                  onChange={(e) => setFilterMin(e.target.value)}
                  className="w-20 px-2 py-1 text-xs bg-white/50 border border-white/70 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                />
              </div>
              <button
                onClick={() => setSortDir(sortDir === 'desc' ? 'asc' : 'desc')}
                className="text-[11px] text-ink-soft hover:text-ink"
              >
                {sortDir === 'desc' ? '↓ Newest/Largest first' : '↑ Oldest/Smallest first'}
              </button>
              {(filterMin || searchTerm) && (
                <button
                  onClick={() => { setFilterMin(''); setSearchTerm('') }}
                  className="text-[11px] text-red-500 hover:text-red-600 ml-auto"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>
        <TransactionList txns={processedTxns} excludedSet={excludedSet} onToggleExclude={onToggleExclude} />
      </div>
    </>
  )
}

function TransactionList({ txns, excludedSet, onToggleExclude, max = 200 }) {
  if (!txns.length) return <p className="px-5 py-8 text-sm text-ink-faint text-center">No transactions</p>
  return (
    <ul className="divide-y divide-white/40 max-h-[520px] overflow-y-auto">
      {txns.slice(0, max).map((t) => {
        const isExcluded = excludedSet?.has(t.id)
        const isLarge = Math.abs(t.amount) >= 5000 // Flag large transactions
        return (
          <li
            key={t.id}
            className={`px-5 py-2.5 flex items-center gap-3 hover:bg-white/40 transition-colors group ${isExcluded ? 'opacity-40' : ''}`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${t.amount >= 0 ? 'bg-emerald-500/15 text-emerald-600' : 'bg-gray-500/10 text-ink-faint'}`}>
              {t.amount >= 0 ? <ArrowDownLeft className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className={`text-sm font-medium truncate ${isExcluded ? 'text-ink-faint line-through' : 'text-ink'}`}>{t.description}</p>
                {isLarge && !isExcluded && (
                  <span className="text-[9px] font-medium text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded-full flex-shrink-0">
                    large
                  </span>
                )}
                {isExcluded && (
                  <span className="text-[9px] font-medium text-ink-faint bg-gray-500/10 px-1.5 py-0.5 rounded-full flex-shrink-0">
                    hidden
                  </span>
                )}
              </div>
              <p className="text-[11px] text-ink-faint">{fmtDate(t.date)}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <span className={`text-sm font-bold ${isExcluded ? 'text-ink-faint' : t.amount >= 0 ? 'text-emerald-600' : 'text-ink'}`}>
                {t.amount >= 0 ? '+' : ''}{fmtGBP(t.amount)}
              </span>
              {t.balance != null && <p className="text-[11px] text-ink-faint">{fmtGBP(t.balance)}</p>}
            </div>
            {onToggleExclude && (
              <button
                onClick={() => onToggleExclude(t.id)}
                className={`p-1.5 rounded-full transition-all flex-shrink-0 ${
                  isExcluded
                    ? 'bg-gray-500/10 text-ink-faint hover:bg-emerald-500/10 hover:text-emerald-600'
                    : 'opacity-0 group-hover:opacity-100 bg-white/50 text-ink-faint hover:bg-amber-500/10 hover:text-amber-600'
                }`}
                title={isExcluded ? 'Include in calculations' : 'Exclude from calculations'}
              >
                {isExcluded ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              </button>
            )}
          </li>
        )
      })}
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
// Editable monthly budget of known recurring commitments, grouped by
// category. The auto-detected list from statements sits underneath as a
// cross-check.
function BillsTab({ txns, bills, setBills, settings, setSettings }) {
  const [editingIncome, setEditingIncome] = useState(false)
  const { total, groups } = useMemo(() => groupPlannedBills(bills), [bills])
  const bankAvgs = useMemo(() => billBankAverages(bills, txns), [bills, txns])
  const summary = useMemo(() => cashflowSummary(txns), [txns])
  const bankIncome = summary.avgIn
  const income = settings?.monthlyIncome ?? bankIncome // use manual if set, else bank avg
  const allSpend = summary.avgOut
  const savings = income - allSpend // avg money left each month
  const otherSpend = Math.max(0, allSpend - total) // spend that isn't a tracked bill

  // Savings and debt totals
  const savingsGoals = settings?.savingsGoals || []
  const debts = settings?.debts || []
  const totalSavingsContrib = savingsGoals.reduce((s, g) => s + (Number(g.contribution) || 0), 0)
  const totalDebtPayment = debts.reduce((s, d) => s + (Number(d.minPayment) || 0), 0)
  const mortgage = settings?.mortgage || {}
  const mortgagePayment = Number(mortgage.payment) || 0

  // Weekly spending available
  const committed = total + totalSavingsContrib + totalDebtPayment + mortgagePayment
  const freeSpend = Math.max(0, income - committed)
  const weeklyBudget = freeSpend / 4.33
  const hasIncome = income > 0 || settings?.monthlyIncome > 0
  const catData = useMemo(
    () => groups.filter((g) => g.subtotal > 0).map((g) => ({ name: g.category, value: g.subtotal, color: g.color })),
    [groups]
  )
  const topBills = useMemo(
    () => bills
      .map((b) => ({ name: b.name || '—', amount: Number(b.amount) || 0, color: BILL_CATEGORY_COLORS[b.category] || BILL_CATEGORY_COLORS.Other }))
      .filter((b) => b.amount > 0)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8),
    [bills]
  )
  const matchable = useMemo(
    () => bills.filter((b) => (bankAvgs[b.id]?.avg || 0) > 0).length,
    [bills, bankAvgs]
  )

  function updateBill(id, patch) {
    setBills((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)))
  }
  function removeBill(id) {
    setBills((prev) => prev.filter((b) => b.id !== id))
  }
  function addBill() {
    setBills((prev) => [
      ...prev,
      { id: `bill-${Date.now()}`, name: '', amount: 0, category: 'Other', match: [] },
    ])
  }
  // Set every matched bill's amount to its average monthly bank spend.
  function matchAllToBank() {
    setBills((prev) => prev.map((b) => {
      const avg = bankAvgs[b.id]?.avg || 0
      return avg > 0 ? { ...b, amount: avg } : b
    }))
  }

  return (
    <div className="space-y-4">
      {/* Dashboard — income vs spending vs savings */}
      {hasIncome ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <EditableIncomeTile
              income={income}
              bankIncome={bankIncome}
              isManual={settings?.monthlyIncome != null}
              editing={editingIncome}
              onEdit={() => setEditingIncome(true)}
              onSave={(val) => {
                setSettings((s) => ({ ...s, monthlyIncome: val || null }))
                setEditingIncome(false)
              }}
              onCancel={() => setEditingIncome(false)}
            />
            <StatTile label="Bills" value={fmtGBP0(total)} tone="out" icon={<Repeat className="w-4 h-4" />} sub={`${fmtGBP0(total * 12)} / yr`} />
            <StatTile label="Savings" value={fmtGBP0(totalSavingsContrib)} tone="in" icon={<PiggyBank className="w-4 h-4" />} sub={`${savingsGoals.length} goals`} />
            <StatTile label="Debt payments" value={fmtGBP0(totalDebtPayment + mortgagePayment)} tone="out" icon={<CreditCard className="w-4 h-4" />} sub={mortgagePayment > 0 ? 'inc. mortgage' : `${debts.length} accounts`} />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <StatTile label="Committed" value={fmtGBP0(committed)} tone="out" sub="bills + savings + debt" />
            <StatTile label="Free spend" value={fmtGBP0(freeSpend)} tone={freeSpend > 0 ? 'in' : 'neg'} sub="after commitments" />
            <StatTile label="Weekly budget" value={fmtGBP0(weeklyBudget)} tone={weeklyBudget > 0 ? 'in' : 'neg'} sub="available per week" />
          </div>
          <IncomeAllocation income={income} bills={total} otherSpend={otherSpend} savings={savings} />
          <IncomeVsSpend txns={txns} />
        </>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <StatTile label="Monthly bills" value={fmtGBP(total)} tone="out" icon={<Repeat className="w-4 h-4" />} sub={`${bills.length} recurring items`} />
          <StatTile label="Yearly" value={fmtGBP0(total * 12)} tone="neg" sub="× 12 months" />
        </div>
      )}

      <div className="glass-strong rounded-3xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-white/50 flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-ink">My bills</h2>
          <div className="flex items-center gap-1.5">
            {matchable > 0 && (
              <button
                onClick={matchAllToBank}
                title="Fill each amount with its average monthly spend from your statements"
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-full bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
              >
                <TrendingUp className="w-3.5 h-3.5" /> Match to bank
              </button>
            )}
            <button
              onClick={addBill}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-full bg-gray-900 text-white hover:bg-gray-800 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add bill
            </button>
          </div>
        </div>

        {groups.map((g) => (
          <div key={g.category}>
            <div className="px-5 py-2 flex items-center justify-between bg-white/30 border-b border-white/40">
              <span className="text-[11px] font-bold uppercase tracking-wide text-ink-soft flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: g.color }} />
                {g.category}
              </span>
              <span className="text-[11px] font-semibold text-ink-faint">{fmtGBP(g.subtotal)}/mo</span>
            </div>
            <ul className="divide-y divide-white/40">
              {g.bills.map((b) => (
                <BillRow
                  key={b.id}
                  bill={b}
                  bank={bankAvgs[b.id]}
                  onChange={(patch) => updateBill(b.id, patch)}
                  onRemove={() => removeBill(b.id)}
                />
              ))}
            </ul>
          </div>
        ))}

        <div className="px-5 py-3 flex items-center justify-between border-t border-white/50 bg-white/20">
          <span className="text-sm font-bold text-ink">Total</span>
          <span className="text-sm font-extrabold text-ink">{fmtGBP(total)}<span className="text-[11px] font-normal text-ink-faint">/mo</span></span>
        </div>
      </div>
      <p className="text-[11px] text-ink-faint text-center">
        {matchable > 0
          ? 'Amounts can be filled from your statements — “Match to bank” uses each bill’s average monthly spend. Everything stays editable and saves in this browser.'
          : 'Your monthly budget — edit any amount and it saves in this browser. Import statements to auto-fill amounts from the bank.'}
      </p>

      {total > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Where the money goes — category split */}
          <div className="glass-strong rounded-3xl p-5">
            <h2 className="text-sm font-bold text-ink mb-2">Where it goes</h2>
            <div className="relative" style={{ width: '100%', height: 240 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={catData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={62}
                    outerRadius={92}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {catData.map((d) => <Cell key={d.name} fill={d.color} />)}
                  </Pie>
                  <Tooltip
                    formatter={(v, n) => [`${fmtGBP(v)}/mo`, n]}
                    contentStyle={{ borderRadius: 14, border: '1px solid rgba(255,255,255,0.7)', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)', fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[11px] text-ink-faint font-semibold uppercase tracking-wide">Per month</span>
                <span className="text-2xl font-extrabold text-ink tracking-tight">{fmtGBP0(total)}</span>
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 mt-3">
              {catData.map((d) => (
                <span key={d.name} className="flex items-center gap-1.5 text-[11px] text-ink-soft">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: d.color }} />
                  {d.name} <span className="text-ink-faint">{fmtGBP0(d.value)}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Biggest bills */}
          <div className="glass-strong rounded-3xl p-5">
            <h2 className="text-sm font-bold text-ink mb-2">Biggest bills</h2>
            <div style={{ width: '100%', height: 240 }}>
              <ResponsiveContainer>
                <BarChart data={topBills} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(44,74,62,0.08)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#8a988f' }} axisLine={false} tickLine={false} tickFormatter={(v) => `£${v >= 1000 ? `${Math.round(v / 1000)}k` : v}`} />
                  <YAxis type="category" dataKey="name" width={96} tick={{ fontSize: 11, fill: '#5a6b62' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: 'rgba(44,74,62,0.05)' }}
                    formatter={(v) => [`${fmtGBP(v)}/mo`, 'Amount']}
                    contentStyle={{ borderRadius: 14, border: '1px solid rgba(255,255,255,0.7)', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)', fontSize: 12 }}
                  />
                  <Bar dataKey="amount" radius={[0, 5, 5, 0]} maxBarSize={22}>
                    {topBills.map((b) => <Cell key={b.name} fill={b.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : (
        <EmptyTab label="Add amounts to your bills (or use “Match to bank”) to see the breakdown charts." />
      )}
    </div>
  )
}

// How monthly income splits into bills, other spending and what's left.
function IncomeAllocation({ income, bills, otherSpend, savings }) {
  const seg = (v) => `${Math.max(0, Math.min(100, (v / income) * 100))}%`
  const save = Math.max(0, savings)
  return (
    <div className="glass-strong rounded-3xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-ink">Income allocation</h2>
        <span className="text-[11px] text-ink-faint">of {fmtGBP0(income)}/mo income</span>
      </div>
      <div className="h-5 rounded-full overflow-hidden flex bg-white/50">
        <div style={{ width: seg(bills), backgroundColor: '#6366f1' }} />
        <div style={{ width: seg(otherSpend), backgroundColor: '#f59e0b' }} />
        <div style={{ width: seg(save), backgroundColor: '#10b981' }} />
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-3">
        <AllocKey color="#6366f1" label="Bills" value={bills} income={income} />
        <AllocKey color="#f59e0b" label="Other spending" value={otherSpend} income={income} />
        <AllocKey color="#10b981" label={savings >= 0 ? 'Savings' : 'Shortfall'} value={save} income={income} />
      </div>
      {savings < 0 && (
        <p className="text-[11px] text-red-500 mt-2 font-medium">Spending is above income by {fmtGBP0(Math.abs(savings))}/mo.</p>
      )}
    </div>
  )
}

// Income vs spending by month, with the gap (what's saved) as a line.
function IncomeVsSpend({ txns }) {
  const data = useMemo(() => monthlyCashflow(txns, 6), [txns])
  if (data.length < 2) return null
  return (
    <div className="glass-strong rounded-3xl p-5">
      <h2 className="text-sm font-bold text-ink mb-4">Income vs spending</h2>
      <div style={{ width: '100%', height: 240 }}>
        <ResponsiveContainer>
          <ComposedChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(44,74,62,0.08)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#8a988f' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#8a988f' }} axisLine={false} tickLine={false} tickFormatter={(v) => `£${v >= 1000 ? `${Math.round(v / 1000)}k` : Math.round(v)}`} />
            <Tooltip
              formatter={(v, n) => [fmtGBP(v), n]}
              contentStyle={{ borderRadius: 14, border: '1px solid rgba(255,255,255,0.7)', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)', fontSize: 12 }}
            />
            <Bar dataKey="in" name="Income" fill="#10b981" radius={[5, 5, 0, 0]} maxBarSize={26} />
            <Bar dataKey="out" name="Spending" fill="#cbd5e1" radius={[5, 5, 0, 0]} maxBarSize={26} />
            <Line dataKey="net" name="Saved" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 3, fill: '#6366f1' }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center justify-center gap-5 mt-3 text-[11px] text-ink-soft">
        <Legend color="#10b981" label="Income" />
        <Legend color="#cbd5e1" label="Spending" />
        <Legend color="#6366f1" label="Saved" />
      </div>
    </div>
  )
}

function AllocKey({ color, label, value, income }) {
  const pct = income > 0 ? Math.round((value / income) * 100) : 0
  return (
    <span className="flex items-center gap-1.5 text-xs text-ink-soft">
      <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
      <span className="font-semibold text-ink">{label}</span>
      {fmtGBP0(value)} <span className="text-ink-faint">{pct}%</span>
    </span>
  )
}

function BillRow({ bill, bank, onChange, onRemove }) {
  const [editingMatch, setEditingMatch] = useState(false)
  const avg = bank?.avg || 0
  const amount = Number(bill.amount) || 0
  const matchText = (bill.match || []).join(', ')
  // Show the bank hint when there's a match and it isn't already the amount.
  const showHint = avg > 0 && avg !== amount

  function handleMatchChange(text) {
    const keywords = text
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
    onChange({ match: keywords })
  }

  return (
    <li className="px-5 py-3 hover:bg-white/40 transition-colors group">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <input
            value={bill.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="Bill name"
            className="w-full bg-transparent text-sm font-semibold text-ink placeholder:text-ink-faint/60 focus:outline-none focus:bg-white/60 rounded-lg px-2 py-1 -mx-2 transition-colors"
          />
          {/* Match keywords editor */}
          <div className="mt-1 ml-0.5">
            {editingMatch ? (
              <input
                autoFocus
                type="text"
                defaultValue={matchText}
                onBlur={(e) => {
                  handleMatchChange(e.target.value)
                  setEditingMatch(false)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleMatchChange(e.target.value)
                    setEditingMatch(false)
                  }
                  if (e.key === 'Escape') setEditingMatch(false)
                }}
                placeholder="e.g. netflix, disney, spotify"
                className="w-full text-[11px] text-ink-soft bg-white/70 border border-indigo-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
            ) : (
              <button
                onClick={() => setEditingMatch(true)}
                className="flex items-center gap-1 text-[11px] text-ink-faint hover:text-ink-soft transition-colors group/match"
              >
                <Pencil className="w-3 h-3 opacity-50 group-hover/match:opacity-100" />
                {matchText ? (
                  <span className="truncate max-w-[200px]">Match: {matchText}</span>
                ) : (
                  <span className="italic">Add match keywords…</span>
                )}
              </button>
            )}
          </div>
          {/* Bank average hint */}
          {showHint ? (
            <button
              onClick={() => onChange({ amount: avg })}
              title={`Use the average from ${bank.count} matching payment${bank.count === 1 ? '' : 's'}`}
              className="text-[11px] text-emerald-600 hover:text-emerald-700 hover:underline font-medium ml-0.5 mt-1"
            >
              bank avg ≈ {fmtGBP(avg)}/mo · tap to use
            </button>
          ) : avg > 0 ? (
            <span className="text-[11px] text-emerald-600 ml-0.5 mt-1 block">✓ matches bank ({bank.count} txn{bank.count === 1 ? '' : 's'})</span>
          ) : matchText ? (
            <span className="text-[11px] text-amber-600 ml-0.5 mt-1 block">no matching transactions</span>
          ) : null}
        </div>
        <select
          value={bill.category || 'Other'}
          onChange={(e) => onChange({ category: e.target.value })}
          className="text-[11px] font-semibold text-ink-soft bg-white/50 border border-white/70 rounded-full px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-gray-900/10 cursor-pointer"
        >
          {BILL_CATEGORY_ORDER.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <div className="flex items-center gap-1 w-24">
          <span className="text-sm text-ink-faint">£</span>
          <input
            type="number"
            min="0"
            step="1"
            value={bill.amount === 0 ? '' : bill.amount}
            onChange={(e) => onChange({ amount: e.target.value === '' ? 0 : Number(e.target.value) })}
            placeholder="0"
            className="w-full bg-white/50 border border-white/70 rounded-lg px-2 py-1 text-sm font-bold text-ink text-right focus:outline-none focus:ring-2 focus:ring-gray-900/10"
          />
        </div>
        <button
          onClick={onRemove}
          className="p-1 rounded-full text-ink-faint/50 hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
          title="Remove bill"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </li>
  )
}

// ── Savings ────────────────────────────────────────────────────
// Track savings goals and auto-detect transfers to savings accounts.
const SAVINGS_KEYWORDS = ['savings', 'isa', 'saver', 'nationwide saver', 'halifax saver', 'easy access', 'instant saver']

// Editable input that uses local state during typing
function EditableNumber({ value, onChange, placeholder, className }) {
  const inputRef = useRef(null)
  const [editing, setEditing] = useState(false)
  const [localValue, setLocalValue] = useState('')

  const displayValue = value || 0

  function handleFocus() {
    setEditing(true)
    setLocalValue(String(displayValue === 0 ? '' : displayValue))
  }

  function handleBlur() {
    setEditing(false)
    const numVal = parseFloat(localValue) || 0
    if (numVal !== displayValue) {
      onChange(numVal)
    }
  }

  function handleChange(e) {
    // Allow empty, numbers, and decimal points only
    const val = e.target.value.replace(/[^0-9.]/g, '')
    setLocalValue(val)
  }

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="decimal"
      value={editing ? localValue : (displayValue || '')}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className={className}
      placeholder={placeholder}
    />
  )
}

function SavingsTab({ txns, settings, setSettings }) {
  const [showAddGoal, setShowAddGoal] = useState(false)
  const [newGoal, setNewGoal] = useState({ name: '', target: '', saved: '', contribution: '' })

  const savingsGoals = settings.savingsGoals || []

  // Detect transfers to savings accounts
  const savingsTransfers = useMemo(() => {
    return txns.filter((t) => {
      if (t.amount >= 0) return false // Only outgoing
      const desc = t.description.toLowerCase()
      return SAVINGS_KEYWORDS.some((k) => desc.includes(k))
    })
  }, [txns])

  const totalToSavings = savingsTransfers.reduce((s, t) => s + Math.abs(t.amount), 0)
  const monthlyToSavings = useMemo(() => {
    const months = new Set(savingsTransfers.map((t) => t.date.slice(0, 7))).size
    return months > 0 ? totalToSavings / months : 0
  }, [savingsTransfers, totalToSavings])

  // Savings rate by month for chart
  const monthlyData = useMemo(() => {
    const data = monthlyCashflow(txns, 12)
    return data.map((m) => ({
      ...m,
      savings: m.net > 0 ? m.net : 0,
      rate: m.in > 0 ? Math.round((m.net / m.in) * 100) : 0,
    }))
  }, [txns])

  const totalGoals = savingsGoals.reduce((s, g) => s + (Number(g.target) || 0), 0)
  const totalSaved = savingsGoals.reduce((s, g) => s + (Number(g.saved) || 0), 0)
  const totalContribution = savingsGoals.reduce((s, g) => s + (Number(g.contribution) || 0), 0)

  // Forecast: project savings for next 3 months
  const forecast = useMemo(() => {
    const now = new Date()
    return [1, 2, 3].map((m) => {
      const date = new Date(now.getFullYear(), now.getMonth() + m, 1)
      const label = date.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })
      return { label, total: totalSaved + totalContribution * m }
    })
  }, [totalSaved, totalContribution])

  function addGoal() {
    if (!newGoal.name || !newGoal.target) return
    setSettings((s) => ({
      ...s,
      savingsGoals: [...(s.savingsGoals || []), {
        id: `goal-${Date.now()}`,
        name: newGoal.name,
        target: Number(newGoal.target),
        saved: Number(newGoal.saved) || 0,
        contribution: Number(newGoal.contribution) || 0,
      }],
    }))
    setNewGoal({ name: '', target: '', saved: '', contribution: '' })
    setShowAddGoal(false)
  }

  function updateGoal(id, patch) {
    setSettings((s) => ({
      ...s,
      savingsGoals: (s.savingsGoals || []).map((g) => (g.id === id ? { ...g, ...patch } : g)),
    }))
  }

  function removeGoal(id) {
    setSettings((s) => ({
      ...s,
      savingsGoals: (s.savingsGoals || []).filter((g) => g.id !== id),
    }))
  }

  // Overall savings (not tied to goals)
  const overallSaved = settings.overallSaved || 0
  const overallContribution = settings.overallContribution || 0

  // Combined totals (overall + goals)
  const combinedSaved = overallSaved + totalSaved
  const combinedContribution = overallContribution + totalContribution

  // Update forecast to use combined totals
  const combinedForecast = [1, 2, 3].map((m) => {
    const date = new Date(new Date().getFullYear(), new Date().getMonth() + m, 1)
    const label = date.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })
    return { label, total: combinedSaved + combinedContribution * m }
  })

  return (
    <div className="space-y-4">
      {/* Stats - editable tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <EditableStatTile
          label="Monthly contribution"
          value={overallContribution}
          onChange={(v) => setSettings(s => ({ ...s, overallContribution: v }))}
          tone="in"
          icon={<PiggyBank className="w-4 h-4" />}
          sub="click to edit"
        />
        <EditableStatTile
          label="Total saved"
          value={overallSaved}
          onChange={(v) => setSettings(s => ({ ...s, overallSaved: v }))}
          tone={combinedSaved > 0 ? 'in' : undefined}
          sub="click to edit"
        />
        <StatTile label="Goals target" value={fmtGBP0(totalGoals)} sub={`${savingsGoals.length} goals`} />
        <StatTile label="In 3 months" value={fmtGBP0(combinedForecast[2]?.total || 0)} tone="in" sub={`+${fmtGBP0(combinedContribution * 3)} projected`} />
      </div>

      {/* Forecast */}
      {combinedContribution > 0 && (
        <div className="glass-strong rounded-3xl p-5">
          <h2 className="text-sm font-bold text-ink mb-3">Savings forecast</h2>
          <div className="grid grid-cols-3 gap-3">
            {combinedForecast.map((f) => (
              <div key={f.label} className="text-center">
                <p className="text-lg font-bold text-emerald-600">{fmtGBP0(f.total)}</p>
                <p className="text-xs text-ink-faint">{f.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Savings rate chart */}
      {monthlyData.length > 1 && (
        <div className="glass-strong rounded-3xl p-5">
          <h2 className="text-sm font-bold text-ink mb-4">Monthly savings</h2>
          <div style={{ width: '100%', height: 200 }}>
            <ResponsiveContainer>
              <ComposedChart data={monthlyData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(44,74,62,0.08)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#8a988f' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#8a988f' }} axisLine={false} tickLine={false} tickFormatter={(v) => `£${v >= 1000 ? `${Math.round(v / 1000)}k` : v}`} />
                <Tooltip
                  formatter={(v, n) => [n === 'rate' ? `${v}%` : fmtGBP(v), n === 'rate' ? 'Savings rate' : 'Saved']}
                  contentStyle={{ borderRadius: 14, border: '1px solid rgba(255,255,255,0.7)', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)', fontSize: 12 }}
                />
                <Bar dataKey="savings" name="Saved" fill="#10b981" radius={[5, 5, 0, 0]} maxBarSize={26} />
                <Line dataKey="rate" name="rate" stroke="#6366f1" strokeWidth={2} dot={{ r: 3, fill: '#6366f1' }} yAxisId="right" />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#8a988f' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Savings goals */}
      <div className="glass-strong rounded-3xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-white/50 flex items-center justify-between">
          <h2 className="text-sm font-bold text-ink">Savings goals</h2>
          <button
            onClick={() => setShowAddGoal(true)}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-full bg-gray-900 text-white hover:bg-gray-800 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add goal
          </button>
        </div>
        {savingsGoals.length === 0 && !showAddGoal ? (
          <p className="px-5 py-8 text-sm text-ink-faint text-center">No savings goals yet — add one to track your progress.</p>
        ) : (
          <ul className="divide-y divide-white/40">
            {savingsGoals.map((g) => {
              const pct = g.target > 0 ? Math.min(100, Math.round((g.saved / g.target) * 100)) : 0
              const monthsLeft = g.contribution > 0 ? Math.ceil((g.target - g.saved) / g.contribution) : null
              return (
                <li key={g.id} className="px-5 py-4 group">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-ink">{g.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-emerald-600">{fmtGBP0(g.saved)}</span>
                      <span className="text-xs text-ink-faint">/ {fmtGBP0(g.target)}</span>
                      <button onClick={() => removeGoal(g.id)} className="p-1 rounded-full text-ink-faint/50 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-white/50 overflow-hidden">
                    <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
                    <span className="text-[11px] text-ink-faint">
                      {pct}% complete{monthsLeft && pct < 100 ? ` · ${monthsLeft} months left` : ''}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-4 p-3 bg-emerald-50/50 rounded-2xl border border-emerald-200">
                    <div>
                      <label className="block text-xs font-medium text-emerald-700 mb-1">Current savings £</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        defaultValue={g.saved || ''}
                        onBlur={(e) => updateGoal(g.id, { saved: Number(e.target.value) || 0 })}
                        className="w-full px-3 py-3 text-base font-semibold bg-white border-2 border-emerald-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        placeholder="Enter amount"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-emerald-700 mb-1">Monthly contribution £</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        defaultValue={g.contribution || ''}
                        onBlur={(e) => updateGoal(g.id, { contribution: Number(e.target.value) || 0 })}
                        className="w-full px-3 py-3 text-base font-semibold bg-white border-2 border-emerald-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        placeholder="Enter amount"
                      />
                    </div>
                  </div>
                </li>
              )
            })}
            {showAddGoal && (
              <li className="px-5 py-4 bg-white/20">
                <div className="flex items-center gap-3 flex-wrap">
                  <input
                    autoFocus
                    type="text"
                    value={newGoal.name}
                    onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })}
                    placeholder="Goal name (e.g. Emergency fund)"
                    className="flex-1 min-w-[180px] px-3 py-2 text-sm bg-white/60 border border-white/70 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                  />
                  <input
                    type="number"
                    value={newGoal.target}
                    onChange={(e) => setNewGoal({ ...newGoal, target: e.target.value })}
                    placeholder="Target £"
                    className="w-24 px-3 py-2 text-sm bg-white/60 border border-white/70 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                  />
                  <input
                    type="number"
                    value={newGoal.saved}
                    onChange={(e) => setNewGoal({ ...newGoal, saved: e.target.value })}
                    placeholder="Already saved £"
                    className="w-28 px-3 py-2 text-sm bg-white/60 border border-white/70 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                  />
                  <input
                    type="number"
                    value={newGoal.contribution}
                    onChange={(e) => setNewGoal({ ...newGoal, contribution: e.target.value })}
                    placeholder="£/month"
                    className="w-24 px-3 py-2 text-sm bg-white/60 border border-white/70 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                  />
                  <button onClick={addGoal} className="px-4 py-2 text-sm font-semibold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700">Add</button>
                  <button onClick={() => setShowAddGoal(false)} className="px-4 py-2 text-sm font-semibold text-ink-soft hover:text-ink">Cancel</button>
                </div>
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  )
}

// ── Debt ───────────────────────────────────────────────────────
// Track debts with balances, interest rates, and payoff progress.
function DebtTab({ settings, setSettings }) {
  const [showAddDebt, setShowAddDebt] = useState(false)
  const [newDebt, setNewDebt] = useState({ name: '', balance: '', apr: '', minPayment: '' })

  const debts = settings.debts || []
  const totalDebt = debts.reduce((s, d) => s + (Number(d.balance) || 0), 0)
  const totalMinPayment = debts.reduce((s, d) => s + (Number(d.minPayment) || 0), 0)
  const avgApr = debts.length > 0 ? debts.reduce((s, d) => s + (Number(d.apr) || 0), 0) / debts.length : 0

  // Calculate months until debt-free (simplified, ignores interest compounding)
  const monthsToPayoff = totalMinPayment > 0 ? Math.ceil(totalDebt / totalMinPayment) : null
  const payoffDate = monthsToPayoff ? new Date(Date.now() + monthsToPayoff * 30 * 24 * 60 * 60 * 1000) : null

  function addDebt() {
    if (!newDebt.name || !newDebt.balance) return
    setSettings((s) => ({
      ...s,
      debts: [...(s.debts || []), {
        id: `debt-${Date.now()}`,
        name: newDebt.name,
        balance: Number(newDebt.balance) || 0,
        apr: Number(newDebt.apr) || 0,
        minPayment: Number(newDebt.minPayment) || 0,
        originalBalance: Number(newDebt.balance) || 0,
      }],
    }))
    setNewDebt({ name: '', balance: '', apr: '', minPayment: '' })
    setShowAddDebt(false)
  }

  function updateDebt(id, patch) {
    setSettings((s) => ({
      ...s,
      debts: (s.debts || []).map((d) => (d.id === id ? { ...d, ...patch } : d)),
    }))
  }

  function removeDebt(id) {
    setSettings((s) => ({
      ...s,
      debts: (s.debts || []).filter((d) => d.id !== id),
    }))
  }

  // Chart data: debt balances
  const chartData = debts.map((d) => ({
    name: d.name,
    balance: d.balance,
    original: d.originalBalance || d.balance,
    paid: (d.originalBalance || d.balance) - d.balance,
  }))

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile label="Total debt" value={fmtGBP0(totalDebt)} tone="neg" icon={<CreditCard className="w-4 h-4" />} sub={`${debts.length} account${debts.length === 1 ? '' : 's'}`} />
        <StatTile label="Monthly payments" value={fmtGBP0(totalMinPayment)} tone="out" sub="per month" />
        <StatTile
          label="Debt free"
          value={payoffDate ? payoffDate.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : '—'}
          tone={monthsToPayoff && monthsToPayoff <= 12 ? 'in' : undefined}
          sub={monthsToPayoff ? `${monthsToPayoff} months left` : 'add payments'}
        />
        <StatTile label="Monthly interest" value={fmtGBP0(totalDebt * (avgApr / 100) / 12)} tone="neg" sub={`${avgApr.toFixed(1)}% avg APR`} />
      </div>

      {/* Debt progress chart */}
      {chartData.length > 0 && (
        <div className="glass-strong rounded-3xl p-5">
          <h2 className="text-sm font-bold text-ink mb-4">Debt breakdown</h2>
          <div style={{ width: '100%', height: 200 }}>
            <ResponsiveContainer>
              <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(44,74,62,0.08)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#8a988f' }} axisLine={false} tickLine={false} tickFormatter={(v) => `£${v >= 1000 ? `${Math.round(v / 1000)}k` : v}`} />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11, fill: '#5a6b62' }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(v, n) => [fmtGBP(v), n === 'paid' ? 'Paid off' : 'Remaining']}
                  contentStyle={{ borderRadius: 14, border: '1px solid rgba(255,255,255,0.7)', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)', fontSize: 12 }}
                />
                <Bar dataKey="paid" name="paid" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                <Bar dataKey="balance" name="Remaining" stackId="a" fill="#ef4444" radius={[0, 5, 5, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Debt accounts */}
      <div className="glass-strong rounded-3xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-white/50 flex items-center justify-between">
          <h2 className="text-sm font-bold text-ink">Debt accounts</h2>
          <button
            onClick={() => setShowAddDebt(true)}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-full bg-gray-900 text-white hover:bg-gray-800 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add debt
          </button>
        </div>
        {debts.length === 0 && !showAddDebt ? (
          <p className="px-5 py-8 text-sm text-ink-faint text-center">No debts tracked — add one to monitor your payoff progress.</p>
        ) : (
          <ul className="divide-y divide-white/40">
            {debts.map((d) => {
              const paidOff = (d.originalBalance || d.balance) - d.balance
              const pct = d.originalBalance > 0 ? Math.round((paidOff / d.originalBalance) * 100) : 0
              return (
                <li key={d.id} className="px-5 py-4 group">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-sm font-semibold text-ink">{d.name}</span>
                      {d.apr > 0 && <span className="text-[11px] text-ink-faint ml-2">{d.apr}% APR</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-red-500">{fmtGBP0(d.balance)}</span>
                      <button onClick={() => removeDebt(d.id)} className="p-1 rounded-full text-ink-faint/50 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  {d.originalBalance > d.balance && (
                    <>
                      <div className="h-2 rounded-full bg-red-500/20 overflow-hidden">
                        <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-[11px] text-ink-faint mt-1">{fmtGBP0(paidOff)} paid off ({pct}%)</p>
                    </>
                  )}
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-ink-faint">Balance £</span>
                      <EditableNumber
                        value={d.balance}
                        onChange={(v) => updateDebt(d.id, { balance: v })}
                        className="w-24 px-2 py-1 text-xs bg-white/50 border border-white/70 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-ink-faint">Payment £</span>
                      <EditableNumber
                        value={d.minPayment}
                        onChange={(v) => updateDebt(d.id, { minPayment: v })}
                        className="w-20 px-2 py-1 text-xs bg-white/50 border border-white/70 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                      />
                    </div>
                  </div>
                </li>
              )
            })}
            {showAddDebt && (
              <li className="px-5 py-4 bg-white/20">
                <div className="grid grid-cols-4 gap-3">
                  <input
                    autoFocus
                    type="text"
                    value={newDebt.name}
                    onChange={(e) => setNewDebt({ ...newDebt, name: e.target.value })}
                    placeholder="Name (e.g. Credit Card)"
                    className="col-span-2 px-3 py-2 text-sm bg-white/60 border border-white/70 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                  />
                  <input
                    type="number"
                    value={newDebt.balance}
                    onChange={(e) => setNewDebt({ ...newDebt, balance: e.target.value })}
                    placeholder="Balance £"
                    className="px-3 py-2 text-sm bg-white/60 border border-white/70 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                  />
                  <input
                    type="number"
                    value={newDebt.apr}
                    onChange={(e) => setNewDebt({ ...newDebt, apr: e.target.value })}
                    placeholder="APR %"
                    className="px-3 py-2 text-sm bg-white/60 border border-white/70 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                  />
                </div>
                <div className="flex items-center gap-3 mt-3">
                  <input
                    type="number"
                    value={newDebt.minPayment}
                    onChange={(e) => setNewDebt({ ...newDebt, minPayment: e.target.value })}
                    placeholder="Min payment £/mo"
                    className="w-40 px-3 py-2 text-sm bg-white/60 border border-white/70 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                  />
                  <button onClick={addDebt} className="px-4 py-2 text-sm font-semibold bg-red-500 text-white rounded-xl hover:bg-red-600">Add</button>
                  <button onClick={() => setShowAddDebt(false)} className="px-4 py-2 text-sm font-semibold text-ink-soft hover:text-ink">Cancel</button>
                </div>
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  )
}

// ── Mortgage ────────────────────────────────────────────────────
// Track mortgage with balance, payments, and equity.
function MortgageTab({ settings, setSettings }) {
  const mortgage = settings.mortgage || {}
  const hasMortgage = mortgage.balance > 0

  function updateMortgage(patch) {
    setSettings((s) => ({ ...s, mortgage: { ...s.mortgage, ...patch } }))
  }

  // Calculate payoff timeline
  const monthlyPayment = Number(mortgage.payment) || 0
  const balance = Number(mortgage.balance) || 0
  const rate = Number(mortgage.rate) || 0
  const propertyValue = Number(mortgage.propertyValue) || 0
  const equity = propertyValue - balance
  const ltv = propertyValue > 0 ? (balance / propertyValue) * 100 : 0

  // Estimate months to payoff (simplified, ignores interest compounding for display)
  const monthlyInterest = balance * (rate / 100) / 12
  const principalPayment = monthlyPayment - monthlyInterest
  const monthsToPayoff = principalPayment > 0 ? Math.ceil(balance / principalPayment) : null
  const payoffDate = monthsToPayoff ? new Date(Date.now() + monthsToPayoff * 30 * 24 * 60 * 60 * 1000) : null
  const yearsLeft = monthsToPayoff ? Math.floor(monthsToPayoff / 12) : null
  const monthsLeft = monthsToPayoff ? monthsToPayoff % 12 : null

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile label="Outstanding" value={fmtGBP0(balance)} tone="neg" icon={<Home className="w-4 h-4" />} sub="mortgage balance" />
        <StatTile label="Equity" value={fmtGBP0(equity)} tone={equity > 0 ? 'in' : undefined} sub={propertyValue > 0 ? `${(100 - ltv).toFixed(0)}% ownership` : 'set property value'} />
        <StatTile label="Monthly" value={fmtGBP0(monthlyPayment)} tone="out" sub={`${fmtGBP0(principalPayment)} principal`} />
        <StatTile
          label="Mortgage free"
          value={payoffDate ? payoffDate.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : '—'}
          icon={<Calendar className="w-4 h-4" />}
          sub={yearsLeft !== null ? `${yearsLeft}y ${monthsLeft}m left` : 'add details'}
        />
      </div>

      {/* LTV Progress */}
      {propertyValue > 0 && (
        <div className="glass-strong rounded-3xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-ink">Loan to Value (LTV)</h2>
            <span className="text-sm font-bold text-ink">{ltv.toFixed(1)}%</span>
          </div>
          <div className="h-4 rounded-full bg-red-500/20 overflow-hidden">
            <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${100 - ltv}%` }} />
          </div>
          <div className="flex justify-between mt-2 text-[11px] text-ink-faint">
            <span>Equity: {fmtGBP0(equity)}</span>
            <span>Owed: {fmtGBP0(balance)}</span>
          </div>
        </div>
      )}

      {/* Mortgage Details Form */}
      <div className="glass-strong rounded-3xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-white/50">
          <h2 className="text-sm font-bold text-ink">Mortgage details</h2>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-ink-faint mb-1">Outstanding balance</label>
              <EditableNumber
                value={mortgage.balance}
                onChange={(v) => updateMortgage({ balance: v })}
                className="w-full px-3 py-2 text-sm bg-white/50 border border-white/70 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                placeholder="e.g. 200000"
              />
            </div>
            <div>
              <label className="block text-xs text-ink-faint mb-1">Property value</label>
              <EditableNumber
                value={mortgage.propertyValue}
                onChange={(v) => updateMortgage({ propertyValue: v })}
                className="w-full px-3 py-2 text-sm bg-white/50 border border-white/70 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                placeholder="e.g. 300000"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-ink-faint mb-1">Monthly payment</label>
              <EditableNumber
                value={mortgage.payment}
                onChange={(v) => updateMortgage({ payment: v })}
                className="w-full px-3 py-2 text-sm bg-white/50 border border-white/70 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                placeholder="e.g. 1200"
              />
            </div>
            <div>
              <label className="block text-xs text-ink-faint mb-1">Interest rate (%)</label>
              <EditableNumber
                value={mortgage.rate}
                onChange={(v) => updateMortgage({ rate: v })}
                className="w-full px-3 py-2 text-sm bg-white/50 border border-white/70 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                placeholder="e.g. 4.5"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-ink-faint mb-1">Lender</label>
            <input
              type="text"
              value={mortgage.lender || ''}
              onChange={(e) => updateMortgage({ lender: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-white/50 border border-white/70 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/10"
              placeholder="e.g. Nationwide"
            />
          </div>
        </div>
      </div>

      {/* Overpayment calculator */}
      {hasMortgage && monthlyPayment > 0 && (
        <div className="glass-strong rounded-3xl p-5">
          <h2 className="text-sm font-bold text-ink mb-3">Overpayment impact</h2>
          <p className="text-xs text-ink-faint mb-3">Extra monthly payment reduces your term and interest paid.</p>
          <div className="grid grid-cols-3 gap-3 text-center">
            {[50, 100, 200].map((extra) => {
              const newPrincipal = principalPayment + extra
              const newMonths = newPrincipal > 0 ? Math.ceil(balance / newPrincipal) : null
              const saved = monthsToPayoff && newMonths ? (monthsToPayoff - newMonths) : 0
              return (
                <div key={extra} className="bg-white/30 rounded-2xl p-3">
                  <p className="text-sm font-bold text-emerald-600">+£{extra}/mo</p>
                  <p className="text-xs text-ink-faint mt-1">{saved > 0 ? `${Math.floor(saved / 12)}y ${saved % 12}m faster` : '—'}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Transactions ────────────────────────────────────────────────
// Full transaction list with AI categorization and manual overrides.
const ALL_CATEGORIES = [
  'Groceries', 'Eating out', 'Transport', 'Shopping', 'Utilities',
  'Telecoms', 'Subscriptions', 'Housing', 'Insurance', 'Cash',
  'Transfers', 'Income', 'Other'
]

function TransactionsTab({ txns, settings, setSettings }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [sortBy, setSortBy] = useState('date')
  const [sortDir, setSortDir] = useState('desc')

  // Get category for a transaction (manual override or AI)
  const getCategory = useCallback((txn) => {
    const overrides = settings.categoryOverrides || {}
    if (overrides[txn.id]) return overrides[txn.id]
    return categorise(txn)
  }, [settings.categoryOverrides])

  // Set manual category override
  const setCategory = useCallback((txnId, category) => {
    setSettings(s => ({
      ...s,
      categoryOverrides: { ...s.categoryOverrides, [txnId]: category }
    }))
  }, [setSettings])

  // Clear manual override (revert to AI)
  const clearOverride = useCallback((txnId) => {
    setSettings(s => {
      const { [txnId]: _, ...rest } = s.categoryOverrides || {}
      return { ...s, categoryOverrides: rest }
    })
  }, [setSettings])

  // Process and filter transactions
  const processedTxns = useMemo(() => {
    let result = txns.map(t => ({
      ...t,
      category: getCategory(t),
      isOverride: !!(settings.categoryOverrides || {})[t.id]
    }))

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(t => t.description.toLowerCase().includes(term))
    }

    // Category filter
    if (filterCategory !== 'all') {
      result = result.filter(t => t.category === filterCategory)
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'date') {
        return sortDir === 'desc'
          ? new Date(b.date) - new Date(a.date)
          : new Date(a.date) - new Date(b.date)
      }
      if (sortBy === 'amount') {
        return sortDir === 'desc'
          ? Math.abs(b.amount) - Math.abs(a.amount)
          : Math.abs(a.amount) - Math.abs(b.amount)
      }
      return 0
    })

    return result
  }, [txns, searchTerm, filterCategory, sortBy, sortDir, getCategory, settings.categoryOverrides])

  // Category stats
  const categoryStats = useMemo(() => {
    const stats = {}
    for (const t of txns) {
      const cat = getCategory(t)
      if (!stats[cat]) stats[cat] = { count: 0, total: 0 }
      stats[cat].count++
      stats[cat].total += Math.abs(t.amount)
    }
    return stats
  }, [txns, getCategory])

  const overrideCount = Object.keys(settings.categoryOverrides || {}).length

  if (!txns.length) return <EmptyTab label="No transactions yet — import a bank statement first." />

  return (
    <div className="space-y-4">
      {/* Header stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile label="Transactions" value={txns.length} sub="total imported" />
        <StatTile label="Categorized" value={`${txns.length - (categoryStats['Other']?.count || 0)}`} tone="in" icon={<Sparkles className="w-4 h-4" />} sub="by AI" />
        <StatTile label="Manual" value={overrideCount} sub="overrides" />
        <StatTile label="Uncategorized" value={categoryStats['Other']?.count || 0} sub="need review" />
      </div>

      {/* Filters */}
      <div className="glass-strong rounded-3xl p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search transactions..."
              className="w-full pl-10 pr-4 py-2 text-sm bg-white/60 border border-white/70 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/10"
            />
          </div>

          {/* Category filter */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 text-sm bg-white/60 border border-white/70 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/10"
          >
            <option value="all">All categories</option>
            {ALL_CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat} ({categoryStats[cat]?.count || 0})</option>
            ))}
          </select>

          {/* Sort */}
          <select
            value={`${sortBy}-${sortDir}`}
            onChange={(e) => {
              const [by, dir] = e.target.value.split('-')
              setSortBy(by)
              setSortDir(dir)
            }}
            className="px-3 py-2 text-sm bg-white/60 border border-white/70 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/10"
          >
            <option value="date-desc">Newest first</option>
            <option value="date-asc">Oldest first</option>
            <option value="amount-desc">Highest amount</option>
            <option value="amount-asc">Lowest amount</option>
          </select>
        </div>
      </div>

      {/* Transaction list */}
      <div className="glass-strong rounded-3xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-white/50 flex items-center justify-between">
          <h2 className="text-sm font-bold text-ink">
            {filterCategory === 'all' ? 'All transactions' : filterCategory}
            <span className="text-ink-faint font-normal ml-2">({processedTxns.length})</span>
          </h2>
        </div>

        <div className="max-h-[500px] overflow-y-auto divide-y divide-white/40">
          {processedTxns.slice(0, 100).map((t) => (
            <TransactionRow
              key={t.id}
              txn={t}
              onSetCategory={(cat) => setCategory(t.id, cat)}
              onClearOverride={() => clearOverride(t.id)}
            />
          ))}
          {processedTxns.length > 100 && (
            <p className="px-5 py-3 text-xs text-ink-faint text-center">
              Showing first 100 of {processedTxns.length} transactions
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function TransactionRow({ txn, onSetCategory, onClearOverride }) {
  const [showCategoryPicker, setShowCategoryPicker] = useState(false)
  const isIncome = txn.amount >= 0

  return (
    <div className="px-5 py-3 hover:bg-white/30 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-ink truncate">{txn.description}</p>
          <p className="text-xs text-ink-faint mt-0.5">
            {new Date(txn.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>
        <div className="text-right">
          <p className={`text-sm font-bold ${isIncome ? 'text-emerald-600' : 'text-ink'}`}>
            {isIncome ? '+' : ''}{fmtGBP(txn.amount)}
          </p>
        </div>
      </div>

      {/* Category selector */}
      <div className="mt-2 flex items-center gap-2">
        <div className="relative">
          <button
            onClick={() => setShowCategoryPicker(!showCategoryPicker)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
              txn.isOverride
                ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                : 'bg-white/60 text-ink-soft border border-white/70 hover:bg-white/80'
            }`}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: CATEGORY_COLORS[txn.category] || CATEGORY_COLORS.Other }}
            />
            {txn.category}
            <ChevronDown className="w-3 h-3" />
          </button>

          {showCategoryPicker && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowCategoryPicker(false)} />
              <div className="absolute left-0 top-full mt-1 z-20 bg-white rounded-xl shadow-lg border border-gray-200 py-1 min-w-[160px]">
                {ALL_CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => {
                      onSetCategory(cat)
                      setShowCategoryPicker(false)
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 flex items-center gap-2 ${
                      txn.category === cat ? 'font-semibold' : ''
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: CATEGORY_COLORS[cat] || CATEGORY_COLORS.Other }}
                    />
                    {cat}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {txn.isOverride && (
          <button
            onClick={onClearOverride}
            className="text-[10px] text-ink-faint hover:text-ink-soft"
          >
            Reset to AI
          </button>
        )}

        {!txn.isOverride && (
          <span className="inline-flex items-center gap-1 text-[10px] text-ink-faint">
            <Sparkles className="w-3 h-3" /> AI
          </span>
        )}
      </div>
    </div>
  )
}

// ── Breakdown ──────────────────────────────────────────────────
function BreakdownTab({ txns }) {
  const [period, setPeriod] = useState('30') // '30', '90', 'all'

  // Filter to selected period
  const filteredTxns = useMemo(() => {
    if (period === 'all') return txns
    const days = Number(period)
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    return txns.filter((t) => new Date(t.date) >= cutoff)
  }, [txns, period])

  const { total, rows } = useMemo(() => categoryBreakdown(filteredTxns), [filteredTxns])
  const income = useMemo(() => filteredTxns.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0), [filteredTxns])

  // Calculate monthly average
  const months = period === 'all'
    ? Math.max(1, new Set(txns.map(t => t.date.slice(0, 7))).size)
    : Number(period) / 30
  const monthlyOut = total / months
  const monthlyIn = income / months

  if (!rows.length) return <EmptyTab label="No spending to break down yet — import a statement first." />

  return (
    <div className="space-y-4">
      {/* Period selector */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-ink-faint">Show:</span>
        {[
          { value: '30', label: 'Last 30 days' },
          { value: '90', label: 'Last 3 months' },
          { value: 'all', label: 'All time' },
        ].map((opt) => (
          <button
            key={opt.value}
            onClick={() => setPeriod(opt.value)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
              period === opt.value
                ? 'bg-gray-900 text-white'
                : 'bg-white/50 text-ink-soft hover:bg-white/70'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile label="Income" value={fmtGBP0(income)} tone="in" sub={period !== 'all' ? `${period} days` : 'all time'} />
        <StatTile label="Spending" value={fmtGBP0(total)} tone="out" sub={period !== 'all' ? `${period} days` : 'all time'} />
        <StatTile label="Avg / month in" value={fmtGBP0(monthlyIn)} tone="in" sub="monthly avg" />
        <StatTile label="Avg / month out" value={fmtGBP0(monthlyOut)} tone="out" sub="monthly avg" />
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
function SyncIndicator({ status, lastSynced }) {
  const formatTime = (date) => {
    if (!date) return ''
    const now = new Date()
    const diff = now - date
    if (diff < 60000) return 'just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  }

  if (status === 'syncing') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-ink-faint">
        <RefreshCw className="w-3 h-3 animate-spin" />
        <span>syncing…</span>
      </span>
    )
  }
  if (status === 'synced') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600" title={lastSynced ? `Last synced: ${lastSynced.toLocaleString('en-GB')}` : ''}>
        <Cloud className="w-3 h-3" />
        <span>synced {formatTime(lastSynced)}</span>
      </span>
    )
  }
  if (status === 'error') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-amber-600" title="Couldn't sync to cloud — changes saved locally">
        <CloudOff className="w-3 h-3" />
        <span>offline</span>
      </span>
    )
  }
  return null
}

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

function EditableStatTile({ label, value, onChange, sub, tone, icon }) {
  const [editing, setEditing] = useState(false)
  const [inputVal, setInputVal] = useState('')
  const toneColor = tone === 'in' ? 'text-emerald-600' : tone === 'out' ? 'text-ink' : tone === 'neg' ? 'text-red-500' : 'text-ink'

  function handleClick() {
    setInputVal(value || '')
    setEditing(true)
  }

  function handleBlur() {
    setEditing(false)
    const numVal = Number(inputVal) || 0
    if (numVal !== value) onChange(numVal)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      e.target.blur()
    }
    if (e.key === 'Escape') {
      setEditing(false)
    }
  }

  if (editing) {
    return (
      <div className="glass-strong rounded-3xl p-4 ring-2 ring-emerald-500">
        <div className="flex items-center gap-1.5 text-ink-faint mb-1">
          {icon}<span className="text-[11px] font-semibold uppercase tracking-wide">{label}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className={`text-xl font-extrabold ${toneColor}`}>£</span>
          <input
            autoFocus
            type="number"
            inputMode="decimal"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="w-full text-xl font-extrabold bg-transparent border-none outline-none"
            placeholder="0"
          />
        </div>
        <p className="text-[11px] text-emerald-600 mt-0.5">tap outside to save</p>
      </div>
    )
  }

  return (
    <div
      onClick={handleClick}
      className="glass-strong rounded-3xl p-4 cursor-pointer hover:ring-2 hover:ring-emerald-300 transition-all"
    >
      <div className="flex items-center gap-1.5 text-ink-faint mb-1">
        {icon}<span className="text-[11px] font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <p className={`text-xl font-extrabold tracking-tight ${toneColor}`}>{fmtGBP0(value)}</p>
      {sub && <p className="text-[11px] text-ink-faint mt-0.5">{sub}</p>}
    </div>
  )
}

function EditableIncomeTile({ income, bankIncome, isManual, editing, onEdit, onSave, onCancel }) {
  const [inputVal, setInputVal] = useState(income || '')

  useEffect(() => {
    if (editing) setInputVal(income || '')
  }, [editing, income])

  if (editing) {
    return (
      <div className="glass-strong rounded-3xl p-4">
        <div className="flex items-center gap-1.5 text-ink-faint mb-1">
          <TrendingUp className="w-4 h-4" />
          <span className="text-[11px] font-semibold uppercase tracking-wide">Income</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xl font-extrabold text-emerald-600">£</span>
          <input
            autoFocus
            type="number"
            min="0"
            step="100"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSave(inputVal ? Number(inputVal) : null)
              if (e.key === 'Escape') onCancel()
            }}
            onBlur={() => onSave(inputVal ? Number(inputVal) : null)}
            className="w-full text-xl font-extrabold text-emerald-600 bg-white/60 border border-emerald-300 rounded-lg px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            placeholder="0"
          />
        </div>
        <p className="text-[11px] text-ink-faint mt-0.5">Enter to save, blank for bank avg</p>
      </div>
    )
  }

  return (
    <button onClick={onEdit} className="glass-strong rounded-3xl p-4 text-left hover:bg-white/60 transition-colors group w-full">
      <div className="flex items-center gap-1.5 text-ink-faint mb-1">
        <TrendingUp className="w-4 h-4" />
        <span className="text-[11px] font-semibold uppercase tracking-wide">Income</span>
        <Pencil className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-60 transition-opacity" />
      </div>
      <p className="text-xl font-extrabold tracking-tight text-emerald-600">{fmtGBP0(income)}</p>
      <p className="text-[11px] text-ink-faint mt-0.5">
        {isManual ? 'manual' : 'avg / month'}{bankIncome > 0 && isManual ? ` (bank: ${fmtGBP0(bankIncome)})` : ''}
      </p>
    </button>
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
        Data syncs across your devices and stays separate from Flair business data.
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
