import Head from 'next/head'
import Link from 'next/link'
import { useState, useRef } from 'react'

export default function ShippingUploadPage() {
  const [result, setResult] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const inputRef = useRef(null)

  async function handleFile(file) {
    if (!file) return
    setUploading(true)
    setError(null)
    setResult(null)
    try {
      const text = await file.text()
      const res = await fetch('/api/shipping/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'text/csv' },
        body: text,
      })
      const json = await res.json()
      if (!res.ok) setError(json.error || `HTTP ${res.status}`)
      else setResult(json)
    } catch (e) { setError(e.message) }
    finally { setUploading(false) }
  }

  return (
    <>
      <Head><title>Jarvis — Shipping upload</title></Head>
      <div className="min-h-screen bg-black text-white">
        <div className="border-b border-white/[0.06] px-6 py-5 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Shipping upload</h1>
            <p className="text-slate-400 text-sm mt-0.5">Upload ShipStation CSV export to populate real shipping costs</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/pnl" className="text-sm px-4 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.10] text-slate-300 hover:text-white">P&amp;L</Link>
            <Link href="/" className="text-sm px-4 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.10] text-slate-300 hover:text-white">← Jarvis</Link>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-6 py-10">
          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-8 text-center">
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={e => handleFile(e.target.files?.[0])}
            />
            <button
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="px-6 py-3 rounded-full bg-sky-500/90 hover:bg-sky-500 text-white font-medium disabled:opacity-60"
            >
              {uploading ? 'Uploading…' : 'Choose CSV'}
            </button>
            <p className="text-slate-400 text-sm mt-4">
              ShipStation export with columns: <code className="font-mono text-slate-300">Order #</code>, <code className="font-mono text-slate-300">Order Date</code>, <code className="font-mono text-slate-300">Rate</code>.
              <br />Duplicates for split shipments are summed per order.
            </p>
          </div>

          {error && (
            <div className="mt-4 rounded-lg bg-rose-400/10 text-rose-300 px-4 py-3 text-sm">
              {error}
            </div>
          )}

          {result && (
            <div className="mt-4 rounded-lg bg-emerald-400/10 text-emerald-300 px-4 py-3 text-sm">
              ✓ {result.inserted} orders saved · total £{result.totalCost.toFixed(2)} · {result.rowsParsed} rows parsed
              {result.errors?.length > 0 && (
                <div className="mt-2 text-amber-300 text-xs">Warnings: {result.errors.join(' · ')}</div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
