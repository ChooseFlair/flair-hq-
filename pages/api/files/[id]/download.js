import { supabase } from '../../../../lib/supabase'

export default async function handler(req, res) {
  const { id } = req.query

  const { data: row, error } = await supabase
    .from('files')
    .select('name, storage_path, mime_type')
    .eq('id', id)
    .maybeSingle()
  if (error || !row) return res.status(404).json({ error: 'File not found' })

  // Generate a short-lived signed URL and redirect
  const { data: signed, error: sErr } = await supabase.storage
    .from('files')
    .createSignedUrl(row.storage_path, 60, { download: row.name })
  if (sErr) return res.status(500).json({ error: sErr.message })

  res.redirect(307, signed.signedUrl)
}
