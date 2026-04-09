import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient('https://uvmnkztgmrvikbfkubtf.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2bW5renRnbXJ2aWtiZmt1YnRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2MzU3MDUsImV4cCI6MjA5MTIxMTcwNX0.GpIDJe_z_G_Bq15o_C_JGDZ6uBpKdK_EXMA04h8apq4')

export default function Home() {
  const [data, setData] = useState({ orders: [], products: [], status: 'loading' })
  const [klaviyo, setKlaviyo] = useState({ status: 'loading' })

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

  return (
    <div style={{ background: '#111827', color: 'white', minHeight: '100vh', fontFamily: 'system-ui' }}>
      <div style={{ background: '#1f2937', padding: '16px', borderBottom: '1px solid #374151' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 'bold' }}>🌿 Flair HQ</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
          <div style={{ background: '#1f2937', padding: '16px', borderRadius: '12px', border: '1px solid #374151' }}>
            <div style={{ fontSize: '24px', marginBottom: '4px' }}>💷</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>£{revenue.toFixed(2)}</div>
            <div style={{ fontSize: '14px', color: '#9ca3af' }}>Revenue</div>
          </div>
          <div style={{ background: '#1f2937', padding: '16px', borderRadius: '12px', border: '1px solid #374151' }}>
            <div style={{ fontSize: '24px', marginBottom: '4px' }}>📦</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{data.orders.length}</div>
            <div style={{ fontSize: '14px', color: '#9ca3af' }}>Orders</div>
          </div>
          <div style={{ background: '#1f2937', padding: '16px', borderRadius: '12px', border: '1px solid #374151' }}>
            <div style={{ fontSize: '24px', marginBottom: '4px' }}>🛒</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>£{aov.toFixed(2)}</div>
            <div style={{ fontSize: '14px', color: '#9ca3af' }}>AOV</div>
          </div>
          <div style={{ background: '#1f2937', padding: '16px', borderRadius: '12px', border: '1px solid #374151' }}>
            <div style={{ fontSize: '24px', marginBottom: '4px' }}>🧴</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{data.products.length}</div>
            <div style={{ fontSize: '14px', color: '#9ca3af' }}>Products</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{ background: '#1f2937', padding: '16px', borderRadius: '12px', border: '1px solid #374151' }}>
            <h3 style={{ fontWeight: '600', marginBottom: '12px' }}>Recent Orders</h3>
            {data.orders.length ? data.orders.slice(0, 5).map(o => (
              <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #374151' }}>
                <span>#{o.order_number || 'N/A'}</span>
                <span style={{ color: '#10b981' }}>£{parseFloat(o.total_price || 0).toFixed(2)}</span>
              </div>
            )) : <div style={{ color: '#6b7280', textAlign: 'center', padding: '16px' }}>No orders yet</div>}
          </div>
          <div style={{ background: '#1f2937', padding: '16px', borderRadius: '12px', border: '1px solid #374151' }}>
            <h3 style={{ fontWeight: '600', marginBottom: '12px' }}>Products</h3>
            {data.products.length ? data.products.slice(0, 5).map(p => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #374151' }}>
                <span>{p.title}</span>
                <span>£{p.price || '0.00'}</span>
              </div>
            )) : <div style={{ color: '#6b7280', textAlign: 'center', padding: '16px' }}>No products yet</div>}
          </div>
        </div>
        <div style={{ marginTop: '24px', marginBottom: '8px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Klaviyo Email Marketing</h2>
        </div>
        {klaviyo.status === 'loading' ? (
          <div style={{ background: '#1f2937', padding: '32px', borderRadius: '12px', border: '1px solid #374151', textAlign: 'center', color: '#6b7280' }}>Loading Klaviyo data...</div>
        ) : klaviyo.status === 'error' ? (
          <div style={{ background: '#1f2937', padding: '32px', borderRadius: '12px', border: '1px solid #374151', textAlign: 'center', color: '#ef4444' }}>Failed to load Klaviyo data</div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '16px' }}>
              <div style={{ background: '#1f2937', padding: '16px', borderRadius: '12px', border: '1px solid #374151' }}>
                <div style={{ fontSize: '24px', marginBottom: '4px' }}>📧</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{(klaviyo.emailsSent || 0).toLocaleString()}</div>
                <div style={{ fontSize: '14px', color: '#9ca3af' }}>Emails Sent (30d)</div>
              </div>
              <div style={{ background: '#1f2937', padding: '16px', borderRadius: '12px', border: '1px solid #374151' }}>
                <div style={{ fontSize: '24px', marginBottom: '4px' }}>👁</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{klaviyo.openRate || 0}%</div>
                <div style={{ fontSize: '14px', color: '#9ca3af' }}>Open Rate</div>
              </div>
              <div style={{ background: '#1f2937', padding: '16px', borderRadius: '12px', border: '1px solid #374151' }}>
                <div style={{ fontSize: '24px', marginBottom: '4px' }}>🖱</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{klaviyo.clickRate || 0}%</div>
                <div style={{ fontSize: '14px', color: '#9ca3af' }}>Click Rate</div>
              </div>
              <div style={{ background: '#1f2937', padding: '16px', borderRadius: '12px', border: '1px solid #374151' }}>
                <div style={{ fontSize: '24px', marginBottom: '4px' }}>⚡</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{(klaviyo.flows || []).filter(f => f.status === 'live').length}/{(klaviyo.flows || []).length}</div>
                <div style={{ fontSize: '14px', color: '#9ca3af' }}>Active Flows</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ background: '#1f2937', padding: '16px', borderRadius: '12px', border: '1px solid #374151' }}>
                <h3 style={{ fontWeight: '600', marginBottom: '12px' }}>Flows</h3>
                {(klaviyo.flows || []).length ? klaviyo.flows.map((f, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #374151' }}>
                    <span>{f.name}</span>
                    <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '9999px', background: f.status === 'live' ? '#065f46' : '#374151', color: f.status === 'live' ? '#6ee7b7' : '#9ca3af' }}>{f.status}</span>
                  </div>
                )) : <div style={{ color: '#6b7280', textAlign: 'center', padding: '16px' }}>No flows</div>}
              </div>
              <div style={{ background: '#1f2937', padding: '16px', borderRadius: '12px', border: '1px solid #374151' }}>
                <h3 style={{ fontWeight: '600', marginBottom: '12px' }}>Email Lists</h3>
                {(klaviyo.lists || []).length ? klaviyo.lists.map((l, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #374151' }}>
                    <span>{l.name}</span>
                    <span style={{ fontSize: '12px', color: '#9ca3af' }}>{l.id}</span>
                  </div>
                )) : <div style={{ color: '#6b7280', textAlign: 'center', padding: '16px' }}>No lists</div>}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
