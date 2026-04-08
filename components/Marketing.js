import { useState } from 'react'

export default function Marketing() {
  const [activeChannel, setActiveChannel] = useState('overview')

  // Placeholder data - will be populated from Klaviyo & Meta APIs
  const emailStats = {
    subscribers: 2847,
    openRate: 42.3,
    clickRate: 8.7,
    revenue: 12450,
  }

  const metaStats = {
    spend: 3250,
    impressions: 285000,
    clicks: 4200,
    conversions: 127,
    roas: 3.8,
  }

  const formatCurrency = (value) => `£${parseFloat(value || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Marketing</h1>
        <p className="text-gray-500 mt-1">Email and paid advertising performance.</p>
      </div>

      {/* Channel Tabs */}
      <div className="flex gap-2">
        {['overview', 'email', 'meta'].map((channel) => (
          <button
            key={channel}
            onClick={() => setActiveChannel(channel)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeChannel === channel
                ? 'bg-green-100 text-green-700'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            {channel === 'overview' && 'Overview'}
            {channel === 'email' && 'Email (Klaviyo)'}
            {channel === 'meta' && 'Meta Ads'}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeChannel === 'overview' && (
        <div className="space-y-6">
          {/* Combined Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Total Ad Spend</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(metaStats.spend)}</p>
              <p className="text-xs text-gray-400 mt-1">This month</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Meta ROAS</p>
              <p className="text-xl font-bold text-green-600">{metaStats.roas}x</p>
              <p className="text-xs text-gray-400 mt-1">Return on ad spend</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Email Subscribers</p>
              <p className="text-xl font-bold text-blue-600">{emailStats.subscribers.toLocaleString()}</p>
              <p className="text-xs text-gray-400 mt-1">Active subscribers</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Email Revenue</p>
              <p className="text-xl font-bold text-purple-600">{formatCurrency(emailStats.revenue)}</p>
              <p className="text-xs text-gray-400 mt-1">Attributed revenue</p>
            </div>
          </div>

          {/* Integration Status */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Integration Status</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <span className="text-xl">📧</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Klaviyo</p>
                    <p className="text-sm text-gray-500">Email marketing platform</p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-medium rounded-full">
                  Pending Setup
                </span>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span className="text-xl">📘</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Meta Ads</p>
                    <p className="text-sm text-gray-500">Account: act_671266992185192</p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-medium rounded-full">
                  Pending Setup
                </span>
              </div>
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Next Step:</strong> Connect your Klaviyo and Meta Ads accounts to see real-time performance data here.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Email (Klaviyo) */}
      {activeChannel === 'email' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Subscribers</p>
              <p className="text-xl font-bold text-gray-900">{emailStats.subscribers.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Open Rate</p>
              <p className="text-xl font-bold text-green-600">{emailStats.openRate}%</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Click Rate</p>
              <p className="text-xl font-bold text-blue-600">{emailStats.clickRate}%</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Revenue</p>
              <p className="text-xl font-bold text-purple-600">{formatCurrency(emailStats.revenue)}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Flows</h3>
            <div className="space-y-3">
              {['Welcome Series', 'Abandoned Cart', 'Post-Purchase', 'Win-Back'].map((flow) => (
                <div key={flow} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium text-gray-900">{flow}</span>
                  <span className="text-sm text-gray-500">Connect to view stats</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Meta Ads */}
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
                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                  Pending Connection
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
