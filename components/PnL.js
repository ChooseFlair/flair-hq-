import { useState, useEffect, useMemo } from 'react'
import { BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'

const fmt = (v) => `£${Math.abs(v).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmtShort = (v) => {
  const abs = Math.abs(v)
  if (abs >= 1000) return `${v < 0 ? '-' : ''}£${(abs / 1000).toFixed(1)}k`
  return `${v < 0 ? '-' : ''}£${abs.toFixed(0)}`
}
const monthLabel = (m) => {
  if (!m) return ''
  const [y, mo] = m.split('-')
  const names = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${names[parseInt(mo)]} ${y.slice(2)}`
}

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
      <div className="text-gray-500 mb-1 font-medium">{monthLabel(label)}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color }} className="font-medium">
          {p.name}: {typeof p.value === 'number' ? (p.name === 'eROAS' ? `${p.value.toFixed(2)}x` : fmt(p.value)) : p.value}
        </div>
      ))}
    </div>
  )
}

const ROW_CONFIG = [
  { key: 'netSales', label: 'Net Sales', bold: false, format: 'currency' },
  { key: 'returns', label: 'Returns', bold: false, format: 'currency', italic: true },
  { key: 'shippingCharges', label: 'Shipping Charges', bold: false, format: 'currency' },
  { key: 'totalRevenue', label: 'Total Revenue', bold: true, format: 'currency', highlight: true },
  { key: 'divider1' },
  { key: 'paymentProviders', label: 'Payment Providers', bold: false, format: 'currency' },
  { key: 'cogs', label: 'COGS', bold: false, format: 'currency' },
  { key: 'shippingFulfilment', label: 'Shipping & Fulfilment', bold: false, format: 'currency' },
  { key: 'salesExpenses', label: 'Sales Expenses', bold: true, format: 'currency' },
  { key: 'divider2' },
  { key: 'metaSpend', label: 'Meta Spend', bold: false, format: 'currency' },
  { key: 'googleSpend', label: 'Google Spend', bold: false, format: 'currency' },
  { key: 'marketingPctRevenue', label: 'as % of revenue', bold: false, format: 'percent', italic: true },
  { key: 'marketingExpenses', label: 'Marketing Expenses', bold: true, format: 'currency' },
  { key: 'divider3' },
  { key: 'contributionProfit', label: 'Contribution Profit', bold: true, format: 'currency', color: true },
  { key: 'opex', label: 'OPEX', bold: false, format: 'currency' },
  { key: 'ebitda', label: 'EBITDA', bold: true, format: 'currency', color: true, highlight: true },
  { key: 'ebitdaPct', label: 'EBITDA %', bold: false, format: 'percent', italic: true },
  { key: 'divider4' },
  { key: 'orders', label: 'Total Orders', bold: false, format: 'number' },
  { key: 'aov', label: 'AOV', bold: false, format: 'currency' },
  { key: 'ecpa', label: 'eCPA', bold: false, format: 'currency' },
  { key: 'eroas', label: 'eROAS', bold: false, format: 'ratio' },
]

function CellValue({ value, format, color, bold }) {
  if (value === undefined || value === null) return <span className="text-gray-300">—</span>

  let display
  let colorClass = 'text-gray-900'

  switch (format) {
    case 'currency':
      display = fmt(value)
      if (value < 0) display = `-${fmt(value)}`
      if (color) colorClass = value >= 0 ? 'text-green-600' : 'text-red-600'
      break
    case 'percent':
      display = `${value}%`
      break
    case 'number':
      display = value.toLocaleString()
      break
    case 'ratio':
      display = `${value.toFixed(2)}x`
      break
    default:
      display = String(value)
  }

  return <span className={`${colorClass} ${bold ? 'font-semibold' : ''} tabular-nums`}>{display}</span>
}

export default function PnL() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeChart, setActiveChart] = useState('revenue')
  const [dateRange, setDateRange] = useState('all')

  useEffect(() => {
    loadData()
  }, [dateRange])

  async function loadData() {
    setLoading(true)
    try {
      let url = '/api/pnl'
      if (dateRange !== 'all') {
        const now = new Date()
        const ranges = {
          '3m': 3, '6m': 6, '12m': 12,
        }
        if (ranges[dateRange]) {
          const from = new Date(now)
          from.setMonth(from.getMonth() - ranges[dateRange])
          url += `?from=${from.toISOString().substring(0, 7)}`
        }
      }
      const res = await fetch(url)
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      setData(json)
    } catch (e) {
      console.error('PnL load error:', e)
    } finally {
      setLoading(false)
    }
  }

  const chartData = useMemo(() => {
    if (!data?.months) return []
    return data.months.map(m => ({
      ...m,
      monthLabel: monthLabel(m.month),
    }))
  }, [data])

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profit & Loss</h1>
          <p className="text-gray-500 mt-1">Loading financial data...</p>
        </div>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl" />)}
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-16 text-red-500">Failed to load P&L data</div>
    )
  }

  const { months, totals } = data

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profit & Loss</h1>
          <p className="text-gray-500 mt-1">Monthly financial breakdown from live order data.</p>
        </div>
        <div className="flex gap-2">
          {[
            { key: 'all', label: 'All Time' },
            { key: '12m', label: '12 Months' },
            { key: '6m', label: '6 Months' },
            { key: '3m', label: '3 Months' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setDateRange(key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                dateRange === key
                  ? 'bg-green-100 text-green-700'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Revenue</p>
          <p className="text-xl font-bold text-gray-900">{fmt(totals.totalRevenue)}</p>
          <p className="text-xs text-gray-400 mt-1">{totals.orders} orders</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Contribution Profit</p>
          <p className={`text-xl font-bold ${totals.contributionProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(totals.contributionProfit)}</p>
          <p className="text-xs text-gray-400 mt-1">After COGS + ads</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">EBITDA</p>
          <p className={`text-xl font-bold ${totals.ebitda >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(totals.ebitda)}</p>
          <p className="text-xs text-gray-400 mt-1">{totals.ebitdaPct}% margin</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">AOV</p>
          <p className="text-xl font-bold text-gray-900">{fmt(totals.aov)}</p>
          <p className="text-xs text-gray-400 mt-1">Avg order value</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">eROAS</p>
          <p className={`text-xl font-bold ${totals.eroas >= 1.5 ? 'text-green-600' : totals.eroas >= 1 ? 'text-yellow-600' : 'text-red-600'}`}>{totals.eroas}x</p>
          <p className="text-xs text-gray-400 mt-1">eCPA: {fmt(totals.ecpa)}</p>
        </div>
      </div>

      {/* Chart Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Monthly Trends</h3>
          <div className="flex gap-1">
            {[
              { key: 'revenue', label: 'Revenue' },
              { key: 'profit', label: 'Profit' },
              { key: 'spend', label: 'Ad Spend' },
              { key: 'efficiency', label: 'Efficiency' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveChart(key)}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  activeChart === key
                    ? 'bg-green-100 text-green-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          {activeChart === 'revenue' ? (
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="month" tickFormatter={monthLabel} stroke="#9ca3af" fontSize={12} />
              <YAxis tickFormatter={fmtShort} stroke="#9ca3af" fontSize={12} />
              <Tooltip content={<ChartTooltip />} />
              <Legend />
              <Bar dataKey="totalRevenue" name="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="salesExpenses" name="Sales Expenses" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              <Bar dataKey="marketingExpenses" name="Marketing" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          ) : activeChart === 'profit' ? (
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="month" tickFormatter={monthLabel} stroke="#9ca3af" fontSize={12} />
              <YAxis tickFormatter={fmtShort} stroke="#9ca3af" fontSize={12} />
              <Tooltip content={<ChartTooltip />} />
              <Legend />
              <Area type="monotone" dataKey="contributionProfit" name="Contribution Profit" stroke="#10b981" fill="url(#profitGrad)" strokeWidth={2} />
              <Line type="monotone" dataKey="ebitda" name="EBITDA" stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} />
            </AreaChart>
          ) : activeChart === 'spend' ? (
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="month" tickFormatter={monthLabel} stroke="#9ca3af" fontSize={12} />
              <YAxis tickFormatter={fmtShort} stroke="#9ca3af" fontSize={12} />
              <Tooltip content={<ChartTooltip />} />
              <Legend />
              <Bar dataKey="metaSpend" name="Meta Spend" fill="#3b82f6" radius={[4, 4, 0, 0]} stackId="stack" />
              <Bar dataKey="googleSpend" name="Google Spend" fill="#ef4444" radius={[4, 4, 0, 0]} stackId="stack" />
              <Bar dataKey="cogs" name="COGS" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          ) : (
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="month" tickFormatter={monthLabel} stroke="#9ca3af" fontSize={12} />
              <YAxis yAxisId="left" stroke="#9ca3af" fontSize={12} tickFormatter={v => `£${v}`} />
              <YAxis yAxisId="right" orientation="right" stroke="#9ca3af" fontSize={12} tickFormatter={v => `${v}x`} />
              <Tooltip content={<ChartTooltip />} />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="aov" name="AOV" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
              <Line yAxisId="left" type="monotone" dataKey="ecpa" name="eCPA" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
              <Line yAxisId="right" type="monotone" dataKey="eroas" name="eROAS" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* P&L Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">P&L Statement</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left py-3 px-4 font-semibold text-gray-700 sticky left-0 bg-gray-50 min-w-[180px]">Metric</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700 min-w-[110px] bg-green-50">All Time</th>
                {months.map(m => (
                  <th key={m.month} className="text-right py-3 px-4 font-medium text-gray-500 min-w-[100px]">{monthLabel(m.month)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROW_CONFIG.map((row, idx) => {
                if (row.key.startsWith('divider')) {
                  return <tr key={row.key}><td colSpan={months.length + 2} className="h-2 bg-gray-50" /></tr>
                }

                return (
                  <tr key={row.key} className={`${row.highlight ? 'bg-gray-50' : ''} ${idx > 0 ? 'border-t border-gray-100' : ''}`}>
                    <td className={`py-2.5 px-4 sticky left-0 ${row.highlight ? 'bg-gray-50' : 'bg-white'} ${row.bold ? 'font-semibold text-gray-900' : 'text-gray-600'} ${row.italic ? 'italic text-gray-400 text-xs' : ''}`}>
                      {row.label}
                    </td>
                    <td className={`py-2.5 px-4 text-right ${row.highlight ? 'bg-green-50' : ''}`}>
                      <CellValue value={totals[row.key]} format={row.format} color={row.color} bold={row.bold} />
                    </td>
                    {months.map(m => (
                      <td key={m.month} className="py-2.5 px-4 text-right">
                        <CellValue value={m[row.key]} format={row.format} color={row.color} bold={row.bold} />
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assumptions */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Calculation Assumptions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-gray-500">COGS Rate</p>
            <p className="font-semibold text-gray-900">{(data.rates.cogs * 100).toFixed(1)}% of revenue</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-gray-500">Payment Provider Fee</p>
            <p className="font-semibold text-gray-900">{(data.rates.paymentProvider * 100).toFixed(1)}% of revenue</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-gray-500">Shipping & Fulfilment</p>
            <p className="font-semibold text-gray-900">{(data.rates.shippingFulfilment * 100).toFixed(1)}% of revenue</p>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-3">Revenue and orders pulled from live Supabase data. Ad spend from pnl_monthly_overrides table. Rates can be adjusted in the API.</p>
      </div>
    </div>
  )
}
