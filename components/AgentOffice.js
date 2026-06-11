import { useState, useEffect, useRef } from 'react'

// ─── Floor plan: two wings, rooms with walls ───────────────────
const ROOMS = [
  {
    id: 'finance', wing: 'business', name: 'Finance Office', color: '#16a34a', tint: '#f0fdf4',
    x: 20, y: 50, w: 210, h: 220,
    actions: [
      { label: 'P&L summary', query: 'Show me the P&L summary' },
      { label: 'EBITDA this month', query: 'What is my EBITDA this month?' },
      { label: 'Ad spend breakdown', query: 'Break down my ad spend by month' },
    ],
  },
  {
    id: 'marketing', wing: 'business', name: 'Marketing Studio', color: '#8b5cf6', tint: '#f5f3ff',
    x: 230, y: 50, w: 210, h: 220,
    actions: [
      { label: 'Ad performance', query: 'How are my Meta ads performing?' },
      { label: 'Klaviyo flows', query: 'How are my Klaviyo email flows doing?' },
      { label: 'ROAS check', query: 'What is my ROAS right now?' },
    ],
  },
  {
    id: 'growth', wing: 'business', name: 'Boardroom', color: '#0891b2', tint: '#ecfeff',
    x: 440, y: 50, w: 200, h: 220,
    actions: [
      { label: 'Growth ideas', query: 'Give me 3 growth ideas based on my data' },
      { label: 'What to focus on', query: 'What should I focus on this week to grow Flair?' },
      { label: 'Top customers', query: 'Who are my top customers?' },
    ],
  },
  {
    id: 'sales', wing: 'business', name: 'Sales Office', color: '#3b82f6', tint: '#eff6ff',
    x: 20, y: 270, w: 310, h: 230,
    actions: [
      { label: 'Sales overview', query: 'Give me a sales overview — orders, revenue, refunds' },
      { label: 'Recent orders', query: 'Show me my most recent orders' },
      { label: 'This week vs last', query: 'How are sales this week compared to last week?' },
    ],
  },
  {
    id: 'product', wing: 'business', name: 'Warehouse', color: '#dc2626', tint: '#fef2f2',
    x: 330, y: 270, w: 310, h: 230,
    actions: [
      { label: 'Inventory levels', query: 'Show me my product inventory levels' },
      { label: 'Best sellers', query: 'What are my best selling products?' },
      { label: 'COGS check', query: 'What is my COGS looking like?' },
    ],
  },
  {
    id: 'homeoffice', wing: 'personal', name: 'Home Office', color: '#ea580c', tint: '#fff7ed',
    x: 670, y: 50, w: 310, h: 220,
    actions: [
      { label: 'Bank balances', query: 'What are my personal bank balances?' },
      { label: 'Recent transactions', query: 'Show me my recent personal transactions' },
      { label: 'Money in vs out', query: 'How much money came in vs went out this month personally?' },
    ],
  },
  {
    id: 'living', wing: 'personal', name: 'Living Room', color: '#db2777', tint: '#fdf2f8',
    x: 670, y: 270, w: 310, h: 230,
    actions: [
      { label: 'Spending breakdown', query: 'Break down my personal spending by category' },
      { label: 'Biggest expenses', query: 'What were my biggest personal expenses this month?' },
      { label: 'Life + business total', query: 'How much money do I have in total — business and personal?' },
    ],
  },
]

const AGENTS = [
  { id: 'finance', name: 'Finance', color: '#16a34a', room: 'finance', spots: [{ x: 120, y: 170 }, { x: 80, y: 210 }, { x: 165, y: 200 }], actions: ['Calculating EBITDA...', 'Reconciling accounts...', 'Filing the numbers...', 'Margins look healthy'] },
  { id: 'marketing', name: 'Marketing', color: '#8b5cf6', room: 'marketing', spots: [{ x: 330, y: 170 }, { x: 290, y: 210 }, { x: 380, y: 200 }], actions: ['Reviewing Meta ads...', 'Checking Klaviyo...', 'Pinning campaign ideas...', 'ROAS updated'] },
  { id: 'growth', name: 'Growth', color: '#0891b2', room: 'growth', spots: [{ x: 540, y: 170 }, { x: 500, y: 210 }, { x: 585, y: 200 }], actions: ['Sketching strategy...', 'Analysing LTV...', 'Preparing the pitch...', 'New idea on the board'] },
  { id: 'sales', name: 'Sales', color: '#3b82f6', room: 'sales', spots: [{ x: 170, y: 390 }, { x: 110, y: 430 }, { x: 240, y: 420 }], actions: ['Scanning new orders...', 'Checking AOV trend...', 'Reviewing refunds...', 'Orders flowing in'] },
  { id: 'product', name: 'Products', color: '#dc2626', room: 'product', spots: [{ x: 480, y: 390 }, { x: 420, y: 430 }, { x: 560, y: 420 }], actions: ['Counting stock...', 'Checking best sellers...', 'Scanning barcodes...', 'Inventory healthy'] },
  { id: 'personal', name: 'Personal', color: '#ea580c', room: 'homeoffice', spots: [{ x: 820, y: 170 }, { x: 880, y: 200 }, { x: 800, y: 400 }, { x: 870, y: 430 }], actions: ['Checking Nationwide...', 'Reviewing Halifax...', 'Categorising spending...', 'Relaxing on the sofa'] },
]

function Bot({ agent, pos, working, bubble, onClick }) {
  return (
    <g transform={`translate(${pos.x}, ${pos.y})`} onClick={(e) => { e.stopPropagation(); onClick() }} style={{ cursor: 'pointer', transition: 'transform 2.5s cubic-bezier(0.45, 0, 0.25, 1)' }}>
      <ellipse cx="0" cy="24" rx="13" ry="4" fill="rgba(0,0,0,0.12)" />
      <g className={working ? 'bot-bob' : ''}>
        <rect x="-10" y="-1" width="20" height="22" rx="7" fill={agent.color} />
        <rect x="-10" y="-1" width="20" height="22" rx="7" fill="url(#botShine)" />
        <circle cx="0" cy="-12" r="9" fill={agent.color} />
        <circle cx="0" cy="-12" r="9" fill="url(#botShine)" />
        <rect x="-5.5" y="-15.5" width="11" height="7" rx="3.5" fill="#1e1e2e" />
        <circle cx="-2.2" cy="-12" r="1.4" fill="#fff" className="bot-blink" />
        <circle cx="2.2" cy="-12" r="1.4" fill="#fff" className="bot-blink" />
        <line x1="0" y1="-21" x2="0" y2="-24" stroke={agent.color} strokeWidth="1.5" />
        <circle cx="0" cy="-26" r="2" fill={agent.color} className={working ? 'antenna-pulse' : ''} />
        <rect x="-14" y="2" width="4" height="11" rx="2" fill={agent.color} className={working ? 'bot-arm-l' : ''} />
        <rect x="10" y="2" width="4" height="11" rx="2" fill={agent.color} className={working ? 'bot-arm-r' : ''} />
      </g>
      {bubble && (
        <g transform="translate(0, -44)" className="bubble-in">
          <rect x="-64" y="-11" width="128" height="20" rx="9" fill="white" stroke="#e5e7eb" strokeWidth="1" filter="url(#tagShadow)" />
          <path d="M -4 9 L 0 14 L 4 9 Z" fill="white" />
          <text x="0" y="3" textAnchor="middle" fill="#374151" fontSize="9" fontFamily="ui-sans-serif, system-ui">{bubble}</text>
        </g>
      )}
    </g>
  )
}

// ─── Furniture per room ────────────────────────────────────────
function RoomFurniture({ room }) {
  switch (room.id) {
    case 'finance':
      return (
        <g transform={`translate(${room.x + 20}, ${room.y + 25})`}>
          <rect x="0" y="0" width="46" height="62" rx="2" fill="#6b7280" />
          {[0, 1, 2].map(i => <g key={i}><rect x="4" y={4 + i * 19} width="38" height="16" rx="2" fill="#9ca3af" /><circle cx="23" cy={12 + i * 19} r="2" fill="#d1d5db" /></g>)}
          <rect x="120" y="30" width="66" height="8" rx="2" fill="#8b6f47" />
          <rect x="124" y="38" width="4" height="18" fill="#7a6040" />
          <rect x="178" y="38" width="4" height="18" fill="#7a6040" />
          <rect x="132" y="8" width="32" height="22" rx="2" fill="#1e1e2e" />
          <rect x="135" y="11" width="26" height="16" rx="1" fill="#d1fae5" className="screen-glow" />
        </g>
      )
    case 'marketing':
      return (
        <g transform={`translate(${room.x + 25}, ${room.y + 20})`}>
          <rect x="0" y="0" width="100" height="68" rx="2" fill="#d4a06a" stroke="#b8894e" strokeWidth="2" />
          <rect x="3" y="3" width="94" height="62" fill="#e8c89a" />
          {[[8, 8, '#f87171'], [42, 6, '#a78bfa'], [72, 10, '#fbbf24'], [12, 36, '#34d399'], [46, 33, '#60a5fa'], [74, 38, '#fb923c']].map(([x, y, c], i) => (
            <rect key={i} x={x} y={y} width="22" height="16" rx="1" fill={c} opacity="0.85" transform={`rotate(${(i % 3 - 1) * 4}, ${x + 11}, ${y + 8})`} />
          ))}
          <rect x="130" y="40" width="50" height="7" rx="2" fill="#8b6f47" />
          <rect x="134" y="47" width="3" height="14" fill="#7a6040" />
          <rect x="173" y="47" width="3" height="14" fill="#7a6040" />
        </g>
      )
    case 'growth':
      return (
        <g transform={`translate(${room.x + 20}, ${room.y + 20})`}>
          {/* big table */}
          <ellipse cx="85" cy="105" rx="62" ry="26" fill="#a3845c" />
          <ellipse cx="85" cy="100" rx="62" ry="26" fill="#b8966a" />
          {/* whiteboard */}
          <rect x="35" y="0" width="100" height="62" rx="2" fill="white" stroke="#9ca3af" strokeWidth="2" />
          <text x="44" y="16" fill="#1f2937" fontSize="8" fontWeight="700" fontFamily="ui-sans-serif">GROWTH ↗</text>
          <polyline points="44,48 60,36 74,42 92,24 108,30 124,16" fill="none" stroke="#0891b2" strokeWidth="2" />
          <circle cx="92" cy="24" r="3" fill="#dc2626" />
        </g>
      )
    case 'sales':
      return (
        <g transform={`translate(${room.x + 30}, ${room.y + 30})`}>
          <rect x="0" y="28" width="110" height="9" rx="2" fill="#8b6f47" />
          <rect x="4" y="37" width="5" height="24" fill="#7a6040" />
          <rect x="101" y="37" width="5" height="24" fill="#7a6040" />
          <rect x="10" y="-2" width="40" height="27" rx="2" fill="#1e1e2e" />
          <rect x="13" y="1" width="34" height="20" rx="1" fill="#dbeafe" className="screen-glow" />
          <polyline points="17,16 23,10 29,13 35,6 41,9 45,4" fill="none" stroke="#3b82f6" strokeWidth="1.5" />
          <rect x="60" y="-2" width="40" height="27" rx="2" fill="#1e1e2e" />
          <rect x="63" y="1" width="34" height="20" rx="1" fill="#dbeafe" className="screen-glow" opacity="0.8" />
          {/* chair */}
          <rect x="42" y="48" width="26" height="18" rx="7" fill="#374151" />
          {/* parcel boxes */}
          <g transform="translate(170, 90)">
            <rect x="0" y="0" width="30" height="24" rx="2" fill="#d4a06a" stroke="#b8894e" strokeWidth="1.5" />
            <line x1="15" y1="0" x2="15" y2="24" stroke="#b8894e" strokeWidth="1.5" />
            <rect x="36" y="6" width="24" height="18" rx="2" fill="#deb887" stroke="#b8894e" strokeWidth="1.5" />
          </g>
        </g>
      )
    case 'product':
      return (
        <g transform={`translate(${room.x + 30}, ${room.y + 25})`}>
          {[0, 1].map(s => (
            <g key={s} transform={`translate(${s * 130}, 0)`}>
              <rect x="0" y="0" width="100" height="58" rx="2" fill="#8b6f47" stroke="#7a6040" strokeWidth="2" />
              <line x1="0" y1="29" x2="100" y2="29" stroke="#7a6040" strokeWidth="2" />
              {[0, 1, 2].map(i => <rect key={'t' + i} x={8 + i * 32} y="5" width="24" height="20" rx="2" fill={['#dbeafe', '#fce7f3', '#d1fae5'][i]} stroke={['#93c5fd', '#f9a8d4', '#6ee7b7'][i]} strokeWidth="1" />)}
              {[0, 1, 2].map(i => <rect key={'b' + i} x={8 + i * 32} y="33" width="24" height="20" rx="2" fill={['#fef3c7', '#dbeafe', '#fce7f3'][i]} stroke={['#fcd34d', '#93c5fd', '#f9a8d4'][i]} strokeWidth="1" />)}
            </g>
          ))}
          {/* trolley */}
          <g transform="translate(95, 110)">
            <rect x="0" y="0" width="40" height="22" rx="2" fill="none" stroke="#6b7280" strokeWidth="2.5" />
            <circle cx="8" cy="28" r="5" fill="#4b5563" />
            <circle cx="32" cy="28" r="5" fill="#4b5563" />
            <rect x="6" y="-12" width="18" height="14" rx="1" fill="#d4a06a" stroke="#b8894e" strokeWidth="1.5" />
          </g>
        </g>
      )
    case 'homeoffice':
      return (
        <g transform={`translate(${room.x + 30}, ${room.y + 30})`}>
          <rect x="0" y="26" width="90" height="8" rx="2" fill="#8b6f47" />
          <rect x="4" y="34" width="4" height="20" fill="#7a6040" />
          <rect x="82" y="34" width="4" height="20" fill="#7a6040" />
          <rect x="22" y="-2" width="44" height="26" rx="2" fill="#1e1e2e" />
          <rect x="25" y="1" width="38" height="19" rx="1" fill="#ffedd5" className="screen-glow" />
          <text x="44" y="14" textAnchor="middle" fill="#ea580c" fontSize="8" fontWeight="700" fontFamily="ui-sans-serif">£ BANKS</text>
          {/* bookshelf */}
          <g transform="translate(150, -10)">
            <rect x="0" y="0" width="60" height="70" rx="2" fill="#8b6f47" stroke="#7a6040" strokeWidth="2" />
            <line x1="0" y1="23" x2="60" y2="23" stroke="#7a6040" strokeWidth="2" />
            <line x1="0" y1="46" x2="60" y2="46" stroke="#7a6040" strokeWidth="2" />
            {[[5, 4, '#ef4444'], [13, 4, '#3b82f6'], [21, 4, '#22c55e'], [31, 4, '#f59e0b'], [5, 27, '#8b5cf6'], [14, 27, '#06b6d4'], [24, 27, '#ec4899'], [5, 50, '#64748b'], [15, 50, '#f97316']].map(([x, y, c], i) => (
              <rect key={i} x={x} y={y} width="7" height="17" rx="1" fill={c} opacity="0.7" />
            ))}
          </g>
        </g>
      )
    case 'living':
      return (
        <g transform={`translate(${room.x + 25}, ${room.y + 35})`}>
          {/* sofa */}
          <rect x="0" y="10" width="110" height="30" rx="9" fill="#db2777" opacity="0.25" />
          <rect x="0" y="0" width="110" height="22" rx="9" fill="#db2777" opacity="0.35" />
          <rect x="-8" y="5" width="13" height="35" rx="6" fill="#db2777" opacity="0.3" />
          <rect x="105" y="5" width="13" height="35" rx="6" fill="#db2777" opacity="0.3" />
          {/* TV on wall */}
          <rect x="150" y="-18" width="80" height="46" rx="3" fill="#1e1e2e" stroke="#374151" strokeWidth="2" />
          <rect x="155" y="-13" width="70" height="36" rx="1" fill="#312e81" opacity="0.7" className="screen-glow" />
          <polyline points="162,12 172,2 182,8 194,-6 206,0 218,-8" fill="none" stroke="#a5b4fc" strokeWidth="1.5" />
          {/* coffee table */}
          <rect x="25" y="58" width="60" height="8" rx="3" fill="#a3845c" />
          <rect x="32" y="66" width="4" height="10" fill="#8b7355" />
          <rect x="74" y="66" width="4" height="10" fill="#8b7355" />
          <rect x="48" y="51" width="9" height="9" rx="3" fill="white" stroke="#d1d5db" strokeWidth="1" />
          {/* plant */}
          <g transform="translate(245, 60)">
            <rect x="-8" y="18" width="16" height="18" rx="3" fill="#92400e" opacity="0.6" />
            <path d="M 0 18 C -12 6 -6 -6 0 -12 C 6 -6 12 6 0 18" fill="#22c55e" opacity="0.7" />
          </g>
        </g>
      )
    default: return null
  }
}

export default function AgentOffice({ onAsk }) {
  const [positions, setPositions] = useState(() => Object.fromEntries(AGENTS.map(a => [a.id, a.spots[0]])))
  const [bubbles, setBubbles] = useState({})
  const [working, setWorking] = useState({})
  const [logs, setLogs] = useState([])
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [hoveredRoom, setHoveredRoom] = useState(null)
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

  const selected = ROOMS.find(r => r.id === selectedRoom)

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
        .bot-arm-l { transform-origin: -12px 4px; animation: armL 0.7s ease-in-out infinite; }
        .bot-arm-r { transform-origin: 12px 4px; animation: armR 0.7s ease-in-out infinite; }
        @keyframes bubbleIn { from { opacity: 0; transform: translate(0, -36px) scale(0.85); } to { opacity: 1; transform: translate(0, -44px) scale(1); } }
        .bubble-in { animation: bubbleIn 0.25s ease-out forwards; }
        @keyframes screenGlow { 0%, 100% { opacity: 0.7; } 50% { opacity: 0.95; } }
        .screen-glow { animation: screenGlow 2s ease-in-out infinite; }
      `}</style>

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-gray-800">Flair HQ — Floor Plan</h2>
        <span className="text-xs text-gray-400">Click a room or agent to interact</span>
      </div>

      <div className="rounded-2xl border border-gray-200 overflow-hidden shadow-sm mb-4 bg-[#efe9e1]">
        <svg viewBox="0 0 1000 560" className="w-full" style={{ display: 'block' }}>
          <defs>
            <linearGradient id="botShine" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="rgba(255,255,255,0.4)" /><stop offset="60%" stopColor="rgba(255,255,255,0)" />
            </linearGradient>
            <filter id="tagShadow"><feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.08" /></filter>
          </defs>

          {/* Wing labels */}
          <text x="330" y="32" textAnchor="middle" fill="#6b7280" fontSize="14" fontWeight="700" fontFamily="ui-sans-serif, system-ui" letterSpacing="2">BUSINESS WING</text>
          <text x="825" y="32" textAnchor="middle" fill="#9d6b53" fontSize="14" fontWeight="700" fontFamily="ui-sans-serif, system-ui" letterSpacing="2">PERSONAL WING</text>

          {/* Corridor between wings */}
          <rect x="640" y="50" width="30" height="450" fill="#ddd5c8" />
          <line x1="640" y1="50" x2="640" y2="500" stroke="#a89a85" strokeWidth="3" />
          <line x1="670" y1="50" x2="670" y2="500" stroke="#a89a85" strokeWidth="3" />
          {/* doors in corridor */}
          <rect x="640" y="140" width="30" height="44" fill="#efe9e1" />
          <rect x="640" y="370" width="30" height="44" fill="#efe9e1" />

          {/* Rooms */}
          {ROOMS.map(room => {
            const isSelected = selectedRoom === room.id
            const isHovered = hoveredRoom === room.id
            return (
              <g
                key={room.id}
                onClick={() => setSelectedRoom(isSelected ? null : room.id)}
                onMouseEnter={() => setHoveredRoom(room.id)}
                onMouseLeave={() => setHoveredRoom(null)}
                style={{ cursor: 'pointer' }}
              >
                {/* floor */}
                <rect x={room.x} y={room.y} width={room.w} height={room.h} fill={isSelected || isHovered ? room.tint : '#faf7f2'} style={{ transition: 'fill 0.2s' }} />
                {/* walls */}
                <rect x={room.x} y={room.y} width={room.w} height={room.h} fill="none" stroke={isSelected ? room.color : '#a89a85'} strokeWidth={isSelected ? 4 : 3} style={{ transition: 'stroke 0.2s' }} />
                {/* room label */}
                <g transform={`translate(${room.x + 10}, ${room.y + 20})`}>
                  <circle cx="5" cy="-4" r="4" fill={room.color} />
                  <text x="15" y="0" fill="#4b5563" fontSize="12" fontWeight="600" fontFamily="ui-sans-serif, system-ui">{room.name}</text>
                </g>
                <RoomFurniture room={room} />
              </g>
            )
          })}

          {/* front door */}
          <rect x="300" y="496" width="60" height="8" fill="#8b6f47" />
          <text x="330" y="525" textAnchor="middle" fill="#9ca3af" fontSize="10" fontFamily="ui-sans-serif, system-ui">Entrance</text>

          {/* Agents */}
          {AGENTS.map(agent => {
            const room = ROOMS.find(r => r.id === agent.room)
            return (
              <Bot
                key={agent.id}
                agent={agent}
                pos={positions[agent.id]}
                working={!!working[agent.id]}
                bubble={bubbles[agent.id]}
                onClick={() => onAsk(room?.actions[0]?.query || `Tell me about ${agent.name}`)}
              />
            )
          })}
        </svg>
      </div>

      {/* Room action panel */}
      {selected && (
        <div className="rounded-xl border-2 bg-white overflow-hidden shadow-sm mb-4" style={{ borderColor: selected.color + '40' }}>
          <div className="px-4 py-3 flex items-center justify-between" style={{ backgroundColor: selected.tint }}>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: selected.color }} />
              <span className="text-sm font-semibold text-gray-800">{selected.name}</span>
              <span className="text-xs text-gray-400 ml-1">{selected.wing === 'personal' ? 'Personal' : 'Business'}</span>
            </div>
            <button onClick={() => setSelectedRoom(null)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
          </div>
          <div className="px-4 py-3 flex flex-wrap gap-2">
            {selected.actions.map((a, i) => (
              <button
                key={i}
                onClick={() => onAsk(a.query)}
                className="px-4 py-2 rounded-lg text-sm font-medium border transition-all hover:shadow-sm"
                style={{ borderColor: selected.color + '50', color: selected.color, backgroundColor: selected.tint }}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Activity log */}
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
