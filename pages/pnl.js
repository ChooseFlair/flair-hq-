import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts'

const RANGES = [
  { id: 'today', label: 'TODAY' },
  { id: 'yesterday', label: 'YDAY' },
  { id: '7d', label: '7D' },
  { id: '30d', label: '30D' },
  { id: '90d', label: '90D' },
  { id: 'mtd', label: 'MTD' },
  { id: 'ytd', label: 'YTD' },
]

const fmtMoney = (n, dp = 0) => {
  if (n == null) return '—'
  const abs = Math.abs(n)
  if (abs >= 10000) return `£${(n / 1000).toFixed(1)}k`
  return `£${n.toFixed(dp)}`
}
const fmtInt = (n) => (n == null ? '—' : n.toLocaleString())
const fmtPct = (n) => (n == null ? '—' : `${n.toFixed(1)}%`)
const fmtX = (n) => (n == null ? '—' : `${n.toFixed(2)}x`)

function KPI({ label, value, sub, accent = 'cyan', index = 0 }) {
  const colors = {
    cyan: 'border-cyan-500/20 hover:border-cyan-400/50 text-cyan-100',
    emerald: 'border-emerald-500/20 hover:border-emerald-400/50 text-emerald-100',
    rose: 'border-rose-500/20 hover:border-rose-400/50 text-rose-100',
    amber: 'border-amber-500/20 hover:border-amber-400/50 text-amber-100',
  }
  return (
    <div
      style={{ animationDelay: `${index * 40}ms` }}
      className={`flex-1 min-w-[140px] border rounded-lg bg-cyan-500/[0.02] px-4 py-3 hover:bg-cyan-500/[0.05] hover:-translate-y-0.5 transition-all duration-200 fade-up ${colors[accent]}`}
    >
      <div className="text-[10px] font-mono tracking-[0.2em] text-cyan-300 uppercase">{label}</div>
      <div className="font-mono text-xl mt-1">{value}</div>
      {sub && <div className="text-[10px] font-mono text-cyan-400/70 mt-1">{sub}</div>}
    </div>
  )
}

function Row({ label, value, hint, indent = false, accent }) {
  const valueClass = accent === 'positive' ? 'text-emerald-300'
    : accent === 'negative' ? 'text-rose-300'
    : accent === 'bold' ? 'text-cyan-100 font-semibold'
    : 'text-cyan-200'
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-cyan-500/5 last:border-b-0">
      <span className={`text-xs font-mono ${indent ? 'pl-4 text-cyan-300/70' : 'text-cyan-200'}`}>{label}</span>
      <div className="flex items-baseline gap-2">
        {hint && <span className="text-[10px] font-mono text-cyan-400/60">{hint}</span>}
        <span className={`font-mono text-sm tabular-nums ${valueClass}`}>{value}</span>
      </div>
    </div>
  )
}

function Section({ title, children, index = 0 }) {
  return (
    <div
      style={{ animationDelay: `${index * 80}ms` }}
      className="border border-cyan-500/15 rounded-lg bg-cyan-500/[0.02] p-5 fade-up"
    >
      <h3 className="text-cyan-300 font-mono text-xs tracking-[0.3em] uppercase mb-3">{title}</h3>
      <div className="space-y-0">
        {children}
      </div>
    </div>
  )
}

export default function PnLPage() {
  const [range, setRange] = useState('30d')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [opex, setOpex] = useState('')
  const [opexMode, setOpexMode] = useState('auto')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [chartMetric, setChartMetric] = useState('totalRevenue')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const q = new URLSearchParams({ range })
      if (opexMode === 'override' && opex !== '') q.set('opex', opex)
      if (range === 'custom' && customFrom && customTo) {
        q.set('from', customFrom)
        q.set('to', customTo)
      }
      const res = await fetch(`/api/pnl-live?${q}`)
      const json = await res.json()
      setData(json)
    } catch (e) {
      setData({ error: e.message })
    } finally {
      setLoading(false)
    }
  }, [range, opex, customFrom, customTo])

  useEffect(() => { load() }, [load, opexMode])

  const t = data?.totals
  const series = data?.series || []

  const CHART_METRICS = [
    { id: 'totalRevenue', label: 'Revenue', color: '#22d3ee' },
    { id: 'marketingExpenses', label: 'Ad Spend', color: '#a855f7' },
    { id: 'contributionProfit', label: 'Contribution Profit', color: '#34d399' },
    { id: 'orders', label: 'Orders', color: '#fbbf24' },
    { id: 'ncRevenue', label: 'New Customer Sales', color: '#f472b6' },
    { id: 'rcRevenue', label: 'Returning Customer Sales', color: '#60a5fa' },
  ]
  const currentMetric = CHART_METRICS.find(m => m.id === chartMetric) || CHART_METRICS[0]

  return (
    <>
      <Head><title>Flair HQ — P&amp;L</title></Head>
      <style jsx global>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .fade-up { animation: fadeUp 0.6s ease-out both; }
      `}</style>
      <div className="min-h-screen bg-black text-cyan-200">
        <div className="border-b border-cyan-500/10 px-6 py-4 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-cyan-300 font-mono text-sm tracking-[0.3em] uppercase">Profit &amp; Loss</h1>
            <p className="text-cyan-300/80 text-[10px] font-mono tracking-widest">{data?.label || '...'}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {RANGES.map(r => (
              <button
                key={r.id}
                onClick={() => setRange(r.id)}
                className={`text-[10px] font-mono px-2.5 py-1 rounded border tracking-wider transition-all ${
                  range === r.id
                    ? 'border-cyan-400/60 bg-cyan-400/15 text-cyan-100'
                    : 'border-cyan-500/15 text-cyan-300/80 hover:text-cyan-100 hover:border-cyan-400/40'
                }`}
              >
                {r.label}
              </button>
            ))}
            <button
              onClick={() => setRange('custom')}
              className={`text-[10px] font-mono px-2.5 py-1 rounded border tracking-wider transition-all ${
                range === 'custom'
                  ? 'border-cyan-400/60 bg-cyan-400/15 text-cyan-100'
                  : 'border-cyan-500/15 text-cyan-300/80 hover:text-cyan-100 hover:border-cyan-400/40'
              }`}
            >
              CUSTOM
            </button>
            {range === 'custom' && (
              <>
                <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="bg-black border border-cyan-500/30 rounded text-[10px] font-mono px-2 py-1 text-cyan-200" />
                <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="bg-black border border-cyan-500/30 rounded text-[10px] font-mono px-2 py-1 text-cyan-200" />
              </>
            )}
            <Link href="/" className="text-[10px] font-mono px-3 py-1 rounded border border-cyan-500/20 text-cyan-300 hover:text-cyan-100 hover:border-cyan-400/50 tracking-wider">← JARVIS</Link>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
          {loading && !data && <div className="text-cyan-400/70 font-mono text-sm">Crunching numbers...</div>}
          {data?.error && <div className="text-rose-400 font-mono text-sm">Error: {data.error}</div>}
          {t && (
            <>
              {/* Top KPIs */}
              <div className="flex gap-3 flex-wrap">
                <KPI label="Total Sales" value={fmtMoney(t.kpis.totalSales)} accent="cyan" index={0} />
                <KPI label="Total Orders" value={fmtInt(t.kpis.totalOrders)} accent="cyan" index={1} />
                <KPI label="AOV" value={fmtMoney(t.kpis.aov, 2)} accent="cyan" index={2} />
                <KPI label="eCPA" value={fmtMoney(t.kpis.ecpa, 2)} accent="amber" index={3} />
                <KPI label="eROAS" value={fmtX(t.kpis.eroas)} accent={t.kpis.eroas >= 2 ? 'emerald' : 'rose'} index={4} />
                <KPI label="Contribution Profit" value={fmtMoney(t.profit.contributionProfit)} sub={fmtPct(t.profit.contributionProfitPct)} accent={t.profit.contributionProfit >= 0 ? 'emerald' : 'rose'} index={5} />
                <KPI label="EBITDA" value={fmtMoney(t.profit.ebitda)} sub={fmtPct(t.profit.ebitdaPct)} accent={t.profit.ebitda >= 0 ? 'emerald' : 'rose'} index={6} />
              </div>

              {/* Chart */}
              <div className="border border-cyan-500/15 rounded-lg bg-cyan-500/[0.02] p-5 fade-up">
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <h3 className="text-cyan-300 font-mono text-xs tracking-[0.3em] uppercase">Trend</h3>
                  <div className="flex items-center gap-1 flex-wrap">
                    {CHART_METRICS.map(m => (
                      <button
                        key={m.id}
                        onClick={() => setChartMetric(m.id)}
                        className={`text-[10px] font-mono px-2 py-0.5 rounded border tracking-wider transition-all ${
                          chartMetric === m.id
                            ? 'border-cyan-400/60 bg-cyan-400/10 text-cyan-100'
                            : 'border-cyan-500/15 text-cyan-300/80 hover:text-cyan-100 hover:border-cyan-400/40'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-4 flex-wrap text-[10px] font-mono">
                  <span className="text-cyan-400/70 tracking-wider">DATE RANGE</span>
                  <input
                    type="date"
                    value={customFrom || (data?.from ? data.from.split('T')[0] : '')}
                    onChange={e => { setCustomFrom(e.target.value); setRange('custom') }}
                    className="bg-black border border-cyan-500/30 rounded px-2 py-1 text-cyan-200 focus:border-cyan-400/60 focus:outline-none"
                  />
                  <span className="text-cyan-400/60">→</span>
                  <input
                    type="date"
                    value={customTo || (data?.to ? data.to.split('T')[0] : '')}
                    onChange={e => { setCustomTo(e.target.value); setRange('custom') }}
                    className="bg-black border border-cyan-500/30 rounded px-2 py-1 text-cyan-200 focus:border-cyan-400/60 focus:outline-none"
                  />
                  {(customFrom || customTo) && (
                    <button
                      onClick={() => { setCustomFrom(''); setCustomTo(''); setRange('30d') }}
                      className="text-cyan-300/80 hover:text-cyan-100 underline tracking-wider"
                    >
                      reset
                    </button>
                  )}
                </div>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={series}>
                    <defs>
                      <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={currentMetric.color} stopOpacity={0.4} />
                        <stop offset="100%" stopColor={currentMetric.color} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(34,211,238,0.08)" />
                    <XAxis dataKey="date" stroke="rgba(165,243,252,0.5)" fontSize={10} fontFamily="monospace" />
                    <YAxis stroke="rgba(165,243,252,0.5)" fontSize={10} fontFamily="monospace" />
                    <Tooltip
                      contentStyle={{ background: '#000', border: '1px solid rgba(34,211,238,0.3)', fontFamily: 'monospace', fontSize: 11 }}
                      labelStyle={{ color: '#a5f3fc' }}
                    />
                    <Area type="monotone" dataKey={chartMetric} stroke={currentMetric.color} strokeWidth={2} fill="url(#grad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Sections grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Section title="Revenue" index={0}>
                  <Row label="Net Sales" value={fmtMoney(t.revenue.netSales)} />
                  <Row label="Returns" value={fmtMoney(-t.revenue.returns)} accent="negative" />
                  <Row label="Cancellations" value={fmtMoney(-t.revenue.cancellations)} accent="negative" />
                  <Row label="Shipping Charges" value={fmtMoney(t.revenue.shippingCharges)} />
                  <Row label="Total Revenue" value={fmtMoney(t.revenue.totalRevenue)} accent="bold" />
                </Section>

                <Section title="Costs" index={1}>
                  <Row label="Payment Providers" value={fmtMoney(t.costs.paymentProviders)} hint="2.5%" />
                  <Row label="COGS" value={fmtMoney(t.costs.cogs)} hint="20.5%" />
                  <Row label="Shipping & Fulfilment" value={fmtMoney(t.costs.shippingFulfilment)} hint="6.7%" />
                  <Row label="Sales Expenses" value={fmtMoney(t.costs.salesExpenses)} accent="bold" />
                  <Row label="Meta Spend" value={fmtMoney(t.costs.metaSpend)} indent />
                  <Row label="Google Spend" value={fmtMoney(t.costs.googleSpend)} indent />
                  <Row label="Marketing Expenses" value={fmtMoney(t.costs.marketingExpenses)} accent="bold" />
                  <Row label="as % of revenue" value={fmtPct(t.costs.marketingPctRevenue)} indent />
                  <Row label="as % of net sales" value={fmtPct(t.costs.marketingPctNetSales)} indent />
                </Section>

                <Section title="Profitability" index={2}>
                  <Row label="Contribution Profit" value={fmtMoney(t.profit.contributionProfit)} accent={t.profit.contributionProfit >= 0 ? 'positive' : 'negative'} />
                  <Row label="as %" value={fmtPct(t.profit.contributionProfitPct)} indent />
                  <Row
                    label={
                      <span className="inline-flex items-center gap-2 flex-wrap">
                        OPEX
                        {data?.opexSource === 'revolut' && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-emerald-400/40 bg-emerald-400/10 text-emerald-300 tracking-wider">via REVOLUT</span>
                        )}
                        {data?.opexSource === 'override' && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-amber-400/40 bg-amber-400/10 text-amber-300 tracking-wider">MANUAL</span>
                        )}
                        {data?.opexSource === 'none' && (
                          <a href="/api/revolut/auth" className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-cyan-400/40 bg-cyan-400/10 text-cyan-300 tracking-wider hover:text-cyan-100">CONNECT REVOLUT</a>
                        )}
                        {opexMode === 'override' ? (
                          <input
                            type="number"
                            value={opex}
                            onChange={e => setOpex(e.target.value)}
                            onBlur={() => load()}
                            className="ml-1 w-24 bg-black border border-cyan-500/20 rounded px-1 py-0.5 text-[10px] text-cyan-200"
                            placeholder="manual"
                          />
                        ) : null}
                        <button
                          onClick={() => setOpexMode(opexMode === 'auto' ? 'override' : 'auto')}
                          className="text-[9px] font-mono text-cyan-400/70 hover:text-cyan-100 underline tracking-wider"
                        >
                          {opexMode === 'auto' ? 'override' : 'auto'}
                        </button>
                      </span>
                    }
                    value={fmtMoney(t.costs.opex)}
                  />
                  <Row label="as %" value={fmtPct(t.costs.opexPctRevenue)} indent />
                  {data?.revolut?.connected && (
                    <Row label="Revolut transactions" value={fmtInt(data.revolut.transactions)} hint="completed debits" indent />
                  )}
                  <Row label="EBITDA" value={fmtMoney(t.profit.ebitda)} accent={t.profit.ebitda >= 0 ? 'positive' : 'negative'} />
                  <Row label="as %" value={fmtPct(t.profit.ebitdaPct)} indent />
                </Section>

                <Section title="Customer Split" index={3}>
                  <Row label="New Customer Sales" value={fmtMoney(t.newCustomers.sales)} accent="bold" />
                  <Row label="NC Orders" value={fmtInt(t.newCustomers.orders)} indent />
                  <Row label="NC AOV" value={fmtMoney(t.newCustomers.aov, 2)} indent />
                  <Row label="NC-CPA" value={fmtMoney(t.newCustomers.cpa, 2)} indent />
                  <Row label="NC-ROAS" value={fmtX(t.newCustomers.roas)} indent />
                  <div className="h-2" />
                  <Row label="Returning Customer Sales" value={fmtMoney(t.returningCustomers.sales)} accent="bold" />
                  <Row label="RC Orders" value={fmtInt(t.returningCustomers.orders)} indent />
                  <Row label="RC AOV" value={fmtMoney(t.returningCustomers.aov, 2)} indent />
                </Section>
              </div>

              <div className="text-[10px] font-mono text-cyan-400/60 tracking-wider">
                Rates: COGS 20.5% · Payment 2.5% · Shipping &amp; Fulfilment 6.7% · Live from Shopify + Windsor · New vs Returning split uses Shopify customer.orders_count
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
