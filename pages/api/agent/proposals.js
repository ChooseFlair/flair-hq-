import { supabase } from '../../../lib/supabase'

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const { status } = req.query
      let q = supabase.from('proposals').select('*').order('created_at', { ascending: false }).limit(50)
      if (status) q = q.eq('status', status)
      const { data, error } = await q
      if (error) throw error
      return res.json({ proposals: data })
    }

    if (req.method === 'POST') {
      // Agent drafts a proposal — always lands as pending (per CLAUDE.md)
      const { type, title, payload } = req.body
      if (!type || !title) return res.status(400).json({ error: 'type and title required' })
      const { data, error } = await supabase
        .from('proposals')
        .insert({ type, title, payload: payload || {}, status: 'pending' })
        .select()
        .single()
      if (error) throw error
      return res.json({ proposal: data })
    }

    if (req.method === 'PATCH') {
      // Review: only allows pending → approved/rejected, approved → executed
      const { id, status, notes } = req.body
      if (!id || !status) return res.status(400).json({ error: 'id and status required' })

      const { data: current } = await supabase.from('proposals').select('status').eq('id', id).single()
      if (!current) return res.status(404).json({ error: 'Proposal not found' })

      const validTransitions = {
        pending: ['approved', 'rejected'],
        approved: ['executed', 'rejected'],
      }
      if (!validTransitions[current.status]?.includes(status)) {
        return res.status(400).json({ error: `Cannot move ${current.status} → ${status}` })
      }

      const update = { status, notes: notes || null }
      if (status === 'approved' || status === 'rejected') update.reviewed_at = new Date().toISOString()
      if (status === 'executed') update.executed_at = new Date().toISOString()

      const { data, error } = await supabase.from('proposals').update(update).eq('id', id).select().single()
      if (error) throw error
      return res.json({ proposal: data })
    }

    res.status(405).json({ error: 'Method not allowed' })
  } catch (e) {
    console.error('Proposals error:', e)
    res.status(500).json({ error: e.message })
  }
}
