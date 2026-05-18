import { supabase } from '../../../lib/supabase'

export default async function handler(req, res) {
  const { id } = req.query
  if (req.method === 'PATCH') {
    const { platform, url, email, password, notes } = req.body || {}
    const patch = { updated_at: new Date().toISOString() }
    if (platform !== undefined) patch.platform = platform
    if (url !== undefined) patch.url = url || null
    if (email !== undefined) patch.email = email || null
    if (password !== undefined) patch.password = password || null
    if (notes !== undefined) patch.notes = notes || null
    const { data, error } = await supabase.from('accounts').update(patch).eq('id', id).select().single()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ account: data })
  }
  if (req.method === 'DELETE') {
    const { error } = await supabase.from('accounts').delete().eq('id', id)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ ok: true })
  }
  res.status(405).json({ error: 'Method not allowed' })
}
