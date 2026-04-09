import { useState, useEffect } from 'react'
import Link from 'next/link'

const card = { background: '#1f2937', padding: '16px', borderRadius: '12px', border: '1px solid #374151' }
const sectionTitle = { fontSize: '16px', fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '24px', marginBottom: '12px' }
const badge = (live) => ({ fontSize: '12px', padding: '2px 8px', borderRadius: '9999px', background: live ? '#065f46' : '#374151', color: live ? '#6ee7b7' : '#9ca3af' })
const row = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #374151' }

function formatDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function KlaviyoPage() {
  const [data, setData] = useState({ status: 'loading' })

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/klaviyo')
        const json = await res.json()
        if (json.error) throw new Error(json.error)
        setData({ ...json, status: 'live' })
      } catch (e) {
        setData({ status: 'error' })
      }
    }
    load()
  }, [])

  return (
    <div style={{ background: '#111827', color: 'white', minHeight: '100vh', fontFamily: 'system-ui' }}>
      <div style={{ background: '#1f2937', padding: '16px', borderBottom: '1px solid #374151' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Link href="/" style={{ fontSize: '20px', fontWeight: 'bold', color: 'white', textDecoration: 'none' }}>🌿 Flair HQ</Link>
            <span style={{ color: '#374151' }}>/</span>
            <span style={{ fontSize: '16px', color: '#818cf8' }}>Klaviyo</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: data.status === 'live' ? '#10b981' : data.status === 'error' ? '#ef4444' : '#eab308' }}></div>
            <span style={{ fontSize: '12px', color: '#9ca3af' }}>{data.status === 'live' ? 'Connected' : data.status === 'error' ? 'Error' : 'Loading...'}</span>
          </div>
        </div>
      </div>

      <div style={{ padding: '16px', maxWidth: '1000px', margin: '0 auto' }}>
        {data.status === 'loading' ? (
          <div style={{ ...card, textAlign: 'center', padding: '48px', color: '#6b7280' }}>Loading Klaviyo data...</div>
        ) : data.status === 'error' ? (
          <div style={{ ...card, textAlign: 'center', padding: '48px', color: '#ef4444' }}>Failed to load Klaviyo data</div>
        ) : (
          <>
            {/* Email Performance KPIs */}
            <h2 style={sectionTitle}>Email Performance (Last 30 Days)</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              <div style={card}>
                <div style={{ fontSize: '24px', marginBottom: '4px' }}>📧</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{(data.emailsSent || 0).toLocaleString()}</div>
                <div style={{ fontSize: '14px', color: '#9ca3af' }}>Emails Sent</div>
              </div>
              <div style={card}>
                <div style={{ fontSize: '24px', marginBottom: '4px' }}>👁</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{data.openRate || 0}%</div>
                <div style={{ fontSize: '14px', color: '#9ca3af' }}>Open Rate</div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>{(data.opens || 0).toLocaleString()} opens</div>
              </div>
              <div style={card}>
                <div style={{ fontSize: '24px', marginBottom: '4px' }}>🖱</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{data.clickRate || 0}%</div>
                <div style={{ fontSize: '14px', color: '#9ca3af' }}>Click Rate</div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>{(data.clicks || 0).toLocaleString()} clicks</div>
              </div>
              <div style={card}>
                <div style={{ fontSize: '24px', marginBottom: '4px' }}>📬</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{(data.newSubscribers || 0).toLocaleString()}</div>
                <div style={{ fontSize: '14px', color: '#9ca3af' }}>New Subscribers</div>
              </div>
            </div>

            {/* Revenue KPIs */}
            <h2 style={sectionTitle}>Revenue Attribution (Last 30 Days)</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              <div style={card}>
                <div style={{ fontSize: '24px', marginBottom: '4px' }}>💷</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>£{(data.orderRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                <div style={{ fontSize: '14px', color: '#9ca3af' }}>Email Revenue</div>
              </div>
              <div style={card}>
                <div style={{ fontSize: '24px', marginBottom: '4px' }}>🛒</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{(data.orders || 0).toLocaleString()}</div>
                <div style={{ fontSize: '14px', color: '#9ca3af' }}>Orders via Email</div>
              </div>
              <div style={card}>
                <div style={{ fontSize: '24px', marginBottom: '4px' }}>👤</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{data.totalProfiles || 0}{data.hasMoreProfiles ? '+' : ''}</div>
                <div style={{ fontSize: '14px', color: '#9ca3af' }}>Total Profiles</div>
              </div>
            </div>

            {/* Flows */}
            <h2 style={sectionTitle}>Flows ({(data.flows || []).filter(f => f.status === 'live').length} live / {(data.flows || []).length} total)</h2>
            <div style={card}>
              {(data.flows || []).length ? data.flows.map((f, i) => (
                <div key={i} style={row}>
                  <div>
                    <div style={{ fontWeight: '500' }}>{f.name}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>Trigger: {f.trigger} &middot; Created {formatDate(f.created)}</div>
                  </div>
                  <span style={badge(f.status === 'live')}>{f.status}</span>
                </div>
              )) : <div style={{ color: '#6b7280', textAlign: 'center', padding: '16px' }}>No flows</div>}
            </div>

            {/* Campaigns */}
            <h2 style={sectionTitle}>Recent Campaigns</h2>
            <div style={card}>
              {(data.campaigns || []).length ? data.campaigns.map((c, i) => (
                <div key={i} style={row}>
                  <div>
                    <div style={{ fontWeight: '500' }}>{c.name}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                      {c.sendTime ? `Sent ${formatDate(c.sendTime)}` : `Created ${formatDate(c.createdAt)}`}
                    </div>
                  </div>
                  <span style={badge(c.status === 'Sent')}>{c.status}</span>
                </div>
              )) : <div style={{ color: '#6b7280', textAlign: 'center', padding: '16px' }}>No campaigns</div>}
            </div>

            {/* Lists & Segments */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '24px' }}>
              <div>
                <h2 style={{ ...sectionTitle, marginTop: 0 }}>Email Lists</h2>
                <div style={card}>
                  {(data.lists || []).length ? data.lists.map((l, i) => (
                    <div key={i} style={row}>
                      <div>
                        <div style={{ fontWeight: '500' }}>{l.name}</div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>Created {formatDate(l.created)}</div>
                      </div>
                      <span style={{ fontSize: '12px', color: '#9ca3af', fontFamily: 'monospace' }}>{l.id}</span>
                    </div>
                  )) : <div style={{ color: '#6b7280', textAlign: 'center', padding: '16px' }}>No lists</div>}
                </div>
              </div>
              <div>
                <h2 style={{ ...sectionTitle, marginTop: 0 }}>Segments</h2>
                <div style={card}>
                  {(data.segments || []).length ? data.segments.map((s, i) => (
                    <div key={i} style={row}>
                      <div>
                        <div style={{ fontWeight: '500' }}>{s.name}</div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>Created {formatDate(s.created)}</div>
                      </div>
                      <span style={badge(s.active)}>{s.active ? 'active' : 'inactive'}</span>
                    </div>
                  )) : <div style={{ color: '#6b7280', textAlign: 'center', padding: '16px' }}>No segments</div>}
                </div>
              </div>
            </div>

            {/* Recent Profiles */}
            <h2 style={sectionTitle}>Recent Profiles</h2>
            <div style={card}>
              {(data.profiles || []).length ? data.profiles.map((p, i) => (
                <div key={i} style={row}>
                  <div>
                    <div style={{ fontWeight: '500' }}>{p.firstName || p.lastName ? `${p.firstName || ''} ${p.lastName || ''}`.trim() : 'Unknown'}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>{p.email}</div>
                  </div>
                  <span style={{ fontSize: '12px', color: '#9ca3af' }}>{formatDate(p.created)}</span>
                </div>
              )) : <div style={{ color: '#6b7280', textAlign: 'center', padding: '16px' }}>No profiles</div>}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
