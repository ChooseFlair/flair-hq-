import { supabase } from '../../../lib/supabase'

export const config = {
  api: { bodyParser: { sizeLimit: '10mb' } },
  maxDuration: 30,
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('files')
      .select('id,name,mime_type,size_bytes,note,created_at,updated_at')
      .order('created_at', { ascending: false })
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ files: data || [] })
  }

  if (req.method === 'POST') {
    const { name, mimeType, base64, note } = req.body || {}
    if (!name || !base64) return res.status(400).json({ error: 'name and base64 required' })

    let buffer
    try {
      const clean = base64.includes(',') ? base64.split(',')[1] : base64
      buffer = Buffer.from(clean, 'base64')
    } catch (e) { return res.status(400).json({ error: 'Invalid base64' }) }

    const timestamp = Date.now()
    const safeName = name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const storagePath = `${timestamp}_${safeName}`

    const { error: upErr } = await supabase.storage
      .from('files')
      .upload(storagePath, buffer, { contentType: mimeType || 'application/octet-stream', upsert: false })
    if (upErr) return res.status(500).json({ error: `Storage: ${upErr.message}` })

    const { data, error } = await supabase
      .from('files')
      .insert({ name, storage_path: storagePath, mime_type: mimeType || null, size_bytes: buffer.length, note: note || '' })
      .select()
      .single()
    if (error) return res.status(500).json({ error: error.message })

    return res.status(200).json({ file: data })
  }

  res.status(405).json({ error: 'Method not allowed' })
}
