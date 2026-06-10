import { useState, useEffect, useRef } from 'react'

const AGENTS = [
  { id: 'sales', name: 'Sales Agent', color: '#00d4ff', emoji: '📦', area: 'Orders & Revenue', tasks: ['Monitoring order flow', 'Tracking AOV trends', 'Flagging refunds'], query: 'Give me a sales overview — orders, revenue, refunds' },
  { id: 'marketing', name: 'Marketing Agent', color: '#a855f7', emoji: '📣', area: 'Ads & Email', tasks: ['Watching Meta ROAS', 'Checking Klaviyo flows', 'Analysing ad spend'], query: 'How are my ads and email marketing performing?' },
  { id: 'finance', name: 'Finance Agent', color: '#22c55e', emoji: '💰', area: 'P&L & Banking', tasks: ['Tracking EBITDA', 'Monitoring business accounts', 'Calculating margins'], query: 'Show me P&L summary and financial health' },
  { id: 'personal', name: 'Personal Agent', color: '#f59e0b', emoji: '🏦', area: 'Personal Banking', tasks: ['Checking Nationwide balance', 'Reviewing Halifax spending', 'Categorising expenses'], query: 'What are my personal bank balances and recent spending?' },
  { id: 'product', name: 'Product Agent', color: '#ef4444', emoji: '🧪', area: 'Inventory & Catalog', tasks: ['Monitoring stock levels', 'Tracking best sellers', 'Checking COGS'], query: 'Show me product inventory and best sellers' },
  { id: 'growth', name: 'Growth Agent', color: '#06b6d4', emoji: '🚀', area: 'Strategy & Ideas', tasks: ['Analysing customer LTV', 'Finding growth opportunities', 'Benchmarking competitors'], query: 'What should I focus on to grow the business?' },
]

const ACTIVITY_MESSAGES = [
  { agent: 'sales', msg: 'Scanned 500 orders — revenue tracking normal', status: 'success' },
  { agent: 'marketing', msg: 'Meta ROAS check complete — 2.4x current', status: 'success' },
  { agent: 'finance', msg: 'P&L updated for current month', status: 'success' },
  { agent: 'personal', msg: 'Waiting for bank connection — visit /api/truelayer/auth', status: 'warn' },
  { agent: 'product', msg: 'Inventory scan — all products in stock', status: 'success' },
  { agent: 'growth', msg: 'Customer insights ready — 20 top spenders identified', status: 'info' },
  { agent: 'marketing', msg: 'Klaviyo flow performance pulled — 6 active flows', status: 'success' },
  { agent: 'sales', msg: 'Last 7 days: checking order velocity', status: 'info' },
  { agent: 'finance', msg: 'Windsor ad spend data synced for last 30 days', status: 'success' },
]

export default function CommandCenter({ onAsk }) {
  const [logs, setLogs] = useState([])
  const [activeAgent, setActiveAgent] = useState(null)
  const [agentStatuses, setAgentStatuses] = useState({})
  const logRef = useRef(null)

  useEffect(() => {
    const initial = {}
    AGENTS.forEach(a => { initial[a.id] = 'idle' })
    setAgentStatuses(initial)

    let idx = 0
    const interval = setInterval(() => {
      const activity = ACTIVITY_MESSAGES[idx % ACTIVITY_MESSAGES.length]
      const time = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

      setLogs(prev => [...prev.slice(-15), { ...activity, time }])
      setAgentStatuses(prev => ({ ...prev, [activity.agent]: 'active' }))

      setTimeout(() => {
        setAgentStatuses(prev => ({ ...prev, [activity.agent]: 'idle' }))
      }, 2000)

      idx++
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [logs])

  const statusColor = (s) => s === 'success' ? 'text-emerald-400' : s === 'warn' ? 'text-yellow-400' : 'text-cyan-400'

  return (
    <div className="px-6 py-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-cyan-300 font-mono text-xs tracking-[0.3em] uppercase">Command Center</h2>
            <p className="text-cyan-500/30 text-[10px] font-mono mt-0.5">{AGENTS.length} AGENTS ACTIVE</p>
          </div>
          <div className="flex items-center gap-2">
            {AGENTS.map(a => (
              <div
                key={a.id}
                className={`w-2 h-2 rounded-full transition-all duration-500 ${agentStatuses[a.id] === 'active' ? 'scale-150 shadow-lg' : ''}`}
                style={{ backgroundColor: a.color, boxShadow: agentStatuses[a.id] === 'active' ? `0 0 8px ${a.color}` : 'none' }}
              />
            ))}
          </div>
        </div>

        {/* Agent Grid */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          {AGENTS.map(agent => {
            const isActive = agentStatuses[agent.id] === 'active'
            const isHovered = activeAgent === agent.id
            return (
              <button
                key={agent.id}
                onClick={() => onAsk(agent.query)}
                onMouseEnter={() => setActiveAgent(agent.id)}
                onMouseLeave={() => setActiveAgent(null)}
                className="group relative text-left rounded-lg border transition-all duration-300 overflow-hidden"
                style={{
                  borderColor: isHovered ? agent.color + '60' : isActive ? agent.color + '30' : 'rgba(0,220,255,0.06)',
                  backgroundColor: isHovered ? agent.color + '08' : 'rgba(255,255,255,0.01)',
                }}
              >
                <div className="px-3 py-2.5">
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className={`w-2 h-2 rounded-full transition-all ${isActive ? 'animate-pulse' : ''}`}
                      style={{ backgroundColor: agent.color }}
                    />
                    <span className="text-[10px] font-mono tracking-wider" style={{ color: agent.color }}>{agent.name.toUpperCase()}</span>
                  </div>
                  <p className="text-cyan-100/60 text-[10px] font-mono">{agent.area}</p>
                  {isHovered && (
                    <div className="mt-1.5 pt-1.5 border-t border-white/5">
                      {agent.tasks.map((t, i) => (
                        <p key={i} className="text-[9px] font-mono text-cyan-500/40 leading-relaxed">
                          <span style={{ color: agent.color }}>▸</span> {t}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
                {isActive && (
                  <div className="absolute top-0 left-0 w-full h-[2px]" style={{ backgroundColor: agent.color, opacity: 0.6 }} />
                )}
              </button>
            )
          })}
        </div>

        {/* Terminal Log */}
        <div className="rounded-lg border border-cyan-500/10 bg-black/50 overflow-hidden">
          <div className="px-3 py-1.5 border-b border-cyan-500/10 flex items-center gap-2">
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500/60" />
              <div className="w-1.5 h-1.5 rounded-full bg-yellow-500/60" />
              <div className="w-1.5 h-1.5 rounded-full bg-green-500/60" />
            </div>
            <span className="text-[9px] font-mono text-cyan-500/30 tracking-wider">ACTIVITY LOG</span>
          </div>
          <div ref={logRef} className="px-3 py-2 h-[72px] overflow-y-auto jarvis-scrollbar">
            {logs.length === 0 ? (
              <p className="text-[10px] font-mono text-cyan-500/20">Initialising agents...</p>
            ) : (
              logs.map((log, i) => {
                const agent = AGENTS.find(a => a.id === log.agent)
                return (
                  <div key={i} className="flex items-start gap-2 leading-tight mb-0.5">
                    <span className="text-[9px] font-mono text-cyan-500/20 flex-shrink-0">{log.time}</span>
                    <span className="text-[9px] font-mono flex-shrink-0" style={{ color: agent?.color || '#0dc' }}>
                      {agent?.name.split(' ')[0].toLowerCase()}
                    </span>
                    <span className={`text-[9px] font-mono ${statusColor(log.status)}`}>
                      [{log.status.toUpperCase()}]
                    </span>
                    <span className="text-[9px] font-mono text-cyan-100/50 truncate">{log.msg}</span>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
