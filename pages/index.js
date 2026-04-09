import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient('https://uvmnkztgmrvikbfkubtf.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2bW5renRnbXJ2aWtiZmt1YnRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2MzU3MDUsImV4cCI6MjA5MTIxMTcwNX0.GpIDJe_z_G_Bq15o_C_JGDZ6uBpKdK_EXMA04h8apq4')

export default function Home() {
  const [data, setData] = useState({ orders: [], products: [], status: 'loading' })
  const [klaviyo, setKlaviyo] = useState({ status: 'loading' })
  const [marketingTab, setMarketingTab] = useState('email')

  useEffect(() => {
    async function load() {
      try {
        const [o, p] = await Promise.all([
          supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(10),
          supabase.from('products').select('*')
        ])
        setData({ orders: o.data || [], products: p.data || [], status: 'live' })
      } catch (e) {
        setData(d => ({ ...d, status: 'error' }))
      }
    }
    async function loadKlaviyo() {
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
    loadKlaviyo()
  }, [])

  const revenue = data.orders.reduce((s, o) => s + (parseFloat(o.total_price) || 0), 0)
  const aov = data.orders.length ? revenue / data.orders.length : 0
  const liveFlows = (klaviyo.flows || []).filter(f => f.status === 'live')

  const tab = (label, key) => ({
    padding: '8px 16px',
    borderRadius: '8px',
    border: marketingTab === key ? '2px solid #10b981' : '1px solid #374151',
    background: marketingTab === key ? '#065f46' : '#1f2937',
    color: marketingTab === key ? '#6ee7b7' : '#9ca3af',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  })

  const kpiCard = { background: '#1f2937', padding: '16px', borderRadius: '12px', border: '1px solid #374151' }

  return (
    <div style={{ background: '#111827', color: 'white', minHeight: '100vh', fontFamily: 'system-ui' }}>
      <div style={{ background: '#1f2937', padding: '16px', borderBottom: '1px solid #374151' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 'bold' }}>🌿 Flair HQ</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: data.status === 'live' ? '#10b981' : data.status === 'error' ? '#ef4444' : '#eab308' }}></div>
              <span style={{ fontSize: '12px', color: '#9ca3af' }}>Supabase</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: klaviyo.status === 'live' ? '#10b981' : klaviyo.status === 'error' ? '#ef4444' : '#eab308' }}></div>
              <span style={{ fontSize: '12px', color: '#9ca3af' }}>Klaviyo</span>
            </div>
          </div>
        </div>
      </div>
      <div style={{ padding: '16px', maxWidth: '1000px', margin: '0 auto' }}>
        {/* Store KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
          <div style={kpiCard}>
            <div style={{ fontSize: '24px', marginBottom: '4px' }}>💷</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>£{revenue.toFixed(2)}</div>
            <div style={{ fontSize: '14px', color: '#9ca3af' }}>Revenue</div>
          </div>
          <div style={kpiCard}>
            <div style={{ fontSize: '24px', marginBottom: '4px' }}>📦</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{data.orders.length}</div>
            <div style={{ fontSize: '14px', color: '#9ca3af' }}>Orders</div>
          </div>
          <div style={kpiCard}>
            <div style={{ fontSize: '24px', marginBottom: '4px' }}>🛒</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>£{aov.toFixed(2)}</div>
            <div style={{ fontSize: '14px', color: '#9ca3af' }}>AOV</div>
          </div>
          <div style={kpiCard}>
            <div style={{ fontSize: '24px', marginBottom: '4px' }}>🧴</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{data.products.length}</div>
            <div style={{ fontSize: '14px', color: '#9ca3af' }}>Products</div>
          </div>
        </div>

        {/* Recent Orders & Products */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '32px' }}>
          <div style={kpiCard}>
            <h3 style={{ fontWeight: '600', marginBottom: '12px' }}>Recent Orders</h3>
            {data.orders.length ? data.orders.slice(0, 5).map(o => (
              <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #374151' }}>
                <span>#{o.order_number || 'N/A'}</span>
                <span style={{ color: '#10b981' }}>£{parseFloat(o.total_price || 0).toFixed(2)}</span>
              </div>
            )) : <div style={{ color: '#6b7280', textAlign: 'center', padding: '16px' }}>No orders yet</div>}
          </div>
          <div style={kpiCard}>
            <h3 style={{ fontWeight: '600', marginBottom: '12px' }}>Products</h3>
            {data.products.length ? data.products.slice(0, 5).map(p => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #374151' }}>
                <span>{p.title}</span>
                <span>£{p.price || '0.00'}</span>
              </div>
            )) : <div style={{ color: '#6b7280', textAlign: 'center', padding: '16px' }}>No products yet</div>}
          </div>
        </div>

        {/* Marketing Section */}
        <div style={{ background: '#1f2937', borderRadius: '16px', border: '1px solid #374151', padding: '24px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '4px' }}>Marketing</h2>
          <p style={{ fontSize: '14px', color: '#9ca3af', marginBottom: '20px' }}>Email and paid advertising performance.</p>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
            <button onClick={() => setMarketingTab('overview')} style={tab('Overview', 'overview')}>Overview</button>
            <button onClick={() => setMarketingTab('email')} style={tab('Email (Klaviyo)', 'email')}>Email (Klaviyo)</button>
            <button onClick={() => setMarketingTab('meta')} style={tab('Meta Ads', 'meta')}>Meta Ads</button>
          </div>

          {/* Tab Content */}
          {marketingTab === 'email' && (
            klaviyo.status === 'loading' ? (
              <div style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>Loading Klaviyo data...</div>
            ) : klaviyo.status === 'error' ? (
              <div style={{ textAlign: 'center', padding: '32px', color: '#ef4444' }}>Failed to connect to Klaviyo</div>
            ) : (
              <>
                {/* Klaviyo KPIs */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
                  <div style={{ background: '#111827', padding: '16px', borderRadius: '12px', border: '1px solid #374151' }}>
                    <div style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '8px' }}>Subscribers</div>
                    <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{data.totalProfiles || klaviyo.totalProfiles || 0}{klaviyo.hasMoreProfiles ? '+' : ''}</div>
                  </div>
                  <div style={{ background: '#111827', padding: '16px', borderRadius: '12px', border: '1px solid #374151' }}>
                    <div style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '8px' }}>Open Rate</div>
                    <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#10b981' }}>{klaviyo.openRate || 0}%</div>
                  </div>
                  <div style={{ background: '#111827', padding: '16px', borderRadius: '12px', border: '1px solid #374151' }}>
                    <div style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '8px' }}>Click Rate</div>
                    <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{klaviyo.clickRate || 0}%</div>
                  </div>
                  <div style={{ background: '#111827', padding: '16px', borderRadius: '12px', border: '1px solid #374151' }}>
                    <div style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '8px' }}>Revenue</div>
                    <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#10b981' }}>£{(klaviyo.orderRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  </div>
                </div>

                {/* Active Flows */}
                <div style={{ background: '#111827', borderRadius: '12px', border: '1px solid #374151', padding: '20px' }}>
                  <h3 style={{ fontWeight: '600', marginBottom: '16px', fontSize: '16px' }}>Active Flows</h3>
                  {liveFlows.length ? liveFlows.map((f, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: '#1f2937', borderRadius: '8px', marginBottom: i < liveFlows.length - 1 ? '8px' : 0, border: '1px solid #374151' }}>
                      <span style={{ fontWeight: '500' }}>{f.name}</span>
                      <span style={{ fontSize: '13px', color: '#10b981' }}>Live</span>
                    </div>
                  )) : <div style={{ color: '#6b7280', textAlign: 'center', padding: '16px' }}>No active flows</div>}
                </div>

                {/* Campaigns & Lists */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
                  <div style={{ background: '#111827', borderRadius: '12px', border: '1px solid #374151', padding: '20px' }}>
                    <h3 style={{ fontWeight: '600', marginBottom: '16px', fontSize: '16px' }}>Recent Campaigns</h3>
                    {(klaviyo.campaigns || []).length ? klaviyo.campaigns.slice(0, 5).map((c, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #374151' }}>
                        <span style={{ fontSize: '14px' }}>{c.name}</span>
                        <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '9999px', background: c.status === 'Sent' ? '#065f46' : '#374151', color: c.status === 'Sent' ? '#6ee7b7' : '#9ca3af' }}>{c.status}</span>
                      </div>
                    )) : <div style={{ color: '#6b7280', textAlign: 'center', padding: '16px' }}>No campaigns</div>}
                  </div>
                  <div style={{ background: '#111827', borderRadius: '12px', border: '1px solid #374151', padding: '20px' }}>
                    <h3 style={{ fontWeight: '600', marginBottom: '16px', fontSize: '16px' }}>Lists & Segments</h3>
                    {(klaviyo.lists || []).map((l, i) => (
                      <div key={'l'+i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #374151' }}>
                        <span style={{ fontSize: '14px' }}>{l.name}</span>
                        <span style={{ fontSize: '12px', color: '#9ca3af' }}>List</span>
                      </div>
                    ))}
                    {(klaviyo.segments || []).map((s, i) => (
                      <div key={'s'+i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #374151' }}>
                        <span style={{ fontSize: '14px' }}>{s.name}</span>
                        <span style={{ fontSize: '12px', color: s.active ? '#10b981' : '#9ca3af' }}>Segment</span>
                      </div>
                    ))}
                    {!(klaviyo.lists || []).length && !(klaviyo.segments || []).length && (
                      <div style={{ color: '#6b7280', textAlign: 'center', padding: '16px' }}>No lists or segments</div>
                    )}
                  </div>
                </div>
              </>
            )
          )}

          {marketingTab === 'overview' && (
            <div style={{ textAlign: 'center', padding: '48px', color: '#6b7280' }}>
              Overview coming soon — select a channel tab to view performance.
            </div>
          )}

          {marketingTab === 'meta' && (
            <div style={{ textAlign: 'center', padding: '48px', color: '#6b7280' }}>
              Meta Ads coming soon — connect your Meta account to view ad performance.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
