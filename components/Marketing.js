import { useState, useEffect, useMemo } from 'react'
import { format, parseISO, subDays, eachDayOfInterval, startOfDay, isWithinInterval } from 'date-fns'
import {
  Mail,
  BarChart3,
  Share2,
  Eye,
  TrendingUp,
  TrendingDown,
  Users,
  MousePointer,
  Target,
  ShoppingCart,
  DollarSign,
  Heart,
  MessageCircle,
  Repeat,
  RefreshCw,
  CheckCircle,
  Clock,
  Zap,
  ArrowUp,
  ArrowDown,
  Percent,
  Activity,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts'
import DateRangePicker from './DateRangePicker'
import AISummary from './AISummary'
import TaskWidget from './TaskWidget'

function fmtDate(d) {
  if (!d) return ''
  const dt = new Date(d)
  return `${dt.getDate()} ${dt.toLocaleString('en-GB', { month: 'short' })}`
}

const ChartTooltip = ({ active, payload, label, currency = false }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
      <div className="text-gray-500 mb-1">{fmtDate(label)}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color }} className="font-medium">
          {p.name}: {currency ? `£${p.value.toFixed(2)}` : p.value.toLocaleString()}
        </div>
      ))}
    </div>
  )
}

const COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899']

export default function Marketing({ activeSubTab, setActiveSubTab }) {
  const activeChannel = activeSubTab || 'overview'
  const setActiveChannel = (tab) => setActiveSubTab?.(tab)

  const [klaviyo, setKlaviyo] = useState({ status: 'loading' })
  const [metaData, setMetaData] = useState(null)
  const [organicData, setOrganicData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [syncStatus, setSyncStatus] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState(null)

  const [dateRange, setDateRange] = useState({
    startDate: subDays(new Date(), 30),
    endDate: new Date(),
    preset: '30d',
  })

  useEffect(() => {
    loadData()
    loadSyncStatus()
  }, [])

  // Reload data when date range changes
  useEffect(() => {
    if (!loading) {
      loadData()
    }
  }, [dateRange.preset])

  const loadData = async () => {
    setLoading(true)
    try {
      const startDate = format(dateRange.startDate, 'yyyy-MM-dd')
      const endDate = format(dateRange.endDate, 'yyyy-MM-dd')

      const [klaviyoRes, metaRes, organicRes] = await Promise.all([
        fetch(`/api/klaviyo?startDate=${startDate}&endDate=${endDate}`),
        fetch(`/api/meta/overview?startDate=${startDate}&endDate=${endDate}`),
        fetch(`/api/facebook/organic?startDate=${startDate}&endDate=${endDate}`),
      ])

      const klaviyoJson = await klaviyoRes.json()
      const meta = await metaRes.json()
      const organic = await organicRes.json()

      if (klaviyoJson.error) {
        setKlaviyo({ status: 'error' })
      } else {
        setKlaviyo({ ...klaviyoJson, status: 'live' })
      }

      setMetaData(meta)

      if (organic.needsAuth || organic.error) {
        setOrganicData({ needsAuth: true })
      } else {
        setOrganicData(organic)
      }
    } catch (err) {
      setError(err.message)
      setKlaviyo({ status: 'error' })
    } finally {
      setLoading(false)
    }
  }

  async function loadSyncStatus() {
    try {
      const res = await fetch('/api/klaviyo/sync-status')
      const json = await res.json()
      setSyncStatus(json)
    } catch {
      setSyncStatus(null)
    }
  }

  async function runSync(mode = 'full') {
    setSyncing(true)
    setSyncResult(null)
    try {
      const res = await fetch('/api/klaviyo/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      setSyncResult({ success: true, ...json })
      await loadSyncStatus()
    } catch (e) {
      setSyncResult({ success: false, error: e.message })
    } finally {
      setSyncing(false)
    }
  }

  function formatSyncTime(dateStr) {
    if (!dateStr) return 'Never'
    const d = new Date(dateStr)
    const now = new Date()
    const diff = Math.floor((now - d) / 1000)
    if (diff < 60) return 'Just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  const formatCurrency = (value) => `£${parseFloat(value || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const formatNumber = (value) => parseFloat(value || 0).toLocaleString('en-GB')

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    try {
      return format(parseISO(dateStr), 'MMM d, yyyy')
    } catch {
      return dateStr
    }
  }

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'sent':
      case 'live':
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'draft':
      case 'paused':
        return 'bg-gray-100 text-gray-800'
      case 'scheduled':
        return 'bg-blue-100 text-blue-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-yellow-100 text-yellow-800'
    }
  }

  // Calculate period comparison
  const periodDays = Math.ceil((dateRange.endDate - dateRange.startDate) / (1000 * 60 * 60 * 24))

  const insights = metaData?.insights || {}
  const previousInsights = metaData?.previousInsights || {}
  const liveFlows = (klaviyo.flows || []).filter(f => f.status === 'live')
  const timeSeries = klaviyo.timeSeries || []
  const isLive = klaviyo.status === 'live'

  // Calculate change percentages
  const calcChange = (current, previous) => {
    if (!previous || previous === 0) return null
    return ((current - previous) / previous) * 100
  }

  const spendChange = calcChange(insights.spend, previousInsights.spend)
  const roasChange = calcChange(insights.roas, previousInsights.roas)
  const purchasesChange = calcChange(insights.purchases, previousInsights.purchases)
  const cpaChange = calcChange(insights.cpa, previousInsights.cpa)

  // Meta daily data for charts
  const metaDailyData = useMemo(() => {
    if (!metaData?.dailyInsights) return []
    return metaData.dailyInsights.map(d => ({
      date: d.date,
      spend: parseFloat(d.spend || 0),
      purchases: parseInt(d.purchases || 0),
      revenue: parseFloat(d.purchaseValue || 0),
      roas: d.spend > 0 ? parseFloat(d.purchaseValue || 0) / parseFloat(d.spend) : 0,
      impressions: parseInt(d.impressions || 0),
      clicks: parseInt(d.clicks || 0),
    }))
  }, [metaData])

  // Channel performance summary
  const channelPerformance = useMemo(() => {
    const channels = []

    if (metaData?.insights?.spend) {
      channels.push({
        name: 'Meta Ads',
        spend: insights.spend || 0,
        revenue: insights.purchaseValue || 0,
        roas: insights.roas || 0,
        conversions: insights.purchases || 0,
      })
    }

    if (isLive && klaviyo.revenue) {
      channels.push({
        name: 'Email',
        spend: 0, // Klaviyo subscription cost could go here
        revenue: klaviyo.revenue || 0,
        roas: klaviyo.revenue > 0 ? 999 : 0, // Infinite ROAS for email
        conversions: klaviyo.orders || 0,
      })
    }

    return channels
  }, [metaData, klaviyo, isLive, insights])

  const getAISummaryData = () => ({
    spend: insights.spend,
    roas: insights.roas,
    purchases: insights.purchases,
    cpa: insights.cpa,
    ctr: insights.ctr,
    organicImpressions: organicData?.summary?.impressions,
    emailLists: klaviyo.lists?.length || 0,
    periodDays,
  })

  const ChangeIndicator = ({ value, inverse = false }) => {
    if (value === null || value === undefined) return null
    const isPositive = inverse ? value < 0 : value > 0
    return (
      <span className={`inline-flex items-center text-xs font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
        {Math.abs(value).toFixed(1)}%
      </span>
    )
  }

  return (
    <div className="space-y-6">
      <AISummary pageType="marketing" data={getAISummaryData()} />
      <TaskWidget filterTag="marketing" title="Marketing Tasks" />

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Marketing</h1>
          <p className="text-gray-500 mt-1">Email, paid, and organic performance.</p>
        </div>
        <div className="flex items-center gap-3">
          <DateRangePicker value={dateRange} onChange={setDateRange} />
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {[
          { id: 'overview', label: 'Overview', icon: Eye },
          { id: 'organic', label: 'Organic Social', icon: Share2 },
          { id: 'email', label: 'Email (Klaviyo)', icon: Mail },
          { id: 'meta', label: 'Meta Ads', icon: BarChart3 },
        ].map((channel) => {
          const Icon = channel.icon
          return (
            <button
              key={channel.id}
              onClick={() => setActiveChannel(channel.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeChannel === channel.id
                  ? 'bg-green-100 text-green-700'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {channel.label}
            </button>
          )
        })}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          Error: {error}
        </div>
      )}

      {/* Overview Tab */}
      {activeChannel === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics with Comparisons */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-blue-500" />
                  <p className="text-sm text-gray-500">Ad Spend</p>
                </div>
                <ChangeIndicator value={spendChange} inverse />
              </div>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(insights.spend)}</p>
              <p className="text-xs text-gray-400 mt-1">vs prev {periodDays}d</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <p className="text-sm text-gray-500">ROAS</p>
                </div>
                <ChangeIndicator value={roasChange} />
              </div>
              <p className="text-2xl font-bold text-green-600">{(insights.roas || 0).toFixed(2)}x</p>
              <p className="text-xs text-gray-400 mt-1">Return on ad spend</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-purple-500" />
                  <p className="text-sm text-gray-500">Conversions</p>
                </div>
                <ChangeIndicator value={purchasesChange} />
              </div>
              <p className="text-2xl font-bold text-purple-600">{insights.purchases || 0}</p>
              <p className="text-xs text-gray-400 mt-1">From paid ads</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-red-500" />
                  <p className="text-sm text-gray-500">CPA</p>
                </div>
                <ChangeIndicator value={cpaChange} inverse />
              </div>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(insights.cpa)}</p>
              <p className="text-xs text-gray-400 mt-1">Cost per acquisition</p>
            </div>
          </div>

          {/* Email Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Mail className="w-4 h-4 text-indigo-500" />
                <p className="text-sm text-gray-500">Emails Sent</p>
              </div>
              <p className="text-xl font-bold text-gray-900">{isLive ? (klaviyo.emailsSent || 0).toLocaleString() : '—'}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Eye className="w-4 h-4 text-green-500" />
                <p className="text-sm text-gray-500">Opens</p>
              </div>
              <p className="text-xl font-bold text-green-600">{isLive ? (klaviyo.opens || 0).toLocaleString() : '—'}</p>
              <p className="text-xs text-gray-400">{klaviyo.openRate || 0}% rate</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <MousePointer className="w-4 h-4 text-blue-500" />
                <p className="text-sm text-gray-500">Clicks</p>
              </div>
              <p className="text-xl font-bold text-blue-600">{isLive ? (klaviyo.clicks || 0).toLocaleString() : '—'}</p>
              <p className="text-xs text-gray-400">{klaviyo.clickRate || 0}% rate</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-purple-500" />
                <p className="text-sm text-gray-500">Subscribers</p>
              </div>
              <p className="text-xl font-bold text-purple-600">{isLive ? `${(klaviyo.totalProfiles || 0).toLocaleString()}${klaviyo.hasMoreProfiles ? '+' : ''}` : '—'}</p>
              <p className="text-xs text-gray-400">+{isLive ? klaviyo.newSubscribers || 0 : 0} new</p>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Spend vs Revenue Chart */}
            {metaDailyData.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Ad Spend vs Revenue</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={metaDailyData}>
                    <defs>
                      <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="date" tickFormatter={fmtDate} stroke="#9ca3af" fontSize={12} />
                    <YAxis stroke="#9ca3af" fontSize={12} tickFormatter={(v) => `£${v}`} />
                    <Tooltip content={<ChartTooltip currency />} />
                    <Area type="monotone" dataKey="spend" name="Spend" stroke="#EF4444" fill="url(#spendGrad)" strokeWidth={2} />
                    <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#10B981" fill="url(#revenueGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Email Engagement Chart */}
            {isLive && timeSeries.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Email Engagement</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={timeSeries}>
                    <defs>
                      <linearGradient id="ovSent" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="ovOpens" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="date" tickFormatter={fmtDate} stroke="#9ca3af" fontSize={12} />
                    <YAxis stroke="#9ca3af" fontSize={12} />
                    <Tooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="sent" name="Sent" stroke="#6366f1" fill="url(#ovSent)" strokeWidth={2} />
                    <Area type="monotone" dataKey="opens" name="Opens" stroke="#10b981" fill="url(#ovOpens)" strokeWidth={2} />
                    <Area type="monotone" dataKey="clicks" name="Clicks" stroke="#f59e0b" fill="none" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* ROAS Trend */}
          {metaDailyData.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">ROAS Trend</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={metaDailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="date" tickFormatter={fmtDate} stroke="#9ca3af" fontSize={12} />
                  <YAxis stroke="#9ca3af" fontSize={12} tickFormatter={(v) => `${v.toFixed(1)}x`} />
                  <Tooltip formatter={(v) => `${v.toFixed(2)}x`} labelFormatter={fmtDate} />
                  <Line type="monotone" dataKey="roas" name="ROAS" stroke="#10B981" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Channel Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Mail className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Klaviyo</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${isLive ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {isLive ? 'Connected' : 'Error'}
                  </span>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Active Flows</span>
                  <span className="font-medium">{liveFlows.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Lists</span>
                  <span className="font-medium">{klaviyo.lists?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Email Orders</span>
                  <span className="font-medium text-green-600">{klaviyo.orders || 0}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Meta Ads</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${metaData?.account ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {metaData?.account ? 'Connected' : 'Pending'}
                  </span>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Active Campaigns</span>
                  <span className="font-medium">{metaData?.campaigns?.filter(c => c.status === 'ACTIVE').length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">CTR</span>
                  <span className="font-medium">{(insights.ctr || 0).toFixed(2)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Purchases</span>
                  <span className="font-medium text-green-600">{insights.purchases || 0}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center">
                  <Share2 className="w-6 h-6 text-pink-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Organic Social</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${!organicData?.needsAuth ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {!organicData?.needsAuth ? 'Connected' : 'Not Connected'}
                  </span>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Page Likes</span>
                  <span className="font-medium">{formatNumber(organicData?.page?.fanCount || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Reach</span>
                  <span className="font-medium">{formatNumber(organicData?.summary?.reach || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Engagements</span>
                  <span className="font-medium">{formatNumber(organicData?.summary?.engagedUsers || 0)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Organic Social Tab */}
      {activeChannel === 'organic' && (
        <div className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : organicData?.needsAuth ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Share2 className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Connect Facebook Page</h2>
              <p className="text-gray-500 mb-4">Add your Facebook Page Access Token to see organic social data.</p>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                    <Share2 className="w-8 h-8 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{organicData?.page?.name}</h2>
                    <p className="text-gray-500">@{organicData?.page?.username}</p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-2xl font-bold text-blue-600">{formatNumber(organicData?.page?.fanCount || 0)}</p>
                    <p className="text-sm text-gray-500">Page Likes</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                      <Eye className="w-5 h-5 text-blue-600" />
                    </div>
                    <p className="text-sm text-gray-500">Impressions</p>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{formatNumber(organicData?.summary?.impressions || 0)}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                      <Users className="w-5 h-5 text-purple-600" />
                    </div>
                    <p className="text-sm text-gray-500">Reach</p>
                  </div>
                  <p className="text-2xl font-bold text-purple-600">{formatNumber(organicData?.summary?.reach || 0)}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                      <MousePointer className="w-5 h-5 text-green-600" />
                    </div>
                    <p className="text-sm text-gray-500">Engaged Users</p>
                  </div>
                  <p className="text-2xl font-bold text-green-600">{formatNumber(organicData?.summary?.engagedUsers || 0)}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-orange-600" />
                    </div>
                    <p className="text-sm text-gray-500">Net Fan Change</p>
                  </div>
                  <p className={`text-2xl font-bold ${(organicData?.summary?.netFanChange || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {(organicData?.summary?.netFanChange || 0) >= 0 ? '+' : ''}{organicData?.summary?.netFanChange || 0}
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-900">Recent Posts</h3>
                </div>
                <div className="divide-y divide-gray-100">
                  {organicData?.recentPosts?.length > 0 ? (
                    organicData.recentPosts.slice(0, 5).map((post) => (
                      <div key={post.id} className="px-6 py-4">
                        <div className="flex items-start gap-4">
                          <div className="flex-1 min-w-0">
                            <p className="text-gray-900 line-clamp-2">{post.message || '(No text)'}</p>
                            <p className="text-xs text-gray-400 mt-1">{formatDate(post.createdTime)}</p>
                          </div>
                          <div className="flex gap-4 text-sm text-gray-500">
                            <span className="flex items-center gap-1"><Heart className="w-4 h-4" /> {post.reactions}</span>
                            <span className="flex items-center gap-1"><MessageCircle className="w-4 h-4" /> {post.comments}</span>
                            <span className="flex items-center gap-1"><Repeat className="w-4 h-4" /> {post.shares}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="px-6 py-8 text-center text-gray-500">No recent posts found</div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Email (Klaviyo) Tab */}
      {activeChannel === 'email' && (
        klaviyo.status === 'loading' ? (
          <div className="text-center py-16 text-gray-500">Loading Klaviyo data...</div>
        ) : klaviyo.status === 'error' ? (
          <div className="text-center py-16 text-red-500">Failed to connect to Klaviyo</div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <p className="text-sm text-gray-500">Subscribers</p>
                <p className="text-xl font-bold text-gray-900">{(klaviyo.totalProfiles || 0).toLocaleString()}{klaviyo.hasMoreProfiles ? '+' : ''}</p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <p className="text-sm text-gray-500">Open Rate</p>
                <p className="text-xl font-bold text-green-600">{klaviyo.openRate || 0}%</p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <p className="text-sm text-gray-500">Click Rate</p>
                <p className="text-xl font-bold text-blue-600">{klaviyo.clickRate || 0}%</p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <p className="text-sm text-gray-500">Orders</p>
                <p className="text-xl font-bold text-purple-600">{(klaviyo.orders || 0).toLocaleString()}</p>
              </div>
            </div>

            {timeSeries.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Email Performance</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={timeSeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="date" tickFormatter={fmtDate} stroke="#9ca3af" fontSize={12} />
                    <YAxis stroke="#9ca3af" fontSize={12} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend />
                    <Bar dataKey="sent" name="Sent" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="opens" name="Opens" fill="#10B981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="clicks" name="Clicks" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Flows</h3>
                <div className="space-y-3">
                  {liveFlows.length ? liveFlows.map((f, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <span className="font-medium text-gray-900">{f.name}</span>
                        <span className="text-sm text-gray-400 ml-2">({f.trigger})</span>
                      </div>
                      <span className="text-sm text-green-600 font-medium flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" /> Live
                      </span>
                    </div>
                  )) : <p className="text-gray-500 text-center py-4">No active flows</p>}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Campaigns</h3>
                <div className="space-y-2">
                  {(klaviyo.campaigns || []).slice(0, 5).map((c, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                      <span className="text-sm text-gray-900">{c.name}</span>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        c.status === 'Sent' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                      }`}>{c.status}</span>
                    </div>
                  ))}
                  {!(klaviyo.campaigns || []).length && <p className="text-gray-500 text-center py-4">No campaigns</p>}
                </div>
              </div>
            </div>

            {/* Sync Section */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-indigo-600" />
                    Klaviyo Sync
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">Last synced: {formatSyncTime(syncStatus?.last_sync)}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => runSync('incremental')}
                    disabled={syncing}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      syncing ? 'bg-gray-100 text-gray-400' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Quick Sync
                  </button>
                  <button
                    onClick={() => runSync('full')}
                    disabled={syncing}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      syncing ? 'bg-gray-200 text-gray-400' : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    }`}
                  >
                    {syncing ? 'Syncing...' : 'Full Sync'}
                  </button>
                </div>
              </div>
              {syncResult && (
                <div className={`mt-4 p-3 rounded-lg text-sm ${syncResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {syncResult.success ? `Synced ${syncResult.profiles_synced || 0} profiles, ${syncResult.events_tracked || 0} events` : syncResult.error}
                </div>
              )}
            </div>
          </div>
        )
      )}

      {/* Meta Ads Tab */}
      {activeChannel === 'meta' && (
        <div className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              {/* Key Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-blue-500" />
                      <p className="text-sm text-gray-500">Spend</p>
                    </div>
                    <ChangeIndicator value={spendChange} inverse />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(insights.spend)}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="w-4 h-4 text-green-500" />
                      <p className="text-sm text-gray-500">Purchases</p>
                    </div>
                    <ChangeIndicator value={purchasesChange} />
                  </div>
                  <p className="text-2xl font-bold text-green-600">{insights.purchases || 0}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-purple-500" />
                      <p className="text-sm text-gray-500">Revenue</p>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-purple-600">{formatCurrency(insights.purchaseValue)}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-orange-500" />
                      <p className="text-sm text-gray-500">ROAS</p>
                    </div>
                    <ChangeIndicator value={roasChange} />
                  </div>
                  <p className="text-2xl font-bold text-orange-600">{(insights.roas || 0).toFixed(2)}x</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-red-500" />
                      <p className="text-sm text-gray-500">CPA</p>
                    </div>
                    <ChangeIndicator value={cpaChange} inverse />
                  </div>
                  <p className="text-2xl font-bold text-red-600">{formatCurrency(insights.cpa)}</p>
                </div>
              </div>

              {/* Secondary Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <p className="text-sm text-gray-500">Impressions</p>
                  <p className="text-lg font-semibold text-gray-900">{formatNumber(insights.impressions)}</p>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <p className="text-sm text-gray-500">Reach</p>
                  <p className="text-lg font-semibold text-gray-900">{formatNumber(insights.reach)}</p>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <p className="text-sm text-gray-500">Clicks</p>
                  <p className="text-lg font-semibold text-gray-900">{formatNumber(insights.clicks)}</p>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <p className="text-sm text-gray-500">CTR</p>
                  <p className="text-lg font-semibold text-gray-900">{(insights.ctr || 0).toFixed(2)}%</p>
                </div>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {metaDailyData.length > 0 && (
                  <>
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Spend & Revenue</h3>
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={metaDailyData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                          <XAxis dataKey="date" tickFormatter={fmtDate} stroke="#9ca3af" fontSize={12} />
                          <YAxis stroke="#9ca3af" fontSize={12} tickFormatter={(v) => `£${v}`} />
                          <Tooltip content={<ChartTooltip currency />} />
                          <Legend />
                          <Bar dataKey="spend" name="Spend" fill="#EF4444" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="revenue" name="Revenue" fill="#10B981" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Purchases</h3>
                      <ResponsiveContainer width="100%" height={280}>
                        <AreaChart data={metaDailyData}>
                          <defs>
                            <linearGradient id="purchasesGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                          <XAxis dataKey="date" tickFormatter={fmtDate} stroke="#9ca3af" fontSize={12} />
                          <YAxis stroke="#9ca3af" fontSize={12} />
                          <Tooltip content={<ChartTooltip />} />
                          <Area type="monotone" dataKey="purchases" name="Purchases" stroke="#8B5CF6" fill="url(#purchasesGrad)" strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </>
                )}
              </div>

              {/* Campaigns Table */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-900">Campaigns</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Campaign</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Objective</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Budget</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {metaData?.campaigns?.map((campaign) => (
                        <tr key={campaign.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 font-medium text-gray-900">{campaign.name}</td>
                          <td className="px-6 py-4 text-sm text-gray-500">{campaign.objective?.replace('OUTCOME_', '')}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{campaign.dailyBudget ? `${formatCurrency(campaign.dailyBudget)}/day` : '-'}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(campaign.status)}`}>
                              {campaign.status === 'ACTIVE' && <CheckCircle className="w-3 h-3" />}
                              {campaign.status === 'PAUSED' && <Clock className="w-3 h-3" />}
                              {campaign.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Account Info */}
              <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${metaData?.account ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                  <span className="text-sm text-gray-600">
                    {metaData?.account ? `Connected to ${metaData.account.name}` : 'Pending Connection'}
                  </span>
                </div>
                {metaData?.account && (
                  <span className="text-xs text-gray-400">ID: {metaData.account.id}</span>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
