import { supabase } from '../../../lib/supabase'

const VALID = ['opex', 'inventory', 'ignore']

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const { transactionId, category, note, bulk, counterparty, scope } = req.body || {}

  // Rule: apply category to all txns from a counterparty (and future ones)
  if (scope === 'counterparty') {
    if (!counterparty || !VALID.includes(category)) {
      return res.status(400).json({ error: 'counterparty and category required' })
    }
    const { error } = await supabase
      .from('transaction_category_rules')
      .upsert(
        { counterparty, category, note: note || null, updated_at: new Date().toISOString() },
        { onConflict: 'counterparty' }
      )
    if (error) return res.status(500).json({ error: error.message })
    // Clear per-tx overrides for this counterparty so the rule takes effect
    // (caller may also have supplied a list of txIds in bulk to clear explicitly)
    if (Array.isArray(bulk) && bulk.length) {
      const txIds = bulk.map(b => b.transactionId).filter(Boolean)
      if (txIds.length) {
        await supabase.from('transaction_categories').delete().in('transaction_id', txIds)
      }
    }
    return res.status(200).json({ ok: true, rule: { counterparty, category } })
  }

  // Bulk: [{ transactionId, category, note? }]
  if (Array.isArray(bulk)) {
    const rows = bulk
      .filter(r => r.transactionId && VALID.includes(r.category))
      .map(r => ({ transaction_id: r.transactionId, category: r.category, note: r.note || null, updated_at: new Date().toISOString() }))
    if (!rows.length) return res.status(400).json({ error: 'No valid rows' })
    const { error } = await supabase.from('transaction_categories').upsert(rows, { onConflict: 'transaction_id' })
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ ok: true, updated: rows.length })
  }

  if (!transactionId || !VALID.includes(category)) {
    return res.status(400).json({ error: 'transactionId and category (opex|inventory|ignore) required' })
  }
  const { error } = await supabase
    .from('transaction_categories')
    .upsert({ transaction_id: transactionId, category, note: note || null, updated_at: new Date().toISOString() }, { onConflict: 'transaction_id' })
  if (error) return res.status(500).json({ error: error.message })
  res.status(200).json({ ok: true })
}
