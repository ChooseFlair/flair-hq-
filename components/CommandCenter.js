import { useState, useEffect, useRef } from 'react'

const AGENTS = [
  { id: 'sales', name: 'Sales', color: '#3b82f6', area: 'Orders & Revenue', tasks: ['Monitoring order flow', 'Tracking AOV trends', 'Flagging refunds'], query: 'Give me a sales overview — orders, revenue, refunds' },
  { id: 'marketing', name: 'Marketing', color: '#a855f7', area: 'Ads & Email', tasks: ['Watching Meta ROAS', 'Checking Klaviyo flows', 'Analysing ad spend'], query: 'How are my ads and email marketing performing?' },
  { id: 'finance', name: 'Finance', color: '#22c55e', area: 'P&L & Banking', tasks: ['Tracking EBITDA', 'Monitoring accounts', 'Calculating margins'], query: 'Show me P&L summary and financial health' },
  { id: 'personal', name: 'Personal', color: '#f59e0b', area: 'Personal Banking', tasks: ['Checking Nationwide', 'Reviewing Halifax', 'Categorising expenses'], query: 'What are my personal bank balances and recent spending?' },
  { id: 'product', name: 'Products', color: '#ef4444', area: 'Inventory & Catalog', tasks: ['Stock levels', 'Best sellers', 'COGS tracking'], query: 'Show me product inventory and best sellers' },
  { id: 'growth', name: 'Growth', color: '#06b6d4', area: 'Strategy & Ideas', tasks: ['Customer LTV', 'Growth opportunities', 'Competitor analysis'], query: 'What should I focus on to grow the business?' },
]

const ACTIVITY_MESSAGES = [
  { agent: 'sales', msg: 'Scanned 500 orders — revenue tracking normal', status: 'success' },
  { agent: 'marketing', msg: 'Meta ROAS check complete — 2.4x current', status: 'success' },
  { agent: 'finance', msg: 'P&L updated for current month', status: 'success' },
  { agent: 'personal', msg: 'Waiting for bank connection', status: 'warn' },
  { agent: 'product', msg: 'Inventory scan — all products in stock', status: 'success' },
  { agent: 'growth', msg: 'Customer insights ready — 20 top spenders identified', status: 'info' },
  { agent: 'marketing', msg: 'Klaviyo flow performance pulled — 6 active flows', status: 'success' },
  { agent: 'sales', msg: 'Last 7 days: checking order velocity', status: 'info' },
  { agent: 'finance', msg: 'Windsor ad spend data synced', status: 'success' },
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
      setLogs(prev => [...prev.slice(-12), { ...activity, time }])
      setAgentStatuses(prev => ({ ...prev, [activity.agent]: 'active' }))
      setTimeout(() => { setAgentStatuses(prev => ({ ...prev, [activity.agent]: 'idle' })) }, 2000)
      idx++
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [logs])

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-white">Agents</h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">{AGENTS.length} active</span>
          <div className="flex gap-1">
            {AGENTS.map(a => (
              <div key={a.id} className={`w-2.5 h-2.5 rounded-full transition-all duration-500 ${agentStatuses[a.id] === 'active' ? 'scale-125' : ''}`}
                style={{ backgroundColor: a.color, boxShadow: agentStatuses[a.id] === 'active' ? `0 0 8px ${a.color}` : 'none' }} />
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
        {AGENTS.map(agent => {
          const isActive = agentStatuses[agent.id] === 'active'
          const isHovered = activeAgent === agent.id
          return (
            <button
              key={agent.id}
              onClick={() => onAsk(agent.query)}
              onMouseEnter={() => setActiveAgent(agent.id)}
              onMouseLeave={() => setActiveAgent(null)}
              className="text-left rounded-xl border border-gray-800 hover:border-gray-600 bg-[#111] hover:bg-[#161616] transition-all p-4 relative overflow-hidden"
            >
              {isActive && <div className="absolute top-0 left-0 w-full h-[3px]" style={{ backgroundColor: agent.color }} />}
              <div className="flex items-center gap-2.5 mb-2">
                <div className={`w-3 h-3 rounded-full ${isActive ? 'animate-pulse' : ''}`} style={{ backgroundColor: agent.color }} />
                <span className="text-sm font-semibold text-white">{agent.name}</span>
              </div>
              <p className="text-xs text-gray-400 mb-2">{agent.area}</p>
              {isHovered && (
                <div className="border-t border-gray-800 pt-2 mt-1">
                  {agent.tasks.map((t, i) => (
                    <p key={i} className="text-xs text-gray-500 leading-relaxed">
                      <span style={{ color: agent.color }}>•</span> {t}
                    </p>
                  ))}
                </div>
              )}
            </button>
          )
        })}
      </div>

      <div className="rounded-xl border border-gray-800 bg-[#0d0d0d] overflow-hidden">
        <div className="px-4 py-2 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
            </div>
            <span className="text-xs text-gray-500 font-medium ml-1">Activity Log</span>
          </div>
        </div>
        <div ref={logRef} className="px-4 py-3 h-28 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#333 transparent' }}>
          {logs.length === 0 ? (
            <p className="text-sm text-gray-600">Initialising agents...</p>
          ) : (
            logs.map((log, i) => {
              const agent = AGENTS.find(a => a.id === log.agent)
              return (
                <div key={i} className="flex items-center gap-3 py-0.5 text-sm">
                  <span className="text-gray-600 text-xs font-mono flex-shrink-0">{log.time}</span>
                  <span className="font-medium flex-shrink-0" style={{ color: agent?.color }}>{agent?.name}</span>
                  <span className={`text-xs font-medium flex-shrink-0 ${log.status === 'success' ? 'text-emerald-500' : log.status === 'warn' ? 'text-yellow-500' : 'text-blue-400'}`}>
                    {log.status}
                  </span>
                  <span className="text-gray-400 truncate">{log.msg}</span>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
