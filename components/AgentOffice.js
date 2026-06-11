import { useState, useEffect, useRef } from 'react'

const AGENTS = [
  { id: 'sales', name: 'Sales', color: '#3b82f6', home: { x: 260, y: 330 }, spots: [{ x: 260, y: 330 }, { x: 300, y: 360 }, { x: 230, y: 370 }], query: 'Give me a sales overview — orders, revenue, refunds', actions: ['Scanning new orders...', 'Checking AOV trend...', 'Reviewing refunds...', 'Order velocity: normal'] },
  { id: 'marketing', name: 'Marketing', color: '#8b5cf6', home: { x: 620, y: 200 }, spots: [{ x: 620, y: 200 }, { x: 680, y: 230 }, { x: 570, y: 230 }], query: 'How are my ads and email marketing performing?', actions: ['Pinning ROAS report...', 'Reviewing Meta ads...', 'Checking Klaviyo flows...', 'Updating campaign board'] },
  { id: 'finance', name: 'Finance', color: '#16a34a', home: { x: 130, y: 200 }, spots: [{ x: 130, y: 200 }, { x: 180, y: 230 }, { x: 110, y: 250 }], query: 'Show me P&L summary and financial health', actions: ['Auditing the vault...', 'Calculating EBITDA...', 'Reconciling accounts...', 'Margins look healthy'] },
  { id: 'personal', name: 'Personal', color: '#ea580c', home: { x: 800, y: 350 }, spots: [{ x: 800, y: 350 }, { x: 760, y: 380 }, { x: 840, y: 380 }], query: 'What are my personal bank balances and recent spending?', actions: ['Watching Nationwide...', 'Checking Halifax...', 'Categorising spending...', 'Awaiting bank link'] },
  { id: 'product', name: 'Products', color: '#dc2626', home: { x: 450, y: 400 }, spots: [{ x: 450, y: 400 }, { x: 500, y: 430 }, { x: 410, y: 440 }], query: 'Show me product inventory and best sellers', actions: ['Counting stock...', 'Checking best sellers...', 'Updating COGS...', 'Inventory: healthy'] },
  { id: 'growth', name: 'Growth', color: '#0891b2', home: { x: 870, y: 180 }, spots: [{ x: 870, y: 180 }, { x: 820, y: 210 }, { x: 900, y: 220 }], query: 'What should I focus on to grow the business?', actions: ['Sketching strategy...', 'Analysing LTV...', 'Spotting opportunities...', 'New idea pinned'] },
]

function Bot({ agent, pos, working, bubble, onClick }) {
  return (
    <g transform={`translate(${pos.x}, ${pos.y})`} onClick={onClick} style={{ cursor: 'pointer', transition: 'transform 2.5s cubic-bezier(0.45, 0, 0.25, 1)' }}>
      <ellipse cx="0" cy="26" rx="14" ry="4" fill="rgba(0,0,0,0.12)" />
      <g className={working ? 'bot-bob' : ''}>
        <rect x="-11" y="-1" width="22" height="24" rx="8" fill={agent.color} />
        <rect x="-11" y="-1" width="22" height="24" rx="8" fill="url(#botShine)" />
        <circle cx="0" cy="-13" r="10" fill={agent.color} />
        <circle cx="0" cy="-13" r="10" fill="url(#botShine)" />
        <rect x="-6" y="-17" width="12" height="8" rx="4" fill="#1e1e2e" />
        <circle cx="-2.5" cy="-13" r="1.6" fill="#fff" className="bot-blink" />
        <circle cx="2.5" cy="-13" r="1.6" fill="#fff" className="bot-blink" />
        <line x1="0" y1="-23" x2="0" y2="-27" stroke={agent.color} strokeWidth="1.5" />
        <circle cx="0" cy="-29" r="2.2" fill={agent.color} className={working ? 'antenna-pulse' : ''} />
        <rect x="-15" y="2" width="4" height="12" rx="2" fill={agent.color} className={working ? 'bot-arm-l' : ''} />
        <rect x="11" y="2" width="4" height="12" rx="2" fill={agent.color} className={working ? 'bot-arm-r' : ''} />
      </g>
      <g transform="translate(0, 38)">
        <rect x="-28" y="-8" width="56" height="15" rx="7.5" fill="white" stroke={agent.color} strokeWidth="1" filter="url(#tagShadow)" />
        <text x="0" y="3" textAnchor="middle" fill={agent.color} fontSize="9" fontWeight="700" fontFamily="ui-sans-serif, system-ui">{agent.name}</text>
      </g>
      {bubble && (
        <g transform="translate(0, -48)" className="bubble-in">
          <rect x="-68" y="-12" width="136" height="22" rx="10" fill="white" stroke="#e5e7eb" strokeWidth="1" filter="url(#tagShadow)" />
          <path d="M -4 10 L 0 16 L 4 10 Z" fill="white" />
          <text x="0" y="3" textAnchor="middle" fill="#374151" fontSize="9.5" fontFamily="ui-sans-serif, system-ui">{bubble}</text>
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
      const act = () => {
        const action = agent.actions[Math.floor(Math.random() * agent.actions.length)]
        const spot = agent.spots[Math.floor(Math.random() * agent.spots.length)]
        setPositions(prev => ({ ...prev, [agent.id]: spot }))
        setWorking(prev => ({ ...prev, [agent.id]: true }))
        timers.push(setTimeout(() => {
          setBubbles(prev => ({ ...prev, [agent.id]: action }))
          const time = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
          setLogs(prev => [...prev.slice(-14), { agent: agent.id, msg: action, time }])
        }, 2500))
        timers.push(setTimeout(() => {
          setBubbles(prev => ({ ...prev, [agent.id]: null }))
          setWorking(prev => ({ ...prev, [agent.id]: false }))
        }, 6500))
      }
      timers.push(setTimeout(() => { act(); const interval = setInterval(act, 9000 + i * 1500); timers.push(interval) }, i * 1800))
    })
    return () => timers.forEach(t => { clearTimeout(t); clearInterval(t) })
  }, [])

  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight }, [logs])

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
        @keyframes bubbleIn { from { opacity: 0; transform: translate(0, -40px) scale(0.85); } to { opacity: 1; transform: translate(0, -48px) scale(1); } }
        .bubble-in { animation: bubbleIn 0.25s ease-out forwards; }
        @keyframes screenGlow { 0%, 100% { opacity: 0.7; } 50% { opacity: 0.9; } }
        .screen-glow { animation: screenGlow 2s ease-in-out infinite; }
      `}</style>

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-gray-800">The Office</h2>
        <span className="text-xs text-gray-400">Click an agent to chat</span>
      </div>

      <div className="rounded-2xl border border-gray-200 overflow-hidden shadow-sm mb-4">
        <svg viewBox="0 0 1000 500" className="w-full" style={{ display: 'block' }}>
          <defs>
            <linearGradient id="botShine" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="rgba(255,255,255,0.4)" /><stop offset="60%" stopColor="rgba(255,255,255,0)" />
            </linearGradient>
            <linearGradient id="wallGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f1ede8" /><stop offset="100%" stopColor="#e8e2db" />
            </linearGradient>
            <linearGradient id="floorGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#d4b896" /><stop offset="100%" stopColor="#c4a882" />
            </linearGradient>
            <pattern id="floorPattern" width="60" height="60" patternUnits="userSpaceOnUse">
              <rect width="60" height="60" fill="#c9a67a" />
              <rect x="0" y="0" width="30" height="30" fill="#c4a070" />
              <rect x="30" y="30" width="30" height="30" fill="#c4a070" />
            </pattern>
            <filter id="tagShadow"><feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.08" /></filter>
          </defs>

          <rect x="0" y="0" width="1000" height="160" fill="url(#wallGrad)" />
          <rect x="0" y="152" width="1000" height="10" fill="#b8a48c" />
          <rect x="0" y="162" width="1000" height="338" fill="url(#floorPattern)" opacity="0.85" />
          <rect x="0" y="162" width="1000" height="338" fill="url(#floorGrad)" opacity="0.3" />

          <g transform="translate(360, 18)">
            <rect x="0" y="0" width="180" height="110" rx="4" fill="#87ceeb" stroke="#a09080" strokeWidth="5" />
            <line x1="90" y1="0" x2="90" y2="110" stroke="#a09080" strokeWidth="4" />
            <line x1="0" y1="55" x2="180" y2="55" stroke="#a09080" strokeWidth="4" />
            <circle cx="140" cy="30" r="16" fill="#fde68a" opacity="0.9" />
            <ellipse cx="50" cy="85" rx="30" ry="10" fill="#6dc66d" opacity="0.5" />
            <ellipse cx="130" cy="90" rx="24" ry="8" fill="#5db85d" opacity="0.4" />
            <rect x="-12" y="-4" width="16" height="118" rx="3" fill="#dcd0c0" />
            <rect x="176" y="-4" width="16" height="118" rx="3" fill="#dcd0c0" />
          </g>

          <g transform="translate(280, 50)">
            <circle cx="0" cy="0" r="20" fill="white" stroke="#a09080" strokeWidth="2" />
            <line x1="0" y1="0" x2="0" y2="-12" stroke="#374151" strokeWidth="2" strokeLinecap="round" />
            <line x1="0" y1="0" x2="8" y2="4" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="0" cy="0" r="2" fill="#374151" />
          </g>

          <g transform="translate(60, 70)">
            <rect x="0" y="0" width="70" height="90" rx="3" fill="#6b7280" stroke="#4b5563" strokeWidth="2" />
            {[0, 1, 2].map(i => <g key={i}><rect x="6" y={6 + i * 28} width="58" height="24" rx="2" fill="#9ca3af" /><circle cx="35" cy={18 + i * 28} r="3" fill="#d1d5db" /></g>)}
            <text x="35" y="108" textAnchor="middle" fill="#6b7280" fontSize="11" fontFamily="ui-sans-serif, system-ui" fontWeight="500">Finance</text>
          </g>

          <g transform="translate(195, 250)">
            <rect x="0" y="30" width="130" height="10" rx="2" fill="#8b6f47" />
            <rect x="4" y="40" width="6" height="30" fill="#7a6040" />
            <rect x="120" y="40" width="6" height="30" fill="#7a6040" />
            <rect x="15" y="-4" width="44" height="30" rx="3" fill="#1e1e2e" stroke="#374151" strokeWidth="1.5" />
            <rect x="19" y="0" width="36" height="22" rx="2" fill="#dbeafe" className="screen-glow" />
            <polyline points="23,16 29,10 35,13 41,5 47,8 51,4" fill="none" stroke="#3b82f6" strokeWidth="1.5" />
            <rect x="71" y="-4" width="44" height="30" rx="3" fill="#1e1e2e" stroke="#374151" strokeWidth="1.5" />
            <rect x="75" y="0" width="36" height="22" rx="2" fill="#dbeafe" className="screen-glow" opacity="0.8" />
            <ellipse cx="65" cy="85" rx="18" ry="6" fill="rgba(0,0,0,0.06)" />
            <rect x="50" y="60" width="30" height="22" rx="8" fill="#374151" />
            <rect x="55" y="48" width="20" height="16" rx="5" fill="#4b5563" />
            <text x="65" y="102" textAnchor="middle" fill="#6b7280" fontSize="11" fontFamily="ui-sans-serif, system-ui" fontWeight="500">Sales Desk</text>
          </g>

          <g transform="translate(570, 20)">
            <rect x="0" y="0" width="150" height="105" rx="3" fill="#d4a06a" stroke="#b8894e" strokeWidth="3" />
            <rect x="4" y="4" width="142" height="97" fill="#e8c89a" />
            {[[10, 10, '#f87171'], [60, 8, '#a78bfa'], [105, 12, '#fbbf24'], [15, 45, '#34d399'], [65, 42, '#60a5fa'], [110, 48, '#fb923c'], [20, 75, '#f472b6'], [70, 72, '#a78bfa'], [115, 78, '#34d399']].map(([x, y, c], i) => (
              <rect key={i} x={x} y={y} width="32" height="22" rx="1" fill={c} opacity="0.8" transform={`rotate(${(i % 3 - 1) * 3}, ${x + 16}, ${y + 11})`} />
            ))}
            {[[26, 10], [76, 8], [121, 12], [31, 45], [81, 42], [126, 48]].map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r="3" fill="#ef4444" stroke="#fff" strokeWidth="0.5" />
            ))}
            <text x="75" y="122" textAnchor="middle" fill="#6b7280" fontSize="11" fontFamily="ui-sans-serif, system-ui" fontWeight="500">Campaign Board</text>
          </g>

          <g transform="translate(800, 22)">
            <rect x="0" y="0" width="140" height="95" rx="3" fill="white" stroke="#9ca3af" strokeWidth="2" />
            <rect x="0" y="88" width="140" height="10" rx="2" fill="#d1d5db" />
            <text x="14" y="20" fill="#1f2937" fontSize="10" fontFamily="ui-sans-serif" fontWeight="700">GROWTH STRATEGY</text>
            <line x1="14" y1="24" x2="126" y2="24" stroke="#e5e7eb" strokeWidth="1" />
            <polyline points="18,70 40,52 60,58 82,36 105,42 126,22" fill="none" stroke="#0891b2" strokeWidth="2.5" />
            <circle cx="82" cy="36" r="4" fill="#dc2626" />
            <circle cx="126" cy="22" r="4" fill="#16a34a" />
            <rect x="8" y="90" width="20" height="5" rx="2" fill="#dc2626" />
            <rect x="32" y="90" width="20" height="5" rx="2" fill="#2563eb" />
            <rect x="56" y="90" width="20" height="5" rx="2" fill="#16a34a" />
            <text x="70" y="114" textAnchor="middle" fill="#6b7280" fontSize="11" fontFamily="ui-sans-serif, system-ui" fontWeight="500">Strategy</text>
          </g>

          <g transform="translate(400, 295)">
            <rect x="0" y="0" width="110" height="65" rx="3" fill="#8b6f47" stroke="#7a6040" strokeWidth="2" />
            <line x1="0" y1="32" x2="110" y2="32" stroke="#7a6040" strokeWidth="2" />
            {[0, 1, 2, 3].map(i => <rect key={'t' + i} x={8 + i * 26} y="6" width="20" height="22" rx="3" fill={['#dbeafe', '#fce7f3', '#d1fae5', '#fef3c7'][i]} stroke={['#93c5fd', '#f9a8d4', '#6ee7b7', '#fcd34d'][i]} strokeWidth="1" />)}
            {[0, 1, 2, 3].map(i => <rect key={'b' + i} x={8 + i * 26} y="37" width="20" height="22" rx="3" fill={['#fef3c7', '#dbeafe', '#fce7f3', '#d1fae5'][i]} stroke={['#fcd34d', '#93c5fd', '#f9a8d4', '#6ee7b7'][i]} strokeWidth="1" />)}
            <text x="55" y="82" textAnchor="middle" fill="#6b7280" fontSize="11" fontFamily="ui-sans-serif, system-ui" fontWeight="500">Inventory</text>
          </g>

          <g transform="translate(740, 275)">
            <rect x="0" y="12" width="120" height="32" rx="10" fill="#7c3aed" opacity="0.15" />
            <rect x="0" y="0" width="120" height="24" rx="10" fill="#8b5cf6" opacity="0.25" />
            <rect x="-8" y="6" width="14" height="38" rx="6" fill="#8b5cf6" opacity="0.2" />
            <rect x="114" y="6" width="14" height="38" rx="6" fill="#8b5cf6" opacity="0.2" />
            <rect x="30" y="52" width="60" height="8" rx="3" fill="#a3845c" />
            <rect x="38" y="60" width="4" height="10" fill="#8b7355" />
            <rect x="78" y="60" width="4" height="10" fill="#8b7355" />
            <rect x="52" y="46" width="10" height="10" rx="3" fill="white" stroke="#d1d5db" strokeWidth="1" />
            <g transform="translate(140, 16)">
              <rect x="-7" y="16" width="14" height="16" rx="3" fill="#92400e" opacity="0.6" />
              <path d="M 0 16 C -10 4 -5 -6 0 -10 C 5 -6 10 4 0 16" fill="#22c55e" opacity="0.7" />
              <path d="M 0 12 C -7 4 -3 -2 0 -5 C 3 -2 7 4 0 12" fill="#16a34a" opacity="0.6" />
            </g>
            <text x="60" y="82" textAnchor="middle" fill="#6b7280" fontSize="11" fontFamily="ui-sans-serif, system-ui" fontWeight="500">Lounge</text>
          </g>

          <ellipse cx="500" cy="420" rx="120" ry="35" fill="#be185d" opacity="0.08" />
          <ellipse cx="500" cy="420" rx="100" ry="28" fill="#be185d" opacity="0.06" />

          <g transform="translate(40, 380)">
            <rect x="-10" y="30" width="20" height="22" rx="4" fill="#92400e" opacity="0.5" />
            <path d="M 0 30 C -16 14 -8 -4 0 -14 C 8 -4 16 14 0 30" fill="#22c55e" opacity="0.6" />
            <path d="M -6 28 C -14 18 -10 8 -6 2" fill="none" stroke="#16a34a" strokeWidth="2" opacity="0.4" />
            <path d="M 6 28 C 14 18 10 8 6 2" fill="none" stroke="#16a34a" strokeWidth="2" opacity="0.4" />
          </g>

          {AGENTS.map(agent => (
            <Bot key={agent.id} agent={agent} pos={positions[agent.id]} working={!!working[agent.id]} bubble={bubbles[agent.id]} onClick={() => onAsk(agent.query)} />
          ))}
        </svg>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
        <div className="px-4 py-2 border-b border-gray-100 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs text-gray-500 font-medium">Office Activity</span>
        </div>
        <div ref={logRef} className="px-4 py-2 h-24 overflow-y-auto">
          {logs.length === 0 ? (
            <p className="text-sm text-gray-400">Agents arriving...</p>
          ) : (
            logs.map((log, i) => {
              const agent = AGENTS.find(a => a.id === log.agent)
              return (
                <div key={i} className="flex items-center gap-3 py-0.5 text-sm">
                  <span className="text-gray-400 text-xs font-mono flex-shrink-0">{log.time}</span>
                  <span className="font-semibold flex-shrink-0 text-xs" style={{ color: agent?.color }}>{agent?.name}</span>
                  <span className="text-gray-500 truncate text-xs">{log.msg}</span>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
