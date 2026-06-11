import { useState, useEffect, useRef } from 'react'

// Each agent works in a zone of the office. Positions are % of the room SVG viewBox.
const AGENTS = [
  {
    id: 'sales', name: 'Sales', color: '#3b82f6',
    home: { x: 260, y: 330 },
    spots: [{ x: 260, y: 330 }, { x: 300, y: 360 }, { x: 230, y: 370 }],
    query: 'Give me a sales overview — orders, revenue, refunds',
    actions: ['Scanning new orders...', 'Checking AOV trend...', 'Reviewing refunds...', 'Order velocity: normal'],
  },
  {
    id: 'marketing', name: 'Marketing', color: '#a855f7',
    home: { x: 620, y: 200 },
    spots: [{ x: 620, y: 200 }, { x: 680, y: 230 }, { x: 570, y: 230 }],
    query: 'How are my ads and email marketing performing?',
    actions: ['Pinning ROAS report...', 'Reviewing Meta ads...', 'Checking Klaviyo flows...', 'Updating campaign board'],
  },
  {
    id: 'finance', name: 'Finance', color: '#22c55e',
    home: { x: 130, y: 200 },
    spots: [{ x: 130, y: 200 }, { x: 180, y: 230 }, { x: 110, y: 250 }],
    query: 'Show me P&L summary and financial health',
    actions: ['Auditing the vault...', 'Calculating EBITDA...', 'Reconciling accounts...', 'Margins look healthy'],
  },
  {
    id: 'personal', name: 'Personal', color: '#f59e0b',
    home: { x: 800, y: 350 },
    spots: [{ x: 800, y: 350 }, { x: 760, y: 380 }, { x: 840, y: 380 }],
    query: 'What are my personal bank balances and recent spending?',
    actions: ['Watching Nationwide...', 'Checking Halifax...', 'Categorising spending...', 'Awaiting bank link'],
  },
  {
    id: 'product', name: 'Products', color: '#ef4444',
    home: { x: 450, y: 400 },
    spots: [{ x: 450, y: 400 }, { x: 500, y: 430 }, { x: 410, y: 440 }],
    query: 'Show me product inventory and best sellers',
    actions: ['Counting stock...', 'Checking best sellers...', 'Updating COGS...', 'Inventory: healthy'],
  },
  {
    id: 'growth', name: 'Growth', color: '#06b6d4',
    home: { x: 870, y: 180 },
    spots: [{ x: 870, y: 180 }, { x: 820, y: 210 }, { x: 900, y: 220 }],
    query: 'What should I focus on to grow the business?',
    actions: ['Sketching strategy...', 'Analysing LTV...', 'Spotting opportunities...', 'New idea pinned'],
  },
]

function Bot({ agent, pos, working, bubble, onClick }) {
  return (
    <g
      transform={`translate(${pos.x}, ${pos.y})`}
      onClick={onClick}
      style={{ cursor: 'pointer', transition: 'transform 2.5s cubic-bezier(0.45, 0, 0.25, 1)' }}
    >
      {/* shadow */}
      <ellipse cx="0" cy="26" rx="16" ry="5" fill="rgba(0,0,0,0.45)" />
      {/* body */}
      <g className={working ? 'bot-bob' : ''}>
        <rect x="-12" y="-2" width="24" height="26" rx="9" fill={agent.color} />
        <rect x="-12" y="-2" width="24" height="26" rx="9" fill="url(#botShine)" />
        {/* head */}
        <circle cx="0" cy="-14" r="11" fill={agent.color} />
        <circle cx="0" cy="-14" r="11" fill="url(#botShine)" />
        {/* face */}
        <rect x="-7" y="-19" width="14" height="9" rx="4.5" fill="#0d0d14" />
        <circle cx="-3" cy="-14.5" r="1.8" fill="#7df9ff" className="bot-blink" />
        <circle cx="3" cy="-14.5" r="1.8" fill="#7df9ff" className="bot-blink" />
        {/* antenna */}
        <line x1="0" y1="-25" x2="0" y2="-29" stroke={agent.color} strokeWidth="2" />
        <circle cx="0" cy="-31" r="2.5" fill={agent.color} className={working ? 'antenna-pulse' : ''} />
        {/* arms */}
        <rect x="-17" y="2" width="5" height="14" rx="2.5" fill={agent.color} className={working ? 'bot-arm-l' : ''} />
        <rect x="12" y="2" width="5" height="14" rx="2.5" fill={agent.color} className={working ? 'bot-arm-r' : ''} />
      </g>
      {/* name tag */}
      <g transform="translate(0, 42)">
        <rect x="-34" y="-9" width="68" height="17" rx="8.5" fill="rgba(10,10,15,0.85)" stroke={agent.color} strokeWidth="0.75" />
        <text x="0" y="3.5" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="600" fontFamily="ui-sans-serif, system-ui">{agent.name}</text>
      </g>
      {/* speech bubble */}
      {bubble && (
        <g transform="translate(0, -52)" className="bubble-in">
          <rect x="-72" y="-13" width="144" height="24" rx="11" fill="rgba(18,18,26,0.95)" stroke={agent.color} strokeWidth="1" />
          <path d="M -5 11 L 0 19 L 5 11 Z" fill="rgba(18,18,26,0.95)" />
          <text x="0" y="3" textAnchor="middle" fill="#e5e7eb" fontSize="10.5" fontFamily="ui-sans-serif, system-ui">{bubble}</text>
        </g>
      )}
    </g>
  )
}

export default function AgentOffice({ onAsk }) {
  const [positions, setPositions] = useState(() => Object.fromEntries(AGENTS.map(a => [a.id, a.home])))
  const [bubbles, setBubbles] = useState({})
  const [working, setWorking] = useState({})
  const [logs, setLogs] = useState([])
  const logRef = useRef(null)

  useEffect(() => {
    const timers = []

    AGENTS.forEach((agent, i) => {
      // Each agent acts on its own rhythm
      const act = () => {
        const action = agent.actions[Math.floor(Math.random() * agent.actions.length)]
        const spot = agent.spots[Math.floor(Math.random() * agent.spots.length)]

        setPositions(prev => ({ ...prev, [agent.id]: spot }))
        setWorking(prev => ({ ...prev, [agent.id]: true }))

        // show bubble after arriving
        timers.push(setTimeout(() => {
          setBubbles(prev => ({ ...prev, [agent.id]: action }))
          const time = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
          setLogs(prev => [...prev.slice(-14), { agent: agent.id, msg: action, time }])
        }, 2500))

        // hide bubble
        timers.push(setTimeout(() => {
          setBubbles(prev => ({ ...prev, [agent.id]: null }))
          setWorking(prev => ({ ...prev, [agent.id]: false }))
        }, 6500))
      }

      // stagger starts, then repeat
      timers.push(setTimeout(() => {
        act()
        const interval = setInterval(act, 9000 + i * 1500)
        timers.push(interval)
      }, i * 1800))
    })

    return () => timers.forEach(t => { clearTimeout(t); clearInterval(t) })
  }, [])

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [logs])

  return (
    <div>
      <style jsx global>{`
        @keyframes botBob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
        .bot-bob { animation: botBob 0.8s ease-in-out infinite; }
        @keyframes antennaPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        .antenna-pulse { animation: antennaPulse 0.6s ease-in-out infinite; }
        @keyframes botBlink { 0%, 90%, 100% { opacity: 1; } 95% { opacity: 0.1; } }
        .bot-blink { animation: botBlink 3.5s infinite; }
        @keyframes armL { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(-14deg); } }
        @keyframes armR { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(14deg); } }
        .bot-arm-l { transform-origin: -14px 4px; animation: armL 0.7s ease-in-out infinite; }
        .bot-arm-r { transform-origin: 14px 4px; animation: armR 0.7s ease-in-out infinite; }
        @keyframes bubbleIn { from { opacity: 0; transform: translate(0, -44px) scale(0.85); } to { opacity: 1; transform: translate(0, -52px) scale(1); } }
        .bubble-in { animation: bubbleIn 0.25s ease-out forwards; }
        @keyframes screenFlicker { 0%, 100% { opacity: 0.85; } 50% { opacity: 1; } }
        .screen-glow { animation: screenFlicker 2s ease-in-out infinite; }
      `}</style>

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-white">The Office</h2>
        <span className="text-xs text-gray-500">Click an agent to ask them something</span>
      </div>

      {/* Office scene */}
      <div className="rounded-xl border border-gray-800 bg-[#0c0c12] overflow-hidden mb-4">
        <svg viewBox="0 0 1000 500" className="w-full" style={{ display: 'block' }}>
          <defs>
            <linearGradient id="botShine" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="rgba(255,255,255,0.35)" />
              <stop offset="60%" stopColor="rgba(255,255,255,0)" />
            </linearGradient>
            <linearGradient id="floorGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#16161f" />
              <stop offset="100%" stopColor="#101018" />
            </linearGradient>
            <linearGradient id="wallGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0e0e16" />
              <stop offset="100%" stopColor="#14141d" />
            </linearGradient>
          </defs>

          {/* Walls */}
          <rect x="0" y="0" width="1000" height="160" fill="url(#wallGrad)" />
          {/* Floor */}
          <rect x="0" y="160" width="1000" height="340" fill="url(#floorGrad)" />
          {/* Floor grid */}
          {Array.from({ length: 12 }).map((_, i) => (
            <line key={'v' + i} x1={i * 90 - 40} y1="160" x2={i * 90 + 60} y2="500" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
          ))}
          {Array.from({ length: 6 }).map((_, i) => (
            <line key={'h' + i} x1="0" y1={180 + i * 60} x2="1000" y2={180 + i * 60} stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
          ))}
          {/* Wall/floor divide */}
          <line x1="0" y1="160" x2="1000" y2="160" stroke="rgba(255,255,255,0.07)" strokeWidth="1.5" />

          {/* ── FINANCE ZONE: vault (left wall) ── */}
          <g transform="translate(80, 70)">
            <rect x="0" y="0" width="100" height="90" rx="6" fill="#1d1d28" stroke="#2a2a38" strokeWidth="2" />
            <circle cx="50" cy="45" r="26" fill="none" stroke="#22c55e" strokeWidth="3" opacity="0.7" />
            <circle cx="50" cy="45" r="16" fill="none" stroke="#22c55e" strokeWidth="2" opacity="0.5" />
            <line x1="50" y1="29" x2="50" y2="45" stroke="#22c55e" strokeWidth="2.5" opacity="0.7" />
            <text x="50" y="110" textAnchor="middle" fill="#6b7280" fontSize="11" fontFamily="ui-sans-serif, system-ui">Vault · P&L</text>
          </g>

          {/* ── SALES ZONE: desk with monitors ── */}
          <g transform="translate(195, 255)">
            <rect x="0" y="30" width="130" height="14" rx="3" fill="#23232f" />
            <rect x="8" y="44" width="8" height="26" fill="#1b1b25" />
            <rect x="114" y="44" width="8" height="26" fill="#1b1b25" />
            <rect x="14" y="-6" width="46" height="32" rx="3" fill="#0a0a12" stroke="#2c2c3a" strokeWidth="1.5" />
            <rect x="18" y="-2" width="38" height="24" rx="2" fill="#3b82f6" opacity="0.35" className="screen-glow" />
            <rect x="68" y="-6" width="46" height="32" rx="3" fill="#0a0a12" stroke="#2c2c3a" strokeWidth="1.5" />
            <rect x="72" y="-2" width="38" height="24" rx="2" fill="#3b82f6" opacity="0.25" className="screen-glow" />
            {/* tiny chart on screen */}
            <polyline points="22,16 28,10 34,13 40,5 46,8 52,3" fill="none" stroke="#7df9ff" strokeWidth="1.5" opacity="0.9" />
            <text x="65" y="92" textAnchor="middle" fill="#6b7280" fontSize="11" fontFamily="ui-sans-serif, system-ui">Sales Desk</text>
          </g>

          {/* ── MARKETING ZONE: kanban wall ── */}
          <g transform="translate(555, 45)">
            <rect x="0" y="0" width="150" height="100" rx="5" fill="#15151f" stroke="#2a2a38" strokeWidth="2" />
            {/* columns of sticky notes */}
            {[0, 1, 2].map(col => (
              <g key={col} transform={`translate(${12 + col * 46}, 10)`}>
                <rect x="0" y="0" width="38" height="8" rx="2" fill="#2c2c3a" />
                {[0, 1, 2].map(row => (
                  <rect key={row} x={2 + (row % 2) * 4} y={14 + row * 24} width="30" height="18" rx="2"
                    fill={['#a855f7', '#7df9ff', '#f59e0b', '#22c55e', '#ef4444'][(col * 3 + row) % 5]} opacity="0.55" />
                ))}
              </g>
            ))}
            <text x="75" y="120" textAnchor="middle" fill="#6b7280" fontSize="11" fontFamily="ui-sans-serif, system-ui">Campaign Board</text>
          </g>

          {/* ── GROWTH ZONE: whiteboard ── */}
          <g transform="translate(810, 50)">
            <rect x="0" y="0" width="130" height="85" rx="5" fill="#f8fafc" opacity="0.92" />
            <rect x="0" y="0" width="130" height="85" rx="5" fill="none" stroke="#2a2a38" strokeWidth="3" />
            <polyline points="14,62 36,44 56,52 80,26 102,34 116,16" fill="none" stroke="#06b6d4" strokeWidth="2.5" />
            <circle cx="80" cy="26" r="3" fill="#ef4444" />
            <text x="20" y="22" fill="#475569" fontSize="9" fontFamily="ui-sans-serif" fontWeight="700">GROWTH ↗</text>
            <text x="65" y="105" textAnchor="middle" fill="#6b7280" fontSize="11" fontFamily="ui-sans-serif, system-ui">Strategy Board</text>
          </g>

          {/* ── PRODUCT ZONE: shelves with stock ── */}
          <g transform="translate(395, 300)">
            <rect x="0" y="0" width="110" height="56" rx="4" fill="#1b1b25" stroke="#2a2a38" strokeWidth="2" />
            <line x1="0" y1="28" x2="110" y2="28" stroke="#2a2a38" strokeWidth="2" />
            {[0, 1, 2, 3].map(i => (
              <rect key={'t' + i} x={8 + i * 26} y="6" width="18" height="17" rx="2" fill="#ef4444" opacity={0.35 + (i % 3) * 0.18} />
            ))}
            {[0, 1, 2, 3].map(i => (
              <rect key={'b' + i} x={8 + i * 26} y="33" width="18" height="17" rx="2" fill="#f59e0b" opacity={0.3 + ((i + 1) % 3) * 0.18} />
            ))}
            <text x="55" y="76" textAnchor="middle" fill="#6b7280" fontSize="11" fontFamily="ui-sans-serif, system-ui">Inventory</text>
          </g>

          {/* ── PERSONAL ZONE: lounge sofa ── */}
          <g transform="translate(745, 275)">
            <rect x="0" y="14" width="110" height="30" rx="9" fill="#26202e" />
            <rect x="0" y="0" width="110" height="22" rx="9" fill="#2e2738" />
            <rect x="-8" y="8" width="14" height="36" rx="6" fill="#26202e" />
            <rect x="104" y="8" width="14" height="36" rx="6" fill="#26202e" />
            {/* small plant */}
            <g transform="translate(130, 18)">
              <rect x="-6" y="14" width="12" height="12" rx="2" fill="#3a2e22" />
              <path d="M 0 14 C -8 4 -4 -4 0 -8 C 4 -4 8 4 0 14" fill="#22c55e" opacity="0.6" />
            </g>
            <text x="55" y="64" textAnchor="middle" fill="#6b7280" fontSize="11" fontFamily="ui-sans-serif, system-ui">Personal Lounge</text>
          </g>

          {/* window on back wall */}
          <g transform="translate(330, 35)">
            <rect x="0" y="0" width="170" height="90" rx="5" fill="#0a0f1e" stroke="#2a2a38" strokeWidth="2" />
            <circle cx="125" cy="28" r="12" fill="#fde68a" opacity="0.85" />
            <ellipse cx="50" cy="35" rx="22" ry="8" fill="#1e293b" />
            <ellipse cx="85" cy="55" rx="28" ry="9" fill="#1e293b" />
            <line x1="85" y1="0" x2="85" y2="90" stroke="#2a2a38" strokeWidth="2" />
          </g>

          {/* Agents */}
          {AGENTS.map(agent => (
            <Bot
              key={agent.id}
              agent={agent}
              pos={positions[agent.id]}
              working={!!working[agent.id]}
              bubble={bubbles[agent.id]}
              onClick={() => onAsk(agent.query)}
            />
          ))}
        </svg>
      </div>

      {/* Activity log */}
      <div className="rounded-xl border border-gray-800 bg-[#0d0d0d] overflow-hidden">
        <div className="px-4 py-2 border-b border-gray-800 flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
          </div>
          <span className="text-xs text-gray-500 font-medium ml-1">Office Activity</span>
        </div>
        <div ref={logRef} className="px-4 py-3 h-24 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#333 transparent' }}>
          {logs.length === 0 ? (
            <p className="text-sm text-gray-600">Agents clocking in...</p>
          ) : (
            logs.map((log, i) => {
              const agent = AGENTS.find(a => a.id === log.agent)
              return (
                <div key={i} className="flex items-center gap-3 py-0.5 text-sm">
                  <span className="text-gray-600 text-xs font-mono flex-shrink-0">{log.time}</span>
                  <span className="font-medium flex-shrink-0" style={{ color: agent?.color }}>{agent?.name}</span>
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
