import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Area, ComposedChart } from 'recharts'

const RANGES = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: '7d', label: '7d' },
  { id: '30d', label: '30d' },
  { id: '90d', label: '90d' },
  { id: 'mtd', label: 'MTD' },
  { id: 'ytd', label: 'YTD' },
]

const get = (obj, path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj)

const fmtMoney = (n, dp = 0) => {
  if (n == null) return '—'
  const abs = Math.abs(n)
  if (abs >= 10000) return `£${(n / 1000).toFixed(1)}k`
  return `£${n.toFixed(dp)}`
}
const fmtInt = (n) => (n == null ? '—' : n.toLocaleString())
const fmtPct = (n) => (n == null ? '—' : `${n.toFixed(1)}%`)
const fmtX = (n) => (n == null ? '—' : `${n.toFixed(2)}x`)

function fmtDelta(curr, prev, isInverse = false) {
  if (curr == null || prev == null || prev === 0) return null
  const pct = ((curr - prev) / Math.abs(prev)) * 100
  const positive = isInverse ? pct < 0 : pct > 0
  const arrow = pct > 0 ? '▲' : pct < 0 ? '▼' : '–'
  return { pct, positive, arrow, abs: Math.abs(pct) }
}

function Delta({ d, label }) {
  if (!d) return null
  const cls = d.pct === 0 ? 'text-slate-500'
    : d.positive ? 'text-emerald-300'
    : 'text-rose-300'
  return (
    <span className={`text-xs ${cls} inline-flex items-center gap-1`}>
      <span>{d.arrow}</span>
      <span className="tabular-nums">{d.abs.toFixed(0)}%</span>
      <span className="text-slate-500">{label}</span>
    </span>
  )
}

function KPI({ label, value, sub, accent = 'default', index = 0, deltaPrev, deltaYear, inverseDelta = false }) {
  const valueColor =
    accent === 'positive' ? 'text-emerald-300'
    : accent === 'negative' ? 'text-rose-300'
    : accent === 'warning' ? 'text-amber-300'
    : 'text-white'
  return (
    <div
      style={{ animationDelay: `${index * 40}ms` }}
      className="flex-1 min-w-[170px] rounded-2xl bg-white/[0.03] border border-white/[0.06] px-5 py-4 hover:bg-white/[0.06] hover:border-white/[0.12] hover:-translate-y-0.5 transition-all duration-200 fade-up"
    >
      <div className="text-xs text-slate-400 font-medium">{label}</div>
      <div className={`text-2xl mt-1.5 tabular-nums font-mono ${valueColor}`}>{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
      {(deltaPrev || deltaYear) && (
        <div className="flex flex-col gap-0.5 mt-2 pt-2 border-t border-white/[0.04]">
          {deltaPrev && <Delta d={fmtDelta(deltaPrev.curr, deltaPrev.prev, inverseDelta)} label="vs prev" />}
          {deltaYear && <Delta d={fmtDelta(deltaYear.curr, deltaYear.prev, inverseDelta)} label="vs LY" />}
        </div>
      )}
    </div>
  )
}

function Row({ label, value, hint, indent = false, accent }) {
  const valueClass = accent === 'positive' ? 'text-emerald-300'
    : accent === 'negative' ? 'text-rose-300'
    : accent === 'bold' ? 'text-white font-semibold'
    : 'text-slate-200'
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-b-0">
      <span className={`text-sm ${indent ? 'pl-4 text-slate-400' : 'text-slate-200'}`}>{label}</span>
      <div className="flex items-baseline gap-2">
        {hint && <span className="text-xs text-slate-500">{hint}</span>}
        <span className={`text-sm tabular-nums font-mono ${valueClass}`}>{value}</span>
      </div>
    </div>
  )
}

function Section({ title, children, index = 0 }) {
  return (
    <div
      style={{ animationDelay: `${index * 80}ms` }}
      className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6 fade-up"
    >
      <h3 className="text-white text-sm font-semibold tracking-tight mb-4">{title}</h3>
      <div>
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
  const [chartMetrics, setChartMetrics] = useState(['ebitda'])
  const [groupBy, setGroupBy] = useState('day')
  const [dateModalOpen, setDateModalOpen] = useState(false)
  const [draftFrom, setDraftFrom] = useState('')
  const [draftTo, setDraftTo] = useState('')
  const [draftRange, setDraftRange] = useState('30d')

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
    { id: 'totalRevenue', label: 'Revenue', color: '#38bdf8' },
    { id: 'marketingExpenses', label: 'Ad Spend', color: '#a855f7' },
    { id: 'contributionProfit', label: 'Contribution', color: '#34d399' },
    { id: 'ebitda', label: 'EBITDA', color: '#10b981' },
    { id: 'opex', label: 'OPEX', color: '#ef4444' },
    { id: 'orders', label: 'Orders', color: '#fbbf24' },
    { id: 'ncRevenue', label: 'NC Sales', color: '#f472b6' },
    { id: 'rcRevenue', label: 'RC Sales', color: '#60a5fa' },
  ]
  const selectedMetrics = CHART_METRICS.filter(m => chartMetrics.includes(m.id))
  const showEbitdaArea = chartMetrics.includes('ebitda')

  // Aggregate daily series into week or month buckets when requested
  const groupedSeries = (() => {
    if (groupBy === 'day' || !series.length) return series
    function bucketKey(dateStr) {
      const d = new Date(dateStr)
      if (groupBy === 'month') return dateStr.substring(0, 7)
      // week: monday-anchored ISO-ish week label
      const day = d.getUTCDay() || 7
      d.setUTCDate(d.getUTCDate() - day + 1)
      return d.toISOString().substring(0, 10)
    }
    const buckets = new Map()
    const sumKeys = ['totalRevenue', 'netSales', 'returns', 'cancellations', 'shippingCharges', 'orders', 'ncOrders', 'rcOrders', 'ncRevenue', 'rcRevenue', 'metaSpend', 'googleSpend', 'marketingExpenses', 'contributionProfit', 'opex', 'ebitda']
    for (const d of series) {
      const k = bucketKey(d.date)
      if (!buckets.has(k)) buckets.set(k, { date: k })
      const b = buckets.get(k)
      for (const key of sumKeys) {
        b[key] = (b[key] || 0) + (d[key] || 0)
      }
    }
    return [...buckets.values()].sort((a, b) => a.date.localeCompare(b.date))
  })()

  // Compute gradient split offset so green fills above 0 and red below.
  const ebitdaValues = groupedSeries.map(d => d.ebitda || 0)
  const ebitdaMax = ebitdaValues.length ? Math.max(...ebitdaValues, 0) : 0
  const ebitdaMin = ebitdaValues.length ? Math.min(...ebitdaValues, 0) : 0
  const ebitdaRange = ebitdaMax - ebitdaMin || 1
  const splitOffset = Math.max(0, Math.min(1, ebitdaMax / ebitdaRange))

  function toggleMetric(id) {
    setChartMetrics(prev => prev.includes(id)
      ? (prev.length > 1 ? prev.filter(x => x !== id) : prev)
      : [...prev, id])
  }

  function openDateModal() {
    setDraftRange(range)
    setDraftFrom(customFrom || (data?.from ? data.from.split('T')[0] : ''))
    setDraftTo(customTo || (data?.to ? data.to.split('T')[0] : ''))
    setDateModalOpen(true)
  }

  function applyDateModal() {
    setRange(draftRange)
    if (draftRange === 'custom') {
      setCustomFrom(draftFrom)
      setCustomTo(draftTo)
    } else {
      setCustomFrom('')
      setCustomTo('')
    }
    setDateModalOpen(false)
  }

  return (
    <>
      <Head><title>Jarvis — P&amp;L</title></Head>
      <style jsx global>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .fade-up { animation: fadeUp 0.6s ease-out both; }
      `}</style>
      <div className="min-h-screen bg-black text-white">
        <div className="border-b border-white/[0.06] px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-white text-xl font-semibold tracking-tight">Profit &amp; Loss</h1>
            <p className="text-slate-400 text-sm mt-0.5">{data?.label || 'Loading…'}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {RANGES.map(r => (
              <button
                key={r.id}
                onClick={() => setRange(r.id)}
                className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                  range === r.id
                    ? 'bg-white/[0.10] text-white'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                {r.label}
              </button>
            ))}
            <button
              onClick={openDateModal}
              className="text-xs px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.10] text-slate-300 hover:text-white"
            >
              Custom…
            </button>
            <Link href="/" className="text-xs px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.10] text-slate-300 hover:text-white">← Jarvis</Link>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
          {loading && !data && <div className="text-slate-400 text-sm">Crunching numbers…</div>}
          {data?.error && <div className="text-rose-300 text-sm">Error: {data.error}</div>}
          {t && (
            <>
              {(() => {
                const prevT = data?.comparisons?.prevPeriod?.totals
                const yearT = data?.comparisons?.lastYear?.totals
                const dP = (path) => prevT ? { curr: get(t, path), prev: get(prevT, path) } : null
                const dY = (path) => yearT ? { curr: get(t, path), prev: get(yearT, path) } : null
                return (
                  <div className="flex gap-3 flex-wrap">
                    <KPI label="Total Sales" value={fmtMoney(t.kpis.totalSales)} index={0}
                      deltaPrev={dP('kpis.totalSales')} deltaYear={dY('kpis.totalSales')} />
                    <KPI label="Orders" value={fmtInt(t.kpis.totalOrders)} index={1}
                      deltaPrev={dP('kpis.totalOrders')} deltaYear={dY('kpis.totalOrders')} />
                    <KPI label="AOV" value={fmtMoney(t.kpis.aov, 2)} index={2}
                      deltaPrev={dP('kpis.aov')} deltaYear={dY('kpis.aov')} />
                    <KPI label="eCPA" value={fmtMoney(t.kpis.ecpa, 2)} accent="warning" index={3}
                      deltaPrev={dP('kpis.ecpa')} deltaYear={dY('kpis.ecpa')} inverseDelta />
                    <KPI label="eROAS" value={fmtX(t.kpis.eroas)} accent={t.kpis.eroas >= 2 ? 'positive' : 'negative'} index={4}
                      deltaPrev={dP('kpis.eroas')} deltaYear={dY('kpis.eroas')} />
                    <KPI label="Contribution" value={fmtMoney(t.profit.contributionProfit)} sub={fmtPct(t.profit.contributionProfitPct)} accent={t.profit.contributionProfit >= 0 ? 'positive' : 'negative'} index={5}
                      deltaPrev={dP('profit.contributionProfit')} deltaYear={dY('profit.contributionProfit')} />
                    <KPI label="EBITDA" value={fmtMoney(t.profit.ebitda)} sub={fmtPct(t.profit.ebitdaPct)} accent={t.profit.ebitda >= 0 ? 'positive' : 'negative'} index={6}
                      deltaPrev={dP('profit.ebitda')} deltaYear={dY('profit.ebitda')} />
                  </div>
                )
              })()}

              <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6 fade-up">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <h3 className="text-white text-sm font-semibold tracking-tight">Trend</h3>
                    <button
                      onClick={openDateModal}
                      className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-white"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {data?.label || 'Select range'}
                    </button>
                    <div className="flex items-center gap-1">
                      {['day', 'week', 'month'].map(g => (
                        <button
                          key={g}
                          onClick={() => setGroupBy(g)}
                          className={`text-xs px-2.5 py-1 rounded-full ${groupBy === g ? 'bg-white/[0.10] text-white' : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'}`}
                        >
                          {g[0].toUpperCase() + g.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {CHART_METRICS.map(m => {
                      const active = chartMetrics.includes(m.id)
                      return (
                        <button
                          key={m.id}
                          onClick={() => toggleMetric(m.id)}
                          style={active ? { background: `${m.color}22`, color: m.color, boxShadow: `inset 0 0 0 1px ${m.color}55` } : undefined}
                          className={`text-xs px-3 py-1 rounded-full transition-colors ${
                            active ? '' : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
                          }`}
                        >
                          {m.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={320}>
                  <ComposedChart data={groupedSeries}>
                    <defs>
                      <linearGradient id="ebitdaSplit" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.5} />
                        <stop offset={`${splitOffset * 100}%`} stopColor="#10b981" stopOpacity={0.05} />
                        <stop offset={`${splitOffset * 100}%`} stopColor="#ef4444" stopOpacity={0.05} />
                        <stop offset="100%" stopColor="#ef4444" stopOpacity={0.5} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="date" stroke="rgba(255,255,255,0.4)" fontSize={11} />
                    <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} />
                    <Tooltip
                      contentStyle={{ background: 'rgba(0,0,0,0.95)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, fontSize: 12 }}
                      labelStyle={{ color: '#fff', fontWeight: 600 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <ReferenceLine
                      y={0}
                      stroke="rgba(255,255,255,0.45)"
                      strokeDasharray="4 4"
                      strokeWidth={1}
                      label={{ value: 'Break-even', position: 'insideTopRight', fill: 'rgba(255,255,255,0.55)', fontSize: 10 }}
                    />
                    {showEbitdaArea && (
                      <Area
                        type="monotone"
                        dataKey="ebitda"
                        name="EBITDA fill"
                        stroke="none"
                        fill="url(#ebitdaSplit)"
                        legendType="none"
                        isAnimationActive={false}
                      />
                    )}
                    {selectedMetrics.map(m => (
                      <Line
                        key={m.id}
                        type="monotone"
                        dataKey={m.id}
                        name={m.label}
                        stroke={m.id === 'ebitda' ? '#10b981' : m.color}
                        strokeWidth={m.id === 'ebitda' ? 2.5 : 2}
                        dot={false}
                        activeDot={{ r: 4 }}
                      />
                    ))}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Section title="Revenue" index={0}>
                  <Row label="Net sales" value={fmtMoney(t.revenue.netSales)} />
                  <Row label="Returns" value={fmtMoney(-t.revenue.returns)} accent="negative" />
                  <Row label="Cancellations" value={fmtMoney(-t.revenue.cancellations)} accent="negative" />
                  <Row label="Shipping charges" value={fmtMoney(t.revenue.shippingCharges)} />
                  <Row label="Total revenue" value={fmtMoney(t.revenue.totalRevenue)} accent="bold" />
                </Section>

                <Section title="Costs" index={1}>
                  <Row
                    label={
                      <span className="inline-flex items-center gap-2 flex-wrap">
                        Payment providers
                        {t.costs.paymentSource === 'gateway' && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-400/15 text-emerald-300" title={Object.entries(t.costs.gatewayBreakdown || {}).map(([g, v]) => `${g}: £${v.fees}`).join(' · ')}>Per gateway</span>
                        )}
                        {t.costs.paymentSource === 'hybrid' && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-400/15 text-amber-300" title={`${t.costs.ordersWithGatewayRate}/${t.costs.ordersWithGatewayRate + t.costs.ordersWithoutGatewayRate} orders matched a known gateway`}>Hybrid · {t.costs.ordersWithGatewayRate}/{t.costs.ordersWithGatewayRate + t.costs.ordersWithoutGatewayRate}</span>
                        )}
                        {t.costs.paymentSource === 'rate' && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-rose-400/15 text-rose-300">Flat 2.5%</span>
                        )}
                      </span>
                    }
                    value={fmtMoney(t.costs.paymentProviders)}
                    hint={t.costs.paymentSource === 'gateway' ? 'real per gateway' : t.costs.paymentSource === 'hybrid' ? 'real + 2.5% fallback' : '2.5%'}
                  />
                  <Row
                    label={
                      <span className="inline-flex items-center gap-2 flex-wrap">
                        COGS
                        {t.costs.cogsSource === 'shopify' && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-400/15 text-emerald-300">via Shopify</span>
                        )}
                        {t.costs.cogsSource === 'shopify+collection' && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-400/15 text-emerald-300" title={`${t.costs.lineItemsWithCost} from Shopify · ${t.costs.lineItemsCollection} via product type fallback (£8 inhaler, £0.65 flavour)`}>Shopify + product type</span>
                        )}
                        {t.costs.cogsSource === 'hybrid' && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-400/15 text-amber-300" title={`${t.costs.lineItemsWithCost}/${t.costs.lineItemsTotal} have Shopify cost · ${t.costs.lineItemsCollection} via fallback · rest use 20.5%`}>Hybrid · {t.costs.lineItemsWithCost + t.costs.lineItemsCollection}/{t.costs.lineItemsTotal}</span>
                        )}
                        {t.costs.cogsSource === 'rate' && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-rose-400/15 text-rose-300" title="No Shopify cost and no title match; using flat 20.5%">Flat 20.5%</span>
                        )}
                      </span>
                    }
                    value={fmtMoney(t.costs.cogs)}
                    hint={t.costs.cogsSource === 'shopify' ? 'unit cost × qty' : t.costs.cogsSource === 'shopify+collection' ? '£8 inhaler · £0.65 flavour' : t.costs.cogsSource === 'hybrid' ? 'real + fallbacks' : '20.5%'}
                  />
                  <Row
                    label={
                      <span className="inline-flex items-center gap-2 flex-wrap">
                        Shipping &amp; fulfilment
                        {t.costs.shippingSource === 'uploaded' && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-400/15 text-emerald-300">ShipStation upload</span>
                        )}
                        {t.costs.shippingSource === 'hybrid' && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-400/15 text-amber-300" title={`${t.costs.ordersWithShipping}/${t.costs.ordersWithShipping + t.costs.ordersWithoutShipping} orders have uploaded cost; rest use 6.7%`}>Hybrid · {t.costs.ordersWithShipping}/{t.costs.ordersWithShipping + t.costs.ordersWithoutShipping}</span>
                        )}
                        {t.costs.shippingSource === 'rate' && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-rose-400/15 text-rose-300">Flat 6.7%</span>
                        )}
                      </span>
                    }
                    value={fmtMoney(t.costs.shippingFulfilment)}
                    hint={t.costs.shippingSource === 'uploaded' ? 'real cost / order' : t.costs.shippingSource === 'hybrid' ? 'real + 6.7% fallback' : '6.7%'}
                  />
                  <Row label="Sales expenses" value={fmtMoney(t.costs.salesExpenses)} accent="bold" />
                  {data?.revolut?.connected && data.revolut.inventoryCount > 0 && (
                    <Row
                      label="Inventory cash (Klarna / suppliers)"
                      value={fmtMoney(data.revolut.inventoryCash)}
                      hint={`${data.revolut.inventoryCount} txns`}
                    />
                  )}
                  <Row label="Meta spend" value={fmtMoney(t.costs.metaSpend)} indent />
                  <Row label="Google spend" value={fmtMoney(t.costs.googleSpend)} indent />
                  <Row label="Marketing expenses" value={fmtMoney(t.costs.marketingExpenses)} accent="bold" />
                  <Row label="as % of revenue" value={fmtPct(t.costs.marketingPctRevenue)} indent />
                  <Row label="as % of net sales" value={fmtPct(t.costs.marketingPctNetSales)} indent />
                </Section>

                <Section title="Profitability" index={2}>
                  <Row label="Contribution profit" value={fmtMoney(t.profit.contributionProfit)} accent={t.profit.contributionProfit >= 0 ? 'positive' : 'negative'} />
                  <Row label="as %" value={fmtPct(t.profit.contributionProfitPct)} indent />
                  <Row
                    label={
                      <span className="inline-flex items-center gap-2 flex-wrap">
                        OPEX
                        {data?.opexSource === 'revolut' && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-400/15 text-emerald-300">via Revolut</span>
                        )}
                        {data?.opexSource === 'override' && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-400/15 text-amber-300">Manual</span>
                        )}
                        {data?.opexSource === 'none' && (
                          <a href="/api/revolut/auth" className="text-xs px-2 py-0.5 rounded-full bg-sky-400/15 text-sky-300 hover:text-sky-200">Connect Revolut</a>
                        )}
                        {opexMode === 'override' ? (
                          <input
                            type="number"
                            value={opex}
                            onChange={e => setOpex(e.target.value)}
                            onBlur={() => load()}
                            className="ml-1 w-24 bg-white/[0.04] border border-white/10 rounded px-2 py-0.5 text-xs text-white font-mono"
                            placeholder="manual"
                          />
                        ) : null}
                        <button
                          onClick={() => setOpexMode(opexMode === 'auto' ? 'override' : 'auto')}
                          className="text-xs text-sky-400 hover:text-sky-300"
                        >
                          {opexMode === 'auto' ? 'override' : 'auto'}
                        </button>
                      </span>
                    }
                    value={fmtMoney(t.costs.opex)}
                  />
                  <Row label="as %" value={fmtPct(t.costs.opexPctRevenue)} indent />
                  {data?.revolut?.connected && (
                    <>
                      <Row label="Revolut transactions counted" value={fmtInt(data.revolut.transactions)} hint="matched OPEX" indent />
                      {data.revolut.excludedCount > 0 && (
                        <Row
                          label="Excluded (inventory / COGS)"
                          value={fmtMoney(data.revolut.excludedOpex)}
                          hint={`${data.revolut.excludedCount} txns`}
                          indent
                        />
                      )}
                    </>
                  )}
                  <Row label="EBITDA" value={fmtMoney(t.profit.ebitda)} accent={t.profit.ebitda >= 0 ? 'positive' : 'negative'} />
                  <Row label="as %" value={fmtPct(t.profit.ebitdaPct)} indent />
                </Section>

                <Section title="Customer split" index={3}>
                  <Row label="New customer sales" value={fmtMoney(t.newCustomers.sales)} accent="bold" />
                  <Row label="NC orders" value={fmtInt(t.newCustomers.orders)} indent />
                  <Row label="NC AOV" value={fmtMoney(t.newCustomers.aov, 2)} indent />
                  <Row label="NC-CPA" value={fmtMoney(t.newCustomers.cpa, 2)} indent />
                  <Row label="NC-ROAS" value={fmtX(t.newCustomers.roas)} indent />
                  <div className="h-3" />
                  <Row label="Returning customer sales" value={fmtMoney(t.returningCustomers.sales)} accent="bold" />
                  <Row label="RC orders" value={fmtInt(t.returningCustomers.orders)} indent />
                  <Row label="RC AOV" value={fmtMoney(t.returningCustomers.aov, 2)} indent />
                </Section>
              </div>

              <div className="text-xs text-slate-500">
                Rates: COGS 20.5% · Payment 2.5% · Shipping &amp; Fulfilment 6.7% · Live from Shopify + Windsor. New vs Returning split uses Shopify <code className="font-mono text-slate-400">customer.orders_count</code>.
              </div>
            </>
          )}
        </div>

        {dateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/80 backdrop-blur-md" onClick={() => setDateModalOpen(false)}>
            <div className="w-full max-w-md bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl p-6" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-white text-lg font-semibold tracking-tight">Select date range</h2>
                <button onClick={() => setDateModalOpen(false)} className="text-slate-400 hover:text-white p-1">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <div className="text-xs text-slate-400 mb-2 font-medium">Presets</div>
              <div className="flex flex-wrap gap-2 mb-5">
                {RANGES.map(r => (
                  <button
                    key={r.id}
                    onClick={() => setDraftRange(r.id)}
                    className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                      draftRange === r.id
                        ? 'bg-white/[0.12] text-white'
                        : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
                <button
                  onClick={() => setDraftRange('custom')}
                  className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                    draftRange === 'custom'
                      ? 'bg-white/[0.12] text-white'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
                  }`}
                >
                  Custom
                </button>
              </div>

              <div className="text-xs text-slate-400 mb-2 font-medium">Custom range</div>
              <div className="flex items-center gap-2 mb-6">
                <input
                  type="date"
                  value={draftFrom}
                  onChange={e => { setDraftFrom(e.target.value); setDraftRange('custom') }}
                  className="flex-1 bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-sky-400/50 focus:outline-none"
                />
                <span className="text-slate-500">→</span>
                <input
                  type="date"
                  value={draftTo}
                  onChange={e => { setDraftTo(e.target.value); setDraftRange('custom') }}
                  className="flex-1 bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-sky-400/50 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-white/[0.06]">
                <button
                  onClick={() => setDateModalOpen(false)}
                  className="text-sm px-4 py-2 rounded-full bg-white/[0.04] hover:bg-white/[0.10] text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={applyDateModal}
                  className="text-sm px-4 py-2 rounded-full bg-sky-500/90 hover:bg-sky-500 text-white font-medium"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
