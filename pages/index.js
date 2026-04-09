import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient('https://uvmnkztgmrvikbfkubtf.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2bW5renRnbXJ2aWtiZmt1YnRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2MzU3MDUsImV4cCI6MjA5MTIxMTcwNX0.GpIDJe_z_G_Bq15o_C_JGDZ6uBpKdK_EXMA04h8apq4')

export default function Home() {
  const [data, setData] = useState({ orders: [], products: [], status: 'loading' })

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
    load()
  }, [])

  const revenue = data.orders.reduce((s, o) => s + (parseFloat(o.total_price) || 0), 0)
  const aov = data.orders.length ? revenue / data.orders.length : 0

  return (
    <div style={{ background: '#111827', color: 'white', minHeight: '100vh', fontFamily: 'system-ui' }}>
      <div style={{ background: '#1f2937', padding: '16px', borderBottom: '1px solid #374151' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 'bold' }}>🌿 Flair HQ</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Link href="/klaviyo" style={{ fontSize: '14px', color: '#818cf8', textDecoration: 'none' }}>Klaviyo</Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: data.status === 'live' ? '#10b981' : data.status === 'error' ? '#ef4444' : '#eab308' }}></div>
              <span style={{ fontSize: '12px', color: '#9ca3af' }}>{data.status === 'live' ? 'Live' : data.status === 'error' ? 'Error' : 'Loading...'}</span>
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
      </div>
    </div>
  )
}
