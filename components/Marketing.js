import { useState, useEffect } from 'react'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

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

export default function Marketing() {
  const [activeChannel, setActiveChannel] = useState('overview')
  const [klaviyo, setKlaviyo] = useState({ status: 'loading' })
  const [syncStatus, setSyncStatus] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/klaviyo')
        const json = await res.json()
        if (json.error) throw new Error(json.error)
        setKlaviyo({ ...json, status: 'live' })
      } catch (e) {
        setKlaviyo({ status: 'error' })
      }
    }
    load()
    loadSyncStatus()
  }, [])

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

  const liveFlows = (klaviyo.flows || []).filter(f => f.status === 'live')
  const timeSeries = klaviyo.timeSeries || []
  const isLive = klaviyo.status === 'live'

  const metaStats = { spend: 3250, impressions: 285000, clicks: 4200, conversions: 127, roas: 3.8 }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Marketing</h1>
        <p className="text-gray-500 mt-1">Email and paid advertising performance.</p>
      </div>

      <div className="flex gap-2">
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'email', label: 'Email (Klaviyo)' },
          { key: 'sync', label: 'Klaviyo Sync' },
          { key: 'meta', label: 'Meta Ads' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveChannel(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeChannel === key
                ? 'bg-green-100 text-green-700'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ========== OVERVIEW ========== */}
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
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-xl">📧</div>
                    <div>
                      <p className="font-medium text-gray-900">Klaviyo</p>
                      <p className="text-sm text-gray-500">{isLive ? `${(klaviyo.emailsSent || 0).toLocaleString()} sent · ${klaviyo.openRate}% open rate` : 'Email marketing'}</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 text-sm font-medium rounded-full ${isLive ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {isLive ? 'Connected' : klaviyo.status === 'loading' ? 'Loading...' : 'Error'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-xl">📘</div>
                    <div>
                      <p className="font-medium text-gray-900">Meta Ads</p>
                      <p className="text-sm text-gray-500">act_671266992185192</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-medium rounded-full">Pending</span>
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

      {/* ========== EMAIL (KLAVIYO) ========== */}
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

            {timeSeries.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Opens & Clicks (Daily)</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={timeSeries}>
                    <defs>
                      <linearGradient id="gOpens" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gClicks" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="date" tickFormatter={fmtDate} stroke="#9ca3af" fontSize={12} />
                    <YAxis stroke="#9ca3af" fontSize={12} />
                    <Tooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="opens" name="Opens" stroke="#10b981" fill="url(#gOpens)" strokeWidth={2} />
                    <Area type="monotone" dataKey="clicks" name="Clicks" stroke="#f59e0b" fill="url(#gClicks)" strokeWidth={2} />
                  </AreaChart>
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

      {/* ========== KLAVIYO SYNC ========== */}
      {activeChannel === 'sync' && (
        <div className="space-y-6">
          {/* Sync Status Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Sync Status</p>
              <p className={`text-xl font-bold ${syncStatus?.synced ? 'text-green-600' : 'text-gray-400'}`}>
                {syncStatus?.synced ? 'Active' : 'Not Synced'}
              </p>
              <p className="text-xs text-gray-400 mt-1">Last: {formatSyncTime(syncStatus?.last_sync)}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Profiles Synced</p>
              <p className="text-xl font-bold text-blue-600">{(syncStatus?.profiles_synced || 0).toLocaleString()}</p>
              <p className="text-xs text-gray-400 mt-1">Total pushed to Klaviyo</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Events Tracked</p>
              <p className="text-xl font-bold text-purple-600">{(syncStatus?.events_tracked || 0).toLocaleString()}</p>
              <p className="text-xs text-gray-400 mt-1">Order events sent</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Customers</p>
              <p className="text-xl font-bold text-gray-900">{(syncStatus?.total_customers || 0).toLocaleString()}</p>
              <p className="text-xs text-gray-400 mt-1">Unique emails</p>
            </div>
          </div>

          {/* Sync Actions */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Sync Controls</h3>
            <p className="text-sm text-gray-500 mb-4">Push your Flair HQ order data and customer profiles to Klaviyo for email marketing segmentation and automation.</p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => runSync('full')}
                disabled={syncing}
                className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  syncing
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {syncing ? 'Syncing...' : 'Full Sync'}
              </button>
              <button
                onClick={() => runSync('incremental')}
                disabled={syncing}
                className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  syncing
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {syncing ? 'Syncing...' : 'Incremental Sync'}
              </button>
            </div>
            <div className="mt-3 text-xs text-gray-400">
              <strong>Full Sync:</strong> Re-syncs all orders and customers. <strong>Incremental:</strong> Only syncs new orders since last sync.
            </div>
          </div>

          {/* Sync Result */}
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
                  {syncResult.errors && syncResult.errors.length > 0 && (
                    <div className="col-span-full">
                      <p className="text-sm text-yellow-700 font-medium">Warnings ({syncResult.errors.length}):</p>
                      <ul className="text-xs text-yellow-600 mt-1 space-y-1">
                        {syncResult.errors.slice(0, 5).map((e, i) => <li key={i}>{e}</li>)}
                        {syncResult.errors.length > 5 && <li>...and {syncResult.errors.length - 5} more</li>}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-red-700">{syncResult.error}</p>
              )}
            </div>
          )}

          {/* What Gets Synced */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">What Gets Synced</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-sm">-&gt;</div>
                  <h4 className="font-medium text-gray-900">Flair HQ to Klaviyo</h4>
                </div>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>Customer profiles (email, name)</li>
                  <li>Order history (total spent, order count)</li>
                  <li>Placed Order events for each transaction</li>
                  <li>Customer lifetime value data</li>
                </ul>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center text-sm">&lt;-</div>
                  <h4 className="font-medium text-gray-900">Klaviyo to Flair HQ</h4>
                </div>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>Email metrics (opens, clicks, sent)</li>
                  <li>Subscriber counts and growth</li>
                  <li>Flow and campaign performance</li>
                  <li>Conversion tracking (orders from email)</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Last Sync Details */}
          {syncStatus?.synced && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Last Sync Details</h3>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Last Sync Time</span>
                  <span className="font-medium text-gray-900">{syncStatus.last_sync ? new Date(syncStatus.last_sync).toLocaleString('en-GB') : 'N/A'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Sync Mode</span>
                  <span className="font-medium text-gray-900 capitalize">{syncStatus.last_sync_mode || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Result</span>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                    syncStatus.last_sync_result === 'success' ? 'bg-green-100 text-green-800' :
                    syncStatus.last_sync_result === 'no_new_orders' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-600'
                  }`}>{syncStatus.last_sync_result || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Last Batch - Profiles</span>
                  <span className="font-medium text-gray-900">{syncStatus.last_batch_profiles || 0}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-500">Last Batch - Events</span>
                  <span className="font-medium text-gray-900">{syncStatus.last_batch_events || 0}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========== META ADS ========== */}
      {activeChannel === 'meta' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Spend</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(metaStats.spend)}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Impressions</p>
              <p className="text-xl font-bold text-gray-900">{(metaStats.impressions / 1000).toFixed(0)}K</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Clicks</p>
              <p className="text-xl font-bold text-blue-600">{metaStats.clicks.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Conversions</p>
              <p className="text-xl font-bold text-green-600">{metaStats.conversions}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-500">ROAS</p>
              <p className="text-xl font-bold text-purple-600">{metaStats.roas}x</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Details</h3>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Ad Account ID</span>
                <span className="font-mono text-sm">act_671266992185192</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Pixel ID</span>
                <span className="font-mono text-sm">500331839710867</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-500">Status</span>
                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">Pending Connection</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
