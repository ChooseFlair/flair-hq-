import { supabase } from '../../../lib/supabase'

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('platform', { ascending: true })
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ accounts: data || [] })
  }
  if (req.method === 'POST') {
    const { platform, url, email, password, notes } = req.body || {}
    if (!platform) return res.status(400).json({ error: 'platform required' })
    const { data: maxRow } = await supabase.from('accounts').select('sort_order').order('sort_order', { ascending: false }).limit(1).maybeSingle()
    const nextOrder = (maxRow?.sort_order || 0) + 1
    const { data, error } = await supabase
      .from('accounts')
      .insert({ platform, url: url || null, email: email || null, password: password || null, notes: notes || null, sort_order: nextOrder })
      .select()
      .single()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ account: data })
  }
  res.status(405).json({ error: 'Method not allowed' })
}
