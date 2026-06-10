import { useState, useEffect } from 'react'
import Head from 'next/head'
import Jarvis from '../components/Jarvis'

function MetricCard({ label, value, sub, color }) {
  return (
    <div className="bg-white/[0.03] border border-cyan-500/10 rounded-lg px-4 py-3 min-w-0">
      <p className="text-[10px] font-mono text-cyan-500/40 tracking-wider uppercase truncate">{label}</p>
      <p className={`text-lg font-bold font-mono mt-0.5 ${color || 'text-cyan-200'}`}>{value}</p>
      {sub && <p className="text-[10px] font-mono text-cyan-500/30 mt-0.5 truncate">{sub}</p>}
    </div>
  )
}

function MonthTab({ month, active, onClick }) {
  const label = new Date(month + '-01').toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded text-[10px] font-mono tracking-wider transition-all ${
        active
          ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
          : 'text-cyan-500/30 hover:text-cyan-400/50 border border-transparent'
      }`}
    >
      {label.toUpperCase()}
    </button>
  )
}

function Dashboard() {
  const [data, setData] = useState(null)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    fetch('/api/pnl')
      .then(r => r.json())
      .then(d => {
        if (d.months?.length) {
          setData(d)
          setSelected(d.months[d.months.length - 1].month)
        }
      })
      .catch(() => {})
  }, [])

  if (!data) {
    return (
      <div className="px-6 py-3 border-b border-cyan-500/10">
        <div className="flex gap-3 max-w-5xl mx-auto">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="flex-1 bg-white/[0.02] border border-cyan-500/5 rounded-lg px-4 py-3 animate-pulse">
              <div className="h-2 w-12 bg-cyan-500/10 rounded mb-2" />
              <div className="h-5 w-16 bg-cyan-500/10 rounded" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  const m = selected === 'total'
    ? data.totals
    : data.months.find(x => x.month === selected) || data.totals

  const fmt = (v) => {
    if (v == null) return '—'
    const abs = Math.abs(v)
    if (abs >= 1000) return (v < 0 ? '-' : '') + '£' + (abs / 1000).toFixed(1) + 'k'
    return (v < 0 ? '-' : '') + '£' + abs.toFixed(0)
  }

  const ebitdaColor = m.ebitda >= 0 ? 'text-emerald-400' : 'text-red-400'
  const months = data.months.slice(-6)

  return (
    <div className="px-6 py-3 border-b border-cyan-500/10">
      <div className="max-w-5xl mx-auto">
        {/* Month tabs */}
        <div className="flex items-center gap-1 mb-3 overflow-x-auto">
          {months.map(mo => (
            <MonthTab key={mo.month} month={mo.month} active={selected === mo.month} onClick={() => setSelected(mo.month)} />
          ))}
          <MonthTab month="total" active={selected === 'total'} onClick={() => setSelected('total')} />
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-5 gap-2">
          <MetricCard label="EBITDA" value={fmt(m.ebitda)} sub={`${m.ebitdaPct || 0}% margin`} color={ebitdaColor} />
          <MetricCard label="Ad Spend" value={fmt(m.marketingExpenses)} sub={`Meta ${fmt(m.metaSpend)} / Google ${fmt(m.googleSpend)}`} color="text-cyan-200" />
          <MetricCard label="OPEX" value={fmt(m.opex)} color="text-cyan-200" />
          <MetricCard label="COGS" value={fmt(m.cogs)} sub={`${data.rates?.cogs ? (data.rates.cogs * 100).toFixed(1) : 20.5}% of rev`} color="text-cyan-200" />
          <MetricCard label="ROAS" value={m.eroas ? m.eroas.toFixed(2) + 'x' : '—'} sub={`${m.orders || 0} orders`} color={m.eroas >= 2 ? 'text-emerald-400' : m.eroas >= 1 ? 'text-yellow-400' : 'text-red-400'} />
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  return (
    <>
      <Head>
        <title>Flair HQ - Jarvis</title>
        <meta name="description" content="Flair HQ - AI-powered business assistant" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="h-screen flex flex-col bg-black">
        <Dashboard />
        <div className="flex-1 min-h-0">
          <Jarvis />
        </div>
      </div>
    </>
  )
}
