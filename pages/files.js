import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect, useCallback, useRef } from 'react'
import { File as FileIcon, Image as ImageIcon, Film, Music, FileText as FileTextIcon, FileSpreadsheet, FileArchive, Paperclip } from 'lucide-react'

const fmtBytes = (n) => {
  if (n == null) return ''
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

function FileTypeIcon({ mime, className }) {
  const Component =
    !mime ? FileIcon
    : mime.startsWith('image/') ? ImageIcon
    : mime.startsWith('video/') ? Film
    : mime.startsWith('audio/') ? Music
    : mime === 'application/pdf' ? FileTextIcon
    : (mime.includes('sheet') || mime.includes('excel') || mime.includes('csv')) ? FileSpreadsheet
    : (mime.includes('word') || mime.includes('document')) ? FileTextIcon
    : (mime.includes('zip') || mime.includes('compress')) ? FileArchive
    : FileIcon
  return <Component className={className} strokeWidth={1.5} />
}

export default function FilesPage() {
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const [editingNote, setEditingNote] = useState({}) // id -> draft string
  const inputRef = useRef(null)
  const dragRef = useRef(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/files')
      const j = await r.json()
      setFiles(j.files || [])
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  async function uploadFile(file, note = '') {
    if (!file) return
    if (file.size > 8 * 1024 * 1024) {
      setError(`${file.name}: too large (max 8 MB)`)
      return
    }
    setUploading(true)
    setError(null)
    try {
      const base64 = await new Promise((resolve, reject) => {
        const r = new FileReader()
        r.onload = () => resolve(r.result)
        r.onerror = reject
        r.readAsDataURL(file)
      })
      const r = await fetch('/api/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: file.name, mimeType: file.type, base64, note }),
      })
      const j = await r.json()
      if (!r.ok) setError(j.error || `HTTP ${r.status}`)
      else await load()
    } catch (e) { setError(e.message) }
    finally { setUploading(false) }
  }

  async function handleFiles(fileList) {
    for (const f of fileList) {
      await uploadFile(f)
    }
  }

  function onDrop(e) {
    e.preventDefault()
    dragRef.current?.classList.remove('ring-2', 'ring-sky-400')
    handleFiles([...e.dataTransfer.files])
  }
  function onDragOver(e) {
    e.preventDefault()
    dragRef.current?.classList.add('ring-2', 'ring-sky-400')
  }
  function onDragLeave() {
    dragRef.current?.classList.remove('ring-2', 'ring-sky-400')
  }

  async function saveNote(id) {
    const note = editingNote[id]
    if (note === undefined) return
    try {
      const r = await fetch(`/api/files/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note }),
      })
      if (!r.ok) {
        const j = await r.json()
        setError(j.error)
      } else {
        setEditingNote(prev => {
          const n = { ...prev }
          delete n[id]
          return n
        })
        await load()
      }
    } catch (e) { setError(e.message) }
  }

  async function deleteFile(id) {
    if (!confirm('Delete this file?')) return
    try {
      const r = await fetch(`/api/files/${id}`, { method: 'DELETE' })
      if (!r.ok) {
        const j = await r.json()
        setError(j.error)
      } else {
        await load()
      }
    } catch (e) { setError(e.message) }
  }

  return (
    <>
      <Head><title>Jarvis — Files</title></Head>
      <div className="min-h-screen bg-black text-white">
        <div className="border-b border-white/[0.06] px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Files</h1>
            <p className="text-slate-400 text-sm mt-0.5">Upload documents and attach notes</p>
          </div>
          <Link href="/" className="text-sm px-4 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.10] text-slate-300 hover:text-white">← Jarvis</Link>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
          <div
            ref={dragRef}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onClick={() => inputRef.current?.click()}
            className="rounded-2xl border-2 border-dashed border-white/10 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/20 p-10 text-center cursor-pointer transition-all"
          >
            <input
              ref={inputRef}
              type="file"
              multiple
              className="hidden"
              onChange={e => handleFiles([...(e.target.files || [])])}
            />
            <Paperclip className="w-10 h-10 text-slate-400 mx-auto mb-3" strokeWidth={1.5} />
            <div className="text-white text-sm">{uploading ? 'Uploading…' : 'Drop files here or click to choose'}</div>
            <div className="text-slate-400 text-xs mt-1">Up to 8 MB each</div>
          </div>

          {error && (
            <div className="rounded-lg bg-rose-400/10 text-rose-300 px-4 py-3 text-sm">{error}</div>
          )}

          {loading && !files.length && <div className="text-slate-400 text-sm">Loading…</div>}

          {files.length > 0 && (
            <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
              {files.map(f => {
                const isEditing = editingNote[f.id] !== undefined
                return (
                  <div key={f.id} className="border-b border-white/[0.04] last:border-b-0 px-5 py-4 hover:bg-white/[0.02]">
                    <div className="flex items-start gap-4">
                      <FileTypeIcon mime={f.mime_type} className="w-8 h-8 text-sky-300 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div className="min-w-0">
                            <a
                              href={`/api/files/${f.id}/download`}
                              className="text-white hover:text-sky-300 truncate font-medium"
                            >
                              {f.name}
                            </a>
                            <div className="text-xs text-slate-400 mt-0.5">
                              {fmtBytes(f.size_bytes)} · {new Date(f.created_at).toLocaleString()}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <a
                              href={`/api/files/${f.id}/download`}
                              className="text-xs px-3 py-1 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white"
                            >
                              Download
                            </a>
                            <button
                              onClick={() => deleteFile(f.id)}
                              className="text-xs px-3 py-1 rounded-full bg-rose-500/15 hover:bg-rose-500/25 text-rose-300"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                        <div className="mt-3">
                          {isEditing ? (
                            <div className="flex items-start gap-2">
                              <textarea
                                value={editingNote[f.id]}
                                onChange={e => setEditingNote(prev => ({ ...prev, [f.id]: e.target.value }))}
                                rows={3}
                                className="flex-1 bg-white/[0.04] border border-white/10 rounded-lg p-3 text-sm text-white focus:border-sky-400/50 focus:outline-none"
                                placeholder="Add a note…"
                                autoFocus
                              />
                              <div className="flex flex-col gap-1">
                                <button
                                  onClick={() => saveNote(f.id)}
                                  className="text-xs px-3 py-1 rounded-full bg-sky-500/90 hover:bg-sky-500 text-white"
                                >Save</button>
                                <button
                                  onClick={() => setEditingNote(prev => { const n = { ...prev }; delete n[f.id]; return n })}
                                  className="text-xs px-3 py-1 rounded-full bg-white/[0.04] hover:bg-white/[0.10] text-slate-300"
                                >Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => setEditingNote(prev => ({ ...prev, [f.id]: f.note || '' }))}
                              className="text-left w-full"
                            >
                              {f.note ? (
                                <p className="text-sm text-slate-300 whitespace-pre-wrap hover:text-white">{f.note}</p>
                              ) : (
                                <p className="text-sm text-slate-500 italic hover:text-sky-400">+ Add note</p>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {!loading && files.length === 0 && (
            <div className="text-center text-slate-400 text-sm py-10">No files yet</div>
          )}
        </div>
      </div>
    </>
  )
}
