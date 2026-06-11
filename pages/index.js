import { useState, useEffect, useRef } from 'react'
import Head from 'next/head'
import Jarvis from '../components/Jarvis'
import CommandCenter from '../components/CommandCenter'

function MetricCard({ label, value, sub, color }) {
  return (
    <div className="bg-[#111] border border-gray-800 rounded-xl px-5 py-4">
      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color || 'text-white'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  )
}

function MonthTab({ month, active, onClick }) {
  const label = month === 'total' ? 'All Time' : new Date(month + '-01').toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })
  return (
    <button onClick={onClick} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${active ? 'bg-white text-black' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
      {label}
    </button>
  )
}

function Dashboard() {
  const [data, setData] = useState(null)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    fetch('/api/pnl').then(r => r.json()).then(d => {
      if (d.months?.length) { setData(d); setSelected(d.months[d.months.length - 1].month) }
    }).catch(() => {})
  }, [])

  if (!data) return null

  const m = selected === 'total' ? data.totals : data.months.find(x => x.month === selected) || data.totals
  const fmt = (v) => { if (v == null) return '—'; const abs = Math.abs(v); if (abs >= 1000) return (v < 0 ? '-' : '') + '£' + (abs / 1000).toFixed(1) + 'k'; return (v < 0 ? '-' : '') + '£' + abs.toFixed(0) }
  const months = data.months.slice(-6)

  return (
    <div className="px-6 py-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-2 mb-4 overflow-x-auto">
          {months.map(mo => <MonthTab key={mo.month} month={mo.month} active={selected === mo.month} onClick={() => setSelected(mo.month)} />)}
          <MonthTab month="total" active={selected === 'total'} onClick={() => setSelected('total')} />
        </div>
        <div className="grid grid-cols-5 gap-3">
          <MetricCard label="EBITDA" value={fmt(m.ebitda)} sub={`${m.ebitdaPct || 0}% margin`} color={m.ebitda >= 0 ? 'text-emerald-400' : 'text-red-400'} />
          <MetricCard label="Ad Spend" value={fmt(m.marketingExpenses)} sub={`Meta ${fmt(m.metaSpend)} · Google ${fmt(m.googleSpend)}`} />
          <MetricCard label="OPEX" value={fmt(m.opex)} />
          <MetricCard label="COGS" value={fmt(m.cogs)} sub={`${data.rates?.cogs ? (data.rates.cogs * 100).toFixed(1) : 20.5}% of revenue`} />
          <MetricCard label="ROAS" value={m.eroas ? m.eroas.toFixed(2) + 'x' : '—'} sub={`${m.orders || 0} orders`} color={m.eroas >= 2 ? 'text-emerald-400' : m.eroas >= 1 ? 'text-yellow-400' : 'text-red-400'} />
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  const [view, setView] = useState('dashboard')
  const jarvisRef = useRef(null)

  function handleAgentAsk(query) {
    setView('jarvis')
    setTimeout(() => {
      if (jarvisRef.current?.send) jarvisRef.current.send(query)
    }, 100)
  }

  return (
    <>
      <Head>
        <title>Flair HQ</title>
        <meta name="description" content="Flair HQ - AI-powered business assistant" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="h-screen flex flex-col bg-[#0a0a0a] text-white">
        {/* Header */}
        <header className="px-6 py-3 border-b border-gray-800 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-sm font-bold">F</div>
            <span className="text-lg font-bold">Flair HQ</span>
          </div>
          <nav className="flex items-center gap-1 bg-gray-900 rounded-lg p-1">
            <button onClick={() => setView('dashboard')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${view === 'dashboard' ? 'bg-white text-black' : 'text-gray-400 hover:text-white'}`}>
              Dashboard
            </button>
            <button onClick={() => setView('agents')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${view === 'agents' ? 'bg-white text-black' : 'text-gray-400 hover:text-white'}`}>
              Agents
            </button>
            <button onClick={() => setView('jarvis')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${view === 'jarvis' ? 'bg-white text-black' : 'text-gray-400 hover:text-white'}`}>
              Jarvis
            </button>
          </nav>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-xs text-gray-400">Online</span>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-auto">
          {view === 'dashboard' && (
            <div>
              <Dashboard />
              <div className="px-6 pb-6">
                <div className="max-w-6xl mx-auto">
                  <CommandCenter onAsk={handleAgentAsk} />
                </div>
              </div>
            </div>
          )}
          {view === 'agents' && (
            <div className="px-6 py-6">
              <div className="max-w-6xl mx-auto">
                <CommandCenter onAsk={handleAgentAsk} />
              </div>
            </div>
          )}
          {view === 'jarvis' && (
            <div className="h-full">
              <Jarvis ref={jarvisRef} />
            </div>
          )}
        </div>
      </div>
    </>
  )
}
