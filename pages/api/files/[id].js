import { supabase } from '../../../lib/supabase'

export default async function handler(req, res) {
  const { id } = req.query

  if (req.method === 'PATCH') {
    const { note } = req.body || {}
    const { data, error } = await supabase
      .from('files')
      .update({ note: note || '', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ file: data })
  }

  if (req.method === 'DELETE') {
    const { data: row } = await supabase.from('files').select('storage_path').eq('id', id).maybeSingle()
    if (row?.storage_path) {
      await supabase.storage.from('files').remove([row.storage_path])
    }
    const { error } = await supabase.from('files').delete().eq('id', id)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ ok: true })
  }

  res.status(405).json({ error: 'Method not allowed' })
}
