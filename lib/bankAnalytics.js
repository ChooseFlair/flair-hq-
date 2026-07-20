// Analytics over imported bank transactions. Pure functions, no I/O.
// A transaction is { id, date (ISO), description, amount (signed), balance }.

export const monthKey = (iso) => iso.slice(0, 7) // "YYYY-MM"

export function monthLabel(key) {
  const [y, m] = key.split('-')
  const d = new Date(Date.UTC(+y, +m - 1, 1))
  return d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })
}

// Money in / out / net per calendar month, oldest → newest, last `limit` months.
export function monthlyCashflow(txns, limit = 12) {
  const buckets = new Map()
  for (const t of txns) {
    const k = monthKey(t.date)
    if (!buckets.has(k)) buckets.set(k, { month: k, in: 0, out: 0 })
    const b = buckets.get(k)
    if (t.amount >= 0) b.in += t.amount
    else b.out += Math.abs(t.amount)
  }
  const rows = [...buckets.values()]
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((b) => ({ ...b, net: b.in - b.out, label: monthLabel(b.month) }))
  return rows.slice(-limit)
}

export function cashflowSummary(txns) {
  const rows = monthlyCashflow(txns, 120)
  if (!rows.length) return { avgIn: 0, avgOut: 0, avgNet: 0, months: 0 }
  const n = rows.length
  const sum = (k) => rows.reduce((s, r) => s + r[k], 0)
  return { avgIn: sum('in') / n, avgOut: sum('out') / n, avgNet: sum('net') / n, months: n }
}

// ── Categorisation ───────────────────────────────────────────
const CATEGORY_RULES = [
  ['Groceries', ['tesco', 'sainsbury', 'asda', 'aldi', 'lidl', 'morrison', 'waitrose', 'co-op', 'coop', 'iceland', 'ocado', 'marks spencer', 'm&s']],
  ['Eating out', ['restaurant', 'cafe', 'coffee', 'costa', 'starbucks', 'greggs', 'mcdonald', 'kfc', 'burger', 'deliveroo', 'uber eat', 'just eat', 'nando', 'pizza', 'pub', 'bar ']],
  ['Transport', [' tfl ', 'uber', 'trainline', 'petrol', 'shell', ' bp ', 'esso', 'fuel', 'parking', 'railway', ' rail ', 'train', ' bus ', 'taxi']],
  ['Shopping', ['amazon', 'ebay', 'argos', 'asos', 'next ', 'primark', 'apple', 'currys', 'boots', 'superdrug', 'ikea', 'john lewis']],
  ['Utilities', ['british gas', 'edf', 'e.on', 'eon', 'octopus', 'water', 'council tax', 'tv licence', 'tv license']],
  ['Telecoms', ['bt ', 'sky', 'virgin', 'vodafone', 'o2', ' ee ', 'three', 'plusnet', 'talktalk', 'broadband', 'mobile']],
  ['Subscriptions', ['netflix', 'spotify', 'disney', 'prime video', 'youtube', 'audible', 'icloud', 'gym', 'patreon', 'playstation', 'xbox']],
  ['Housing', ['rent', 'mortgage', 'landlord', 'letting']],
  ['Insurance', ['insurance', 'aviva', 'admiral', 'direct line', 'churchill']],
  ['Cash', ['atm', 'cash withdrawal', 'withdrawal', 'link ']],
  ['Transfers', ['transfer', 'faster payment', 'fpo', 'to savings', 'standing order']],
]

export function categorise(t) {
  if (t.amount >= 0) return 'Income'
  const d = ` ${t.description.toLowerCase()} `
  for (const [cat, keys] of CATEGORY_RULES) {
    if (keys.some((k) => d.includes(k))) return cat
  }
  return 'Other'
}

export const CATEGORY_COLORS = {
  Groceries: '#10b981',
  'Eating out': '#f59e0b',
  Transport: '#3b82f6',
  Shopping: '#ec4899',
  Utilities: '#6366f1',
  Telecoms: '#8b5cf6',
  Subscriptions: '#14b8a6',
  Housing: '#ef4444',
  Insurance: '#0ea5e9',
  Cash: '#64748b',
  Transfers: '#a855f7',
  Income: '#22c55e',
  Other: '#94a3b8',
}

// Spending (expenses only) grouped by category, largest first.
export function categoryBreakdown(txns) {
  const map = new Map()
  let total = 0
  for (const t of txns) {
    if (t.amount >= 0) continue
    const cat = categorise(t)
    const amt = Math.abs(t.amount)
    map.set(cat, (map.get(cat) || 0) + amt)
    total += amt
  }
  return {
    total,
    rows: [...map.entries()]
      .map(([category, amount]) => ({ category, amount, color: CATEGORY_COLORS[category] || '#94a3b8' }))
      .sort((a, b) => b.amount - a.amount),
  }
}

// Normalise a merchant/description for grouping recurring payments.
function normDesc(desc) {
  return desc
    .toUpperCase()
    .replace(/\d{2}[/\-.]\d{2}([/\-.]\d{2,4})?/g, ' ') // dates
    .replace(/\b\d[\d,]*\.?\d*\b/g, ' ') // numbers / card refs
    .replace(/[^A-Z& ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .slice(0, 3)
    .join(' ')
}

// Recurring outgoings: same-ish payee appearing in ≥2 distinct months.
// Returns [{ payee, monthly, count, months, category, lastDate }] by size.
export function detectRecurringBills(txns) {
  const groups = new Map()
  for (const t of txns) {
    if (t.amount >= 0) continue
    const key = normDesc(t.description)
    if (key.length < 3) continue
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(t)
  }

  const bills = []
  for (const [payee, items] of groups) {
    const months = new Set(items.map((t) => monthKey(t.date)))
    if (months.size < 2) continue // must repeat across months
    const amounts = items.map((t) => Math.abs(t.amount)).sort((a, b) => a - b)
    const monthly = amounts[Math.floor(amounts.length / 2)] // median
    const last = items.slice().sort((a, b) => new Date(b.date) - new Date(a.date))[0]
    bills.push({
      payee: payee.charAt(0) + payee.slice(1).toLowerCase(),
      monthly,
      count: items.length,
      months: months.size,
      category: categorise(items[0]),
      color: CATEGORY_COLORS[categorise(items[0])] || '#94a3b8',
      lastDate: last.date,
    })
  }
  return bills.sort((a, b) => b.monthly - a.monthly)
}
