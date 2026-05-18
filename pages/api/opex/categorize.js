import { supabase } from '../../../lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const { transactionId, category, note, bulk } = req.body || {}

  // Bulk: [{ transactionId, category, note? }]
  if (Array.isArray(bulk)) {
    const rows = bulk
      .filter(r => r.transactionId && ['opex', 'inventory', 'ignore'].includes(r.category))
      .map(r => ({ transaction_id: r.transactionId, category: r.category, note: r.note || null, updated_at: new Date().toISOString() }))
    if (!rows.length) return res.status(400).json({ error: 'No valid rows' })
    const { error } = await supabase.from('transaction_categories').upsert(rows, { onConflict: 'transaction_id' })
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ ok: true, updated: rows.length })
  }

  if (!transactionId || !['opex', 'inventory', 'ignore'].includes(category)) {
    return res.status(400).json({ error: 'transactionId and category (opex|inventory|ignore) required' })
  }
  const { error } = await supabase
    .from('transaction_categories')
    .upsert({ transaction_id: transactionId, category, note: note || null, updated_at: new Date().toISOString() }, { onConflict: 'transaction_id' })
  if (error) return res.status(500).json({ error: error.message })
  res.status(200).json({ ok: true })
}
