// Tolerant CSV parser for UK bank statement exports (Nationwide, Halifax,
// and most generic formats). Runs entirely in the browser — nothing leaves
// the page. Auto-detects the header row and maps common column names.

function splitCsvLine(line) {
  const out = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++ } else inQuotes = false
      } else cur += ch
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      out.push(cur); cur = ''
    } else {
      cur += ch
    }
  }
  out.push(cur)
  return out.map((s) => s.trim())
}

// "£1,234.56", "(50.00)", "-12.30", "" → number | null
function parseAmount(raw) {
  if (raw == null) return null
  const str = String(raw).trim()
  if (str === '' || str === '-') return null
  const neg = /^\(.*\)$/.test(str) || str.startsWith('-') || /\bDR\b/i.test(str)
  const cleaned = str.replace(/[£$,\s()]/g, '').replace(/-/g, '').replace(/[A-Za-z]/g, '')
  if (cleaned === '') return null
  const n = parseFloat(cleaned)
  if (isNaN(n)) return null
  return neg ? -n : n
}

// DD/MM/YYYY, YYYY-MM-DD, "12 Jan 2026" → ISO string | null
function parseDate(raw) {
  if (!raw) return null
  const s = String(raw).trim()
  let m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/)
  if (m) {
    let [, d, mo, y] = m
    if (y.length === 2) y = '20' + y
    return new Date(Date.UTC(+y, +mo - 1, +d)).toISOString()
  }
  m = s.match(/^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})$/)
  if (m) {
    const [, y, mo, d] = m
    return new Date(Date.UTC(+y, +mo - 1, +d)).toISOString()
  }
  const dt = new Date(s)
  return isNaN(dt.getTime()) ? null : dt.toISOString()
}

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z]/g, '')

function findHeaderRow(rows) {
  for (let i = 0; i < Math.min(rows.length, 30); i++) {
    const cells = rows[i].map(norm)
    const hasDate = cells.some((c) => c.includes('date'))
    const hasMoney = cells.some((c) =>
      ['amount', 'paidin', 'paidout', 'debit', 'credit', 'balance', 'moneyin', 'moneyout', 'value'].some((k) => c.includes(k))
    )
    const hasDesc = cells.some((c) =>
      ['description', 'details', 'reference', 'narrative', 'type', 'memo', 'transaction'].some((k) => c.includes(k))
    )
    if (hasDate && (hasMoney || hasDesc)) return i
  }
  return -1
}

export function parseBankCsv(text) {
  const rows = text
    .split(/\r\n|\r|\n/)
    .filter((l) => l.trim() !== '')
    .map(splitCsvLine)

  const headerIdx = findHeaderRow(rows)
  if (headerIdx === -1) {
    throw new Error("Couldn't find a transaction table in this file. Make sure it's the CSV export from your bank.")
  }

  const header = rows[headerIdx].map(norm)
  const find = (test) => header.findIndex(test)

  const idxDate = find((h) => h.includes('date'))
  const idxDesc = find((h) => ['description', 'details', 'narrative', 'reference', 'memo'].some((k) => h.includes(k)))
  const idxType = find((h) => h.includes('type'))
  const idxAmount = find((h) => h === 'amount' || h === 'value')
  const idxPaidIn = find((h) => ['paidin', 'creditamount', 'credit', 'moneyin'].some((k) => h.includes(k)))
  const idxPaidOut = find((h) => ['paidout', 'debitamount', 'debit', 'moneyout'].some((k) => h.includes(k)))
  const idxBalance = find((h) => h.includes('balance'))

  const txns = []
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const r = rows[i]
    if (!r || r.every((c) => c === '')) continue

    const date = idxDate >= 0 ? parseDate(r[idxDate]) : null

    let amount = null
    if (idxAmount >= 0) {
      amount = parseAmount(r[idxAmount])
    } else {
      const pin = idxPaidIn >= 0 ? parseAmount(r[idxPaidIn]) : null
      const pout = idxPaidOut >= 0 ? parseAmount(r[idxPaidOut]) : null
      if (pin != null || pout != null) amount = (pin || 0) - Math.abs(pout || 0)
    }

    let description = idxDesc >= 0 ? r[idxDesc] : ''
    if (!description && idxType >= 0) description = r[idxType]

    if (date == null && amount == null) continue

    txns.push({
      id: `${date || 'na'}-${amount == null ? 'na' : amount}-${(description || '').slice(0, 24)}-${i}`,
      date: date || new Date().toISOString(),
      description: description || '—',
      amount: amount == null ? 0 : amount,
      balance: idxBalance >= 0 ? parseAmount(r[idxBalance]) : null,
    })
  }

  if (!txns.length) throw new Error('No transactions found in the file.')
  return txns
}

// Newest transaction's running balance, if the export included one.
export function currentBalance(txns) {
  const withBal = txns.filter((t) => t.balance != null)
  if (!withBal.length) return null
  return withBal.slice().sort((a, b) => new Date(b.date) - new Date(a.date))[0].balance
}

export function netImported(txns) {
  return txns.reduce((s, t) => s + (t.amount || 0), 0)
}

// Merge new transactions into existing, de-duping identical rows so
// re-importing an overlapping statement doesn't double-count.
export function mergeTransactions(existing, incoming) {
  const key = (t) => `${t.date}|${t.amount}|${t.description}`
  const seen = new Set(existing.map(key))
  const merged = existing.slice()
  for (const t of incoming) {
    if (!seen.has(key(t))) {
      seen.add(key(t))
      merged.push(t)
    }
  }
  return merged.sort((a, b) => new Date(b.date) - new Date(a.date))
}
