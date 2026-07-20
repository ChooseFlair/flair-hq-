// API for syncing personal banking data across devices.
// Uses a key-value pattern: 'accounts' for bank accounts/transactions,
// 'bills' for the planned bills budget.
//
// This data is kept separate from business data per CLAUDE.md guardrails.

import { supabase } from '../../../lib/supabase'

const VALID_KEYS = ['accounts', 'bills']

export default async function handler(req, res) {
  // GET: Load personal data by key
  if (req.method === 'GET') {
    const { key } = req.query
    if (!key || !VALID_KEYS.includes(key)) {
      return res.status(400).json({ error: 'Invalid key' })
    }

    try {
      const { data, error } = await supabase
        .from('personal_data')
        .select('value, updated_at')
        .eq('key', key)
        .single()

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = row not found, which is fine for first load
        throw error
      }

      return res.status(200).json({
        key,
        value: data?.value ?? null,
        updated_at: data?.updated_at ?? null,
      })
    } catch (e) {
      console.error('Failed to load personal data:', e)
      return res.status(500).json({ error: e.message })
    }
  }

  // POST: Save personal data
  if (req.method === 'POST') {
    const { key, value } = req.body
    if (!key || !VALID_KEYS.includes(key)) {
      return res.status(400).json({ error: 'Invalid key' })
    }

    try {
      const { error } = await supabase
        .from('personal_data')
        .upsert({
          key,
          value,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'key' })

      if (error) throw error

      return res.status(200).json({ success: true, key })
    } catch (e) {
      console.error('Failed to save personal data:', e)
      return res.status(500).json({ error: e.message })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
