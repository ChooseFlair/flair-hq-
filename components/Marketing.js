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
import DateRangePicker from './DateRangePicker'
import AISummary from './AISummary'
import TaskWidget from './TaskWidget'

export default function Marketing({ activeSubTab, setActiveSubTab }) {
  // Use prop or default to 'overview'
  const activeChannel = activeSubTab || 'overview'
  const setActiveChannel = (tab) => setActiveSubTab?.(tab)

  const [klaviyoData, setKlaviyoData] = useState(null)
  const [metaData, setMetaData] = useState(null)
  const [organicData, setOrganicData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [dateRange, setDateRange] = useState({
    startDate: subDays(new Date(), 30),
    endDate: new Date(),
    preset: '30d',
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [klaviyoRes, metaRes, organicRes] = await Promise.all([
        fetch('/api/klaviyo/overview'),
        fetch('/api/meta/overview'),
        fetch('/api/facebook/organic'),
      ])

      const klaviyo = await klaviyoRes.json()
      const meta = await metaRes.json()
      const organic = await organicRes.json()

      if (klaviyo.needsAuth) {
        setKlaviyoData({ needsAuth: true })
      } else if (klaviyo.error) {
        console.error('Klaviyo error:', klaviyo.error)
      } else {
        setKlaviyoData(klaviyo)
      }

      setMetaData(meta)

      if (organic.needsAuth) {
        setOrganicData({ needsAuth: true })
      } else if (organic.error) {
        console.error('Facebook organic error:', organic.error)
        setOrganicData({ needsAuth: true })
      } else {
        setOrganicData(organic)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
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

  // Build AI summary data
  const getAISummaryData = () => ({
    spend: insights.spend,
    roas: insights.roas,
    purchases: insights.purchases,
    cpa: insights.cpa,
    ctr: insights.ctr,
    organicImpressions: organicData?.summary?.impressions,
    emailLists: klaviyoData?.stats?.totalLists,
  })

  return (
    <div className="space-y-6">
      {/* AI Summary */}
      <AISummary pageType="marketing" data={getAISummaryData()} />

      {/* Task Widget */}
      <TaskWidget filterTag="marketing" title="Marketing Tasks" />

      {/* Header */}
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

      {/* Channel Tabs */}
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

      {/* Overview */}
      {activeChannel === 'overview' && (
        <div className="space-y-6">
          {/* Combined Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-sm text-gray-500">Ad Spend (30d)</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {loading ? '...' : formatCurrency(insights.spend)}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <p className="text-sm text-gray-500">ROAS</p>
              </div>
              <p className="text-2xl font-bold text-green-600">
                {loading ? '...' : `${insights.roas?.toFixed(2)}x`}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                  <ShoppingCart className="w-5 h-5 text-purple-600" />
                </div>
                <p className="text-sm text-gray-500">Purchases</p>
              </div>
              <p className="text-2xl font-bold text-purple-600">
                {loading ? '...' : insights.purchases}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
                  <Target className="w-5 h-5 text-orange-600" />
                </div>
                <p className="text-sm text-gray-500">Ad Revenue</p>
              </div>
              <p className="text-2xl font-bold text-orange-600">
                {loading ? '...' : formatCurrency(insights.purchaseValue)}
              </p>
            </div>
          </div>

          {/* Integration Status */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Integration Status</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Mail className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Klaviyo</p>
                    <p className="text-sm text-gray-500">
                      {klaviyoData?.stats ? `${klaviyoData.stats.totalCampaigns} campaigns, ${klaviyoData.stats.activeFlows} active flows` : 'Email marketing'}
                    </p>
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-full ${klaviyoData?.needsAuth ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                  {klaviyoData?.needsAuth ? <Clock className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                  {klaviyoData?.needsAuth ? 'Not Connected' : 'Connected'}
                </span>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Meta Ads</p>
                    <p className="text-sm text-gray-500">
                      {metaData?.account ? `${metaData.account.name} (${formatCurrency(metaData.account.totalSpent)} lifetime)` : 'Facebook & Instagram'}
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                  <CheckCircle className="w-3 h-3" />
                  Connected
                </span>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-100 to-pink-100 rounded-lg flex items-center justify-center">
                    <Share2 className="w-5 h-5 text-pink-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Organic Social</p>
                    <p className="text-sm text-gray-500">
                      {organicData?.page ? `${organicData.page.name} (${formatNumber(organicData.page.fanCount)} fans)` : 'Facebook & Instagram organic'}
                    </p>
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-full ${organicData?.needsAuth ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                  {organicData?.needsAuth ? <Clock className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                  {organicData?.needsAuth ? 'Not Connected' : 'Connected'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-gray-900">Meta Ads (Last 30 Days)</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Impressions</p>
                    <p className="text-lg font-semibold">{formatNumber(insights.impressions)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Reach</p>
                    <p className="text-lg font-semibold">{formatNumber(insights.reach)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Clicks</p>
                    <p className="text-lg font-semibold">{formatNumber(insights.clicks)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">CTR</p>
                    <p className="text-lg font-semibold">{insights.ctr?.toFixed(2)}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">CPC</p>
                    <p className="text-lg font-semibold">{formatCurrency(insights.cpc)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">CPA</p>
                    <p className="text-lg font-semibold">{formatCurrency(insights.cpa)}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
                <Mail className="w-5 h-5 text-purple-600" />
                <h3 className="font-semibold text-gray-900">Klaviyo Email</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Lists</p>
                    <p className="text-lg font-semibold">{klaviyoData?.stats?.totalLists || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Campaigns</p>
                    <p className="text-lg font-semibold">{klaviyoData?.stats?.totalCampaigns || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Active Flows</p>
                    <p className="text-lg font-semibold">{klaviyoData?.stats?.activeFlows || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Segments</p>
                    <p className="text-lg font-semibold">{klaviyoData?.stats?.totalSegments || 0}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Organic Social */}
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
              {/* Page Info */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center gap-4">
                  {organicData?.page?.picture && (
                    <img src={organicData.page.picture} alt={organicData.page.name} className="w-16 h-16 rounded-full" />
                  )}
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{organicData?.page?.name}</h2>
                    <p className="text-gray-500">@{organicData?.page?.username}</p>
                    <p className="text-sm text-gray-400">{organicData?.page?.category}</p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-2xl font-bold text-blue-600">{formatNumber(organicData?.page?.fanCount || 0)}</p>
                    <p className="text-sm text-gray-500">Page Likes</p>
                  </div>
                </div>
              </div>

              {/* Organic Stats */}
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
                    <p className="text-sm text-gray-500">Page Views</p>
                  </div>
                  <p className="text-2xl font-bold text-orange-600">{formatNumber(organicData?.summary?.pageViews || 0)}</p>
                </div>
              </div>

              {/* Engagement & Growth */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Engagement (30 Days)</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Post Engagements</span>
                      <span className="font-semibold">{formatNumber(organicData?.summary?.postEngagements || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Reactions</span>
                      <span className="font-semibold">{formatNumber(organicData?.summary?.reactions || 0)}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Follower Growth (30 Days)</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">New Followers</span>
                      <span className="font-semibold text-green-600">+{formatNumber(organicData?.summary?.fanAdds || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Unfollows</span>
                      <span className="font-semibold text-red-600">-{formatNumber(organicData?.summary?.fanRemoves || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center border-t pt-3">
                      <span className="text-gray-900 font-medium">Net Change</span>
                      <span className={`font-bold ${(organicData?.summary?.netFanChange || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {(organicData?.summary?.netFanChange || 0) >= 0 ? '+' : ''}{formatNumber(organicData?.summary?.netFanChange || 0)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Posts */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-900">Recent Posts</h3>
                </div>
                <div className="divide-y divide-gray-100">
                  {organicData?.recentPosts?.length > 0 ? (
                    organicData.recentPosts.slice(0, 5).map((post) => (
                      <div key={post.id} className="px-6 py-4">
                        <div className="flex items-start gap-4">
                          {post.image && (
                            <img src={post.image} alt="" className="w-16 h-16 object-cover rounded-lg flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-gray-900 line-clamp-2">{post.message || '(No text)'}</p>
                            <p className="text-xs text-gray-400 mt-1">{formatDate(post.createdTime)}</p>
                          </div>
                          <div className="flex gap-4 text-sm text-gray-500">
                            <span className="flex items-center gap-1" title="Reactions"><Heart className="w-4 h-4" /> {post.reactions}</span>
                            <span className="flex items-center gap-1" title="Comments"><MessageCircle className="w-4 h-4" /> {post.comments}</span>
                            <span className="flex items-center gap-1" title="Shares"><Repeat className="w-4 h-4" /> {post.shares}</span>
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

      {/* Email (Klaviyo) */}
      {activeChannel === 'email' && (
        <div className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : klaviyoData?.needsAuth ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-purple-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Connect Klaviyo</h2>
              <p className="text-gray-500 mb-6">Add your Klaviyo API key to see email marketing data.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                      <Users className="w-5 h-5 text-purple-600" />
                    </div>
                    <p className="text-sm text-gray-500">Total Lists</p>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{klaviyoData?.stats?.totalLists || 0}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                      <Mail className="w-5 h-5 text-blue-600" />
                    </div>
                    <p className="text-sm text-gray-500">Total Campaigns</p>
                  </div>
                  <p className="text-2xl font-bold text-blue-600">{klaviyoData?.stats?.totalCampaigns || 0}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                      <Zap className="w-5 h-5 text-green-600" />
                    </div>
                    <p className="text-sm text-gray-500">Active Flows</p>
                  </div>
                  <p className="text-2xl font-bold text-green-600">{klaviyoData?.stats?.activeFlows || 0}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
                      <Target className="w-5 h-5 text-orange-600" />
                    </div>
                    <p className="text-sm text-gray-500">Segments</p>
                  </div>
                  <p className="text-2xl font-bold text-orange-600">{klaviyoData?.stats?.totalSegments || 0}</p>
                </div>
              </div>

              {/* Active Flows */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-900">Active Flows</h3>
                </div>
                <div className="divide-y divide-gray-100">
                  {klaviyoData?.activeFlows?.length > 0 ? (
                    klaviyoData.activeFlows.map((flow) => (
                      <div key={flow.id} className="px-6 py-4 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{flow.name}</p>
                          <p className="text-sm text-gray-500">Created {formatDate(flow.createdAt)}</p>
                        </div>
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3" /> Live
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="px-6 py-8 text-center text-gray-500">No active flows found</div>
                  )}
                </div>
              </div>

              {/* Recent Campaigns */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-900">Recent Campaigns</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Campaign</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sent</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {klaviyoData?.recentCampaigns?.slice(0, 10).map((campaign) => (
                        <tr key={campaign.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 font-medium text-gray-900">{campaign.name}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(campaign.status)}`}>
                              {campaign.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">{formatDate(campaign.sendTime)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Meta Ads */}
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
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">
                    Connected to {metaData?.account?.name} ({metaData?.account?.id})
                  </span>
                </div>
                <span className="text-xs text-gray-400">Updated: {metaData?.lastUpdated ? formatDate(metaData.lastUpdated) : '-'}</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
