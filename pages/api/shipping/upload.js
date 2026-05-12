import { supabase } from '../../../lib/supabase'

export const config = {
  api: { bodyParser: { sizeLimit: '4mb' } },
  maxDuration: 30,
}

function parseLine(line) {
  const fields = []
  let cur = ''
  let inQ = false
  for (const ch of line) {
    if (ch === '"') { inQ = !inQ; continue }
    if (ch === ',' && !inQ) { fields.push(cur); cur = ''; continue }
    cur += ch
  }
  fields.push(cur)
  return fields
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  const csv = typeof req.body === 'string' ? req.body : req.body?.csv
  if (!csv) return res.status(400).json({ error: 'No CSV body provided' })

  const lines = csv.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return res.status(400).json({ error: 'CSV has no data rows' })

  const header = parseLine(lines[0]).map(h => h.toLowerCase().trim().replace(/[#"]/g, '').trim())
  const orderIdx = header.findIndex(h => h === 'order' || h.includes('order'))
  const dateIdx = header.findIndex(h => h.includes('date'))
  const rateIdx = header.findIndex(h => h === 'rate' || h.includes('rate') || h.includes('cost') || h.includes('shipping'))

  if (orderIdx === -1 || rateIdx === -1) {
    return res.status(400).json({ error: 'CSV missing required columns (Order #, Rate)', detected: header })
  }

  const byOrder = new Map()
  for (const line of lines.slice(1)) {
    const f = parseLine(line)
    const num = (f[orderIdx] || '').trim()
    if (!num) continue
    const cost = parseFloat((f[rateIdx] || '0').replace(/[^0-9.-]/g, '')) || 0
    const dateRaw = dateIdx >= 0 ? (f[dateIdx] || '').trim() : ''
    let date = null
    if (dateRaw) {
      // Try DD/MM/YYYY first, then YYYY-MM-DD
      if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateRaw)) {
        const [dd, mm, yyyy] = dateRaw.split('/')
        date = `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
      } else if (/^\d{4}-\d{2}-\d{2}/.test(dateRaw)) {
        date = dateRaw.substring(0, 10)
      }
    }
    if (!byOrder.has(num)) byOrder.set(num, { cost: 0, date })
    byOrder.get(num).cost += cost
  }

  const rows = [...byOrder.entries()].map(([order_number, v]) => ({
    order_number,
    cost: Math.round(v.cost * 100) / 100,
    order_date: v.date,
  }))

  // Upsert in chunks
  let inserted = 0
  const errors = []
  for (let i = 0; i < rows.length; i += 500) {
    const slice = rows.slice(i, i + 500)
    const { error } = await supabase.from('shipping_costs').upsert(slice, { onConflict: 'order_number' })
    if (error) errors.push(error.message)
    else inserted += slice.length
  }

  res.status(200).json({
    ok: errors.length === 0,
    rowsParsed: lines.length - 1,
    uniqueOrders: rows.length,
    inserted,
    totalCost: rows.reduce((s, r) => s + r.cost, 0),
    errors,
  })
}
