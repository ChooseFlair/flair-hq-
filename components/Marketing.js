import { useState, useEffect } from 'react'
import { format, parseISO, subDays } from 'date-fns'
import {
  Mail,
  BarChart3,
  Share2,
  Eye,
  TrendingUp,
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
} from 'lucide-react'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import DateRangePicker from './DateRangePicker'
import AISummary from './AISummary'
import TaskWidget from './TaskWidget'

function fmtDate(d) {
  if (!d) return ''
  const dt = new Date(d)
  return `${dt.getDate()} ${dt.toLocaleString('en-GB', { month: 'short' })}`
}

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
      <div className="text-gray-500 mb-1">{fmtDate(label)}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color }} className="font-medium">{p.name}: {p.value.toLocaleString()}</div>
      ))}
    </div>
  )
}

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

  const loadData = async () => {
    setLoading(true)
    try {
      const [klaviyoRes, metaRes, organicRes] = await Promise.all([
        fetch('/api/klaviyo'),
        fetch('/api/meta/overview'),
        fetch('/api/facebook/organic'),
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

  const insights = metaData?.insights || {}
  const liveFlows = (klaviyo.flows || []).filter(f => f.status === 'live')
  const timeSeries = klaviyo.timeSeries || []
  const isLive = klaviyo.status === 'live'

  const getAISummaryData = () => ({
    spend: insights.spend,
    roas: insights.roas,
    purchases: insights.purchases,
    cpa: insights.cpa,
    ctr: insights.ctr,
    organicImpressions: organicData?.summary?.impressions,
    emailLists: klaviyo.lists?.length || 0,
  })

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
            className="p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {[
          { id: 'overview', label: 'Overview', icon: Eye },
          { id: 'organic', label: 'Organic Social', icon: Share2 },
          { id: 'email', label: 'Email (Klaviyo)', icon: Mail },
          { id: 'sync', label: 'Klaviyo Sync', icon: Zap },
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Total Reach</p>
              <p className="text-xl font-bold text-gray-900">{isLive ? (klaviyo.emailsSent || 0).toLocaleString() : '—'}</p>
              <p className="text-xs text-gray-400 mt-1">Emails sent (30d)</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Engagements</p>
              <p className="text-xl font-bold text-green-600">{isLive ? ((klaviyo.opens || 0) + (klaviyo.clicks || 0)).toLocaleString() : '—'}</p>
              <p className="text-xs text-gray-400 mt-1">Opens + clicks (30d)</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Email Subscribers</p>
              <p className="text-xl font-bold text-blue-600">{isLive ? `${(klaviyo.totalProfiles || 0).toLocaleString()}${klaviyo.hasMoreProfiles ? '+' : ''}` : '—'}</p>
              <p className="text-xs text-gray-400 mt-1">+{isLive ? klaviyo.newSubscribers || 0 : 0} new (30d)</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Conversions</p>
              <p className="text-xl font-bold text-purple-600">{isLive ? (klaviyo.orders || 0).toLocaleString() : '—'}</p>
              <p className="text-xs text-gray-400 mt-1">Orders from email (30d)</p>
            </div>
          </div>

          {isLive && timeSeries.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Engagement (30d)</h3>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Channels</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Mail className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Klaviyo</p>
                      <p className="text-sm text-gray-500">{isLive ? `${(klaviyo.emailsSent || 0).toLocaleString()} sent` : 'Email marketing'}</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 text-sm font-medium rounded-full ${isLive ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {isLive ? 'Connected' : klaviyo.status === 'loading' ? 'Loading...' : 'Error'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <BarChart3 className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Meta Ads</p>
                      <p className="text-sm text-gray-500">{metaData?.account?.name || 'Facebook & Instagram'}</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 text-sm font-medium rounded-full ${metaData?.account ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {metaData?.account ? 'Connected' : 'Pending'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
                      <Share2 className="w-5 h-5 text-pink-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Organic Social</p>
                      <p className="text-sm text-gray-500">{organicData?.page?.name || 'Facebook & Instagram'}</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 text-sm font-medium rounded-full ${!organicData?.needsAuth ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {!organicData?.needsAuth ? 'Connected' : 'Not Connected'}
                  </span>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Automations</h3>
              {isLive && liveFlows.length > 0 ? (
                <div className="space-y-3">
                  {liveFlows.map((f, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium text-gray-900">{f.name}</span>
                      <span className="text-sm text-green-600">Live</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">{isLive ? 'No active flows' : 'Connect Klaviyo to view flows'}</p>
              )}
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
                <p className="text-sm text-gray-500">Orders (30d)</p>
                <p className="text-xl font-bold text-purple-600">{(klaviyo.orders || 0).toLocaleString()}</p>
              </div>
            </div>

            {timeSeries.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Emails Sent (Daily)</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={timeSeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="date" tickFormatter={fmtDate} stroke="#9ca3af" fontSize={12} />
                    <YAxis stroke="#9ca3af" fontSize={12} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="sent" name="Sent" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Flows</h3>
              <div className="space-y-3">
                {liveFlows.length ? liveFlows.map((f, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <span className="font-medium text-gray-900">{f.name}</span>
                      <span className="text-sm text-gray-400 ml-2">({f.trigger})</span>
                    </div>
                    <span className="text-sm text-green-600 font-medium">Live</span>
                  </div>
                )) : <p className="text-gray-500 text-center py-4">No active flows</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Lists & Segments</h3>
                <div className="space-y-2">
                  {(klaviyo.lists || []).map((l, i) => (
                    <div key={'l'+i} className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-900">{l.name}</span>
                      <span className="text-xs text-gray-400">List</span>
                    </div>
                  ))}
                  {(klaviyo.segments || []).map((s, i) => (
                    <div key={'s'+i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                      <span className="text-sm text-gray-900">{s.name}</span>
                      <span className={`text-xs ${s.active ? 'text-green-600' : 'text-gray-400'}`}>Segment</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )
      )}

      {/* Klaviyo Sync Tab */}
      {activeChannel === 'sync' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Sync Status</p>
              <p className={`text-xl font-bold ${syncStatus?.synced ? 'text-green-600' : 'text-gray-400'}`}>
                {syncStatus?.synced ? 'Active' : 'Not Synced'}
              </p>
              <p className="text-xs text-gray-400 mt-1">Last: {formatSyncTime(syncStatus?.last_sync)}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Customers</p>
              <p className="text-xl font-bold text-blue-600">{(syncStatus?.counts?.customers || 0).toLocaleString()}</p>
              <p className="text-xs text-gray-400 mt-1">Synced to Klaviyo</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Flows</p>
              <p className="text-xl font-bold text-purple-600">{(syncStatus?.counts?.flows || 0).toLocaleString()}</p>
              <p className="text-xs text-gray-400 mt-1">Automated flows</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Campaigns</p>
              <p className="text-xl font-bold text-gray-900">{(syncStatus?.counts?.campaigns || 0).toLocaleString()}</p>
              <p className="text-xs text-gray-400 mt-1">Email campaigns</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Sync Controls</h3>
            <p className="text-sm text-gray-500 mb-4">Push your Flair HQ order data and customer profiles to Klaviyo.</p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => runSync('full')}
                disabled={syncing}
                className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  syncing ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {syncing ? 'Syncing...' : 'Full Sync'}
              </button>
              <button
                onClick={() => runSync('incremental')}
                disabled={syncing}
                className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  syncing ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {syncing ? 'Syncing...' : 'Incremental Sync'}
              </button>
            </div>
          </div>

          {syncResult && (
            <div className={`rounded-xl border p-6 ${syncResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <h3 className={`text-lg font-semibold mb-3 ${syncResult.success ? 'text-green-900' : 'text-red-900'}`}>
                {syncResult.success ? 'Sync Completed' : 'Sync Failed'}
              </h3>
              {syncResult.success ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-green-700">Profiles Pushed</p>
                    <p className="text-lg font-bold text-green-900">{syncResult.profiles_synced || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-green-700">Events Tracked</p>
                    <p className="text-lg font-bold text-green-900">{syncResult.events_tracked || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-green-700">Total Orders</p>
                    <p className="text-lg font-bold text-green-900">{syncResult.total_orders || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-green-700">Unique Customers</p>
                    <p className="text-lg font-bold text-green-900">{syncResult.unique_customers || 0}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-red-700">{syncResult.error}</p>
              )}
            </div>
          )}
        </div>
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
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-blue-600" />
                    </div>
                    <p className="text-sm text-gray-500">Spend</p>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(insights.spend)}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                      <ShoppingCart className="w-5 h-5 text-green-600" />
                    </div>
                    <p className="text-sm text-gray-500">Purchases</p>
                  </div>
                  <p className="text-2xl font-bold text-green-600">{insights.purchases}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-purple-600" />
                    </div>
                    <p className="text-sm text-gray-500">Revenue</p>
                  </div>
                  <p className="text-2xl font-bold text-purple-600">{formatCurrency(insights.purchaseValue)}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
                      <BarChart3 className="w-5 h-5 text-orange-600" />
                    </div>
                    <p className="text-sm text-gray-500">ROAS</p>
                  </div>
                  <p className="text-2xl font-bold text-orange-600">{insights.roas?.toFixed(2)}x</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                      <Target className="w-5 h-5 text-red-600" />
                    </div>
                    <p className="text-sm text-gray-500">CPA</p>
                  </div>
                  <p className="text-2xl font-bold text-red-600">{formatCurrency(insights.cpa)}</p>
                </div>
              </div>

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
                  <p className="text-lg font-semibold text-gray-900">{insights.ctr?.toFixed(2)}%</p>
                </div>
              </div>

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

              <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${metaData?.account ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                  <span className="text-sm text-gray-600">
                    {metaData?.account ? `Connected to ${metaData.account.name}` : 'Pending Connection'}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
