import { useState, useEffect, useRef } from 'react'

// ─── Isometric helpers ─────────────────────────────────────────
const T = 32 // tile size
const toIso = (col, row) => ({
  x: 400 + (col - row) * (T / 2),
  y: 60 + (col + row) * (T / 4),
})

// ─── Room definitions on the grid ──────────────────────────────
const ROOMS = [
  { id: 'finance', name: 'Finance', color: '#16a34a', col: 1, row: 1, w: 5, h: 4, wing: 'biz',
    actions: [{ label: 'P&L', q: 'Show me the P&L summary' }, { label: 'EBITDA', q: 'What is my EBITDA this month?' }, { label: 'Margins', q: 'How are my margins?' }] },
  { id: 'marketing', name: 'Marketing', color: '#8b5cf6', col: 6, row: 1, w: 5, h: 4, wing: 'biz',
    actions: [{ label: 'Meta Ads', q: 'How are my Meta ads performing?' }, { label: 'Klaviyo', q: 'How are my Klaviyo flows?' }, { label: 'ROAS', q: 'What is my ROAS?' }] },
  { id: 'sales', name: 'Sales', color: '#3b82f6', col: 1, row: 6, w: 5, h: 4, wing: 'biz',
    actions: [{ label: 'Orders', q: 'Sales overview — orders, revenue, refunds' }, { label: 'Recent', q: 'Show recent orders' }, { label: 'This week', q: 'How are sales this week?' }] },
  { id: 'warehouse', name: 'Warehouse', color: '#dc2626', col: 6, row: 6, w: 5, h: 4, wing: 'biz',
    actions: [{ label: 'Stock', q: 'Show inventory levels' }, { label: 'Best sellers', q: 'What are my best sellers?' }, { label: 'COGS', q: 'What is my COGS?' }] },
  { id: 'homeoffice', name: 'Home Office', color: '#ea580c', col: 14, row: 1, w: 5, h: 4, wing: 'personal',
    actions: [{ label: 'Balances', q: 'What are my bank balances?' }, { label: 'Transactions', q: 'Show recent transactions' }, { label: 'In vs Out', q: 'Money in vs out this month?' }] },
  { id: 'living', name: 'Living Room', color: '#db2777', col: 14, row: 6, w: 5, h: 4, wing: 'personal',
    actions: [{ label: 'Spending', q: 'Break down personal spending' }, { label: 'Biggest', q: 'Biggest expenses this month?' }, { label: 'Total', q: 'Total money — business + personal?' }] },
]

const AGENTS = [
  { id: 'fin', name: 'Finance', color: '#16a34a', room: 'finance', msgs: ['Calculating EBITDA...', 'Filing accounts...', 'Margins look good'] },
  { id: 'mkt', name: 'Marketing', color: '#8b5cf6', room: 'marketing', msgs: ['Checking Meta ads...', 'Reviewing Klaviyo...', 'ROAS is 2.4x'] },
  { id: 'sales', name: 'Sales', color: '#3b82f6', room: 'sales', msgs: ['New order came in!', 'Scanning refunds...', 'AOV trending up'] },
  { id: 'prod', name: 'Products', color: '#dc2626', room: 'warehouse', msgs: ['Counting stock...', 'Best sellers updated', 'All items in stock'] },
  { id: 'personal', name: 'Personal', color: '#ea580c', room: 'homeoffice', msgs: ['Checking Nationwide...', 'Reviewing Halifax...', 'Categorising spend'] },
  { id: 'life', name: 'Life', color: '#db2777', room: 'living', msgs: ['Relaxing a bit...', 'Checking expenses...', 'Budget looks ok'] },
]

// ─── Isometric tile ────────────────────────────────────────────
function Tile({ col, row, fill, stroke }) {
  const { x, y } = toIso(col, row)
  const points = `${x},${y - T/4} ${x + T/2},${y} ${x},${y + T/4} ${x - T/2},${y}`
  return <polygon points={points} fill={fill} stroke={stroke || 'rgba(0,0,0,0.06)'} strokeWidth="0.5" />
}

// ─── Iso box (for furniture) ───────────────────────────────────
function IsoBox({ col, row, w, d, h, color, topColor }) {
  const { x, y } = toIso(col, row)
  const top = topColor || color
  // top face
  const topPts = `${x},${y - h - d * T/4} ${x + w * T/2},${y - h} ${x},${y - h + d * T/4} ${x - w * T/2},${y - h}`
  // right face
  const rightPts = `${x + w * T/2},${y - h} ${x + w * T/2},${y} ${x},${y + d * T/4} ${x},${y - h + d * T/4}`
  // left face
  const leftPts = `${x - w * T/2},${y - h} ${x - w * T/2},${y} ${x},${y + d * T/4} ${x},${y - h + d * T/4}`
  return (
    <g>
      <polygon points={leftPts} fill={color} opacity="0.85" />
      <polygon points={rightPts} fill={color} opacity="0.65" />
      <polygon points={topPts} fill={top} />
    </g>
  )
}

// ─── Pixel tree ────────────────────────────────────────────────
function Tree({ col, row }) {
  const { x, y } = toIso(col, row)
  return (
    <g>
      <rect x={x - 3} y={y - 6} width="6" height="10" fill="#92400e" />
      <circle cx={x} cy={y - 18} r="12" fill="#22c55e" />
      <circle cx={x - 5} cy={y - 14} r="8" fill="#16a34a" />
      <circle cx={x + 6} cy={y - 16} r="9" fill="#15803d" />
    </g>
  )
}

// ─── Pixel agent sprite ────────────────────────────────────────
function AgentSprite({ agent, pos, active, bubble, onClick }) {
  const { x, y } = pos
  return (
    <g transform={`translate(${x}, ${y})`} onClick={(e) => { e.stopPropagation(); onClick() }} style={{ cursor: 'pointer', transition: 'transform 2s ease-in-out' }}>
      <ellipse cx="0" cy="2" rx="8" ry="3" fill="rgba(0,0,0,0.15)" />
      <g className={active ? 'bot-bob' : ''}>
        {/* legs */}
        <rect x="-4" y="-4" width="3" height="6" rx="1" fill={agent.color} opacity="0.7" className={active ? 'leg-l' : ''} />
        <rect x="1" y="-4" width="3" height="6" rx="1" fill={agent.color} opacity="0.7" className={active ? 'leg-r' : ''} />
        {/* body */}
        <rect x="-6" y="-16" width="12" height="14" rx="3" fill={agent.color} />
        {/* highlight */}
        <rect x="-4" y="-15" width="4" height="6" rx="1" fill="rgba(255,255,255,0.3)" />
        {/* head */}
        <rect x="-7" y="-26" width="14" height="12" rx="4" fill={agent.color} />
        <rect x="-5" y="-24" width="3" height="3" rx="1" fill="rgba(255,255,255,0.25)" />
        {/* eyes */}
        <rect x="-4" y="-22" width="3" height="3" rx="1" fill="#1e1e2e" />
        <rect x="1" y="-22" width="3" height="3" rx="1" fill="#1e1e2e" />
        <rect x="-3" y="-21" width="1" height="1" fill="white" />
        <rect x="2" y="-21" width="1" height="1" fill="white" />
        {/* antenna */}
        <rect x="-1" y="-30" width="2" height="5" fill={agent.color} />
        <rect x="-2" y="-33" width="4" height="4" rx="2" fill={active ? '#fbbf24' : agent.color} className={active ? 'antenna-pulse' : ''} />
      </g>
      {bubble && (
        <g className="bubble-in">
          <rect x="-58" y="-54" width="116" height="20" rx="8" fill="white" stroke="#d1d5db" strokeWidth="1" />
          <polygon points="-3,-34 0,-30 3,-34" fill="white" />
          <text x="0" y="-41" textAnchor="middle" fill="#374151" fontSize="9" fontFamily="ui-sans-serif, system-ui">{bubble}</text>
        </g>
      )}
    </g>
  )
}

// ─── Main component ────────────────────────────────────────────
export default function AgentOffice({ onAsk }) {
  const [agentPos, setAgentPos] = useState({})
  const [bubbles, setBubbles] = useState({})
  const [actives, setActives] = useState({})
  const [logs, setLogs] = useState([])
  const [selectedRoom, setSelectedRoom] = useState(null)
  const logRef = useRef(null)

  // Place agents in their rooms initially
  useEffect(() => {
    const initial = {}
    AGENTS.forEach(a => {
      const room = ROOMS.find(r => r.id === a.room)
      if (room) {
        const { x, y } = toIso(room.col + 2, room.row + 2)
        initial[a.id] = { x, y }
      }
    })
    setAgentPos(initial)

    const timers = []
    AGENTS.forEach((agent, i) => {
      const act = () => {
        const room = ROOMS.find(r => r.id === agent.room)
        if (!room) return
        const rc = room.col + 1 + Math.floor(Math.random() * (room.w - 2))
        const rr = room.row + 1 + Math.floor(Math.random() * (room.h - 2))
        const { x, y } = toIso(rc, rr)
        setAgentPos(prev => ({ ...prev, [agent.id]: { x, y } }))
        setActives(prev => ({ ...prev, [agent.id]: true }))
        const msg = agent.msgs[Math.floor(Math.random() * agent.msgs.length)]
        timers.push(setTimeout(() => {
          setBubbles(prev => ({ ...prev, [agent.id]: msg }))
          const time = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
          setLogs(prev => [...prev.slice(-20), { id: agent.id, name: agent.name, color: agent.color, msg, time, status: 'done' }])
        }, 2000))
        timers.push(setTimeout(() => {
          setBubbles(prev => ({ ...prev, [agent.id]: null }))
          setActives(prev => ({ ...prev, [agent.id]: false }))
        }, 5500))
      }
      timers.push(setTimeout(() => { act(); timers.push(setInterval(act, 8000 + i * 1200)) }, i * 1500))
    })
    return () => timers.forEach(t => { clearTimeout(t); clearInterval(t) })
  }, [])

  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight }, [logs])

  const selected = ROOMS.find(r => r.id === selectedRoom)

  return (
    <div>
      <style jsx global>{`
        @keyframes botBob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-2px); } }
        .bot-bob { animation: botBob 0.6s ease-in-out infinite; }
        @keyframes legL { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-2px); } }
        @keyframes legR { 0%, 100% { transform: translateY(-2px); } 50% { transform: translateY(0); } }
        .leg-l { animation: legL 0.3s ease-in-out infinite; }
        .leg-r { animation: legR 0.3s ease-in-out infinite; }
        @keyframes antennaPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        .antenna-pulse { animation: antennaPulse 0.5s ease-in-out infinite; }
        @keyframes bubbleIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .bubble-in { animation: bubbleIn 0.2s ease-out; }
      `}</style>

      <div className="flex gap-4">
        {/* Left: isometric office */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-800">Flair HQ</h2>
            <div className="flex items-center gap-1.5">
              {AGENTS.map(a => (
                <div key={a.id} className={`w-2.5 h-2.5 rounded-full transition-all ${actives[a.id] ? 'scale-125' : ''}`}
                  style={{ backgroundColor: a.color, boxShadow: actives[a.id] ? `0 0 6px ${a.color}` : 'none' }} />
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 overflow-hidden shadow-sm bg-[#7ec850] mb-3">
            <svg viewBox="0 0 800 420" className="w-full" style={{ display: 'block' }}>
              {/* Grass base */}
              <rect width="800" height="420" fill="#7ec850" />
              <rect width="800" height="420" fill="url(#grassPattern)" opacity="0.3" />
              <defs>
                <pattern id="grassPattern" width="8" height="8" patternUnits="userSpaceOnUse">
                  <rect width="8" height="8" fill="#6db840" />
                  <rect x="2" y="2" width="2" height="2" fill="#7ec850" />
                  <rect x="6" y="5" width="1" height="1" fill="#5da832" />
                </pattern>
              </defs>

              {/* Path / walkway */}
              <rect x="370" y="0" width="60" height="420" fill="#d4b896" opacity="0.7" rx="4" />

              {/* Room floors */}
              {ROOMS.map(room => {
                const tiles = []
                for (let c = room.col; c < room.col + room.w; c++) {
                  for (let r = room.row; r < room.row + room.h; r++) {
                    const isAlt = (c + r) % 2 === 0
                    tiles.push(
                      <Tile key={`${c}-${r}`} col={c} row={r}
                        fill={room.wing === 'personal'
                          ? (isAlt ? '#f5e6d3' : '#eddcc8')
                          : (isAlt ? '#e8e0d5' : '#ded5c8')
                        }
                      />
                    )
                  }
                }

                const tl = toIso(room.col, room.row)
                const tr = toIso(room.col + room.w, room.row)
                const br = toIso(room.col + room.w, room.row + room.h)
                const bl = toIso(room.col, room.row + room.h)
                const isSelected = selectedRoom === room.id

                return (
                  <g key={room.id} onClick={() => setSelectedRoom(selectedRoom === room.id ? null : room.id)} style={{ cursor: 'pointer' }}>
                    {tiles}
                    {/* walls */}
                    <polygon points={`${tl.x},${tl.y} ${tr.x},${tr.y} ${tr.x},${tr.y - 20} ${tl.x},${tl.y - 20}`} fill={room.wing === 'personal' ? '#fde68a' : '#e2d8cc'} stroke="#b8a48c" strokeWidth="1" opacity="0.9" />
                    <polygon points={`${tl.x},${tl.y} ${bl.x},${bl.y} ${bl.x},${bl.y - 20} ${tl.x},${tl.y - 20}`} fill={room.wing === 'personal' ? '#fcd34d' : '#d4c8b6'} stroke="#b8a48c" strokeWidth="1" opacity="0.7" />
                    {/* room border highlight */}
                    <polygon points={`${tl.x},${tl.y} ${tr.x},${tr.y} ${br.x},${br.y} ${bl.x},${bl.y}`} fill="none" stroke={isSelected ? room.color : 'rgba(0,0,0,0.1)'} strokeWidth={isSelected ? 3 : 1} />
                    {/* label */}
                    <g transform={`translate(${(tl.x + br.x) / 2}, ${tl.y - 28})`}>
                      <rect x="-36" y="-9" width="72" height="16" rx="7" fill="white" stroke={room.color} strokeWidth="1.5" opacity="0.95" />
                      <text x="0" y="3" textAnchor="middle" fill={room.color} fontSize="9" fontWeight="700" fontFamily="ui-sans-serif, system-ui">{room.name}</text>
                    </g>
                  </g>
                )
              })}

              {/* Furniture: simple iso boxes */}
              {/* Finance: desk + cabinet */}
              <IsoBox col={2} row={2} w={1.5} d={0.8} h={10} color="#6b7280" topColor="#9ca3af" />
              <IsoBox col={4} row={2.5} w={2} d={1} h={6} color="#8b6f47" topColor="#a3845c" />

              {/* Marketing: pinboard (flat on wall) + desk */}
              <IsoBox col={7.5} row={2} w={2.5} d={0.3} h={14} color="#d4a06a" topColor="#e8c89a" />
              <IsoBox col={8} row={3.5} w={1.5} d={0.8} h={6} color="#8b6f47" topColor="#a3845c" />

              {/* Sales: desks */}
              <IsoBox col={2.5} row={7.5} w={2} d={1} h={6} color="#8b6f47" topColor="#a3845c" />
              <IsoBox col={2.5} row={7.5} w={0.8} d={0.5} h={12} color="#1e1e2e" topColor="#3b82f6" />

              {/* Warehouse: shelves */}
              <IsoBox col={7} row={7} w={1} d={2} h={14} color="#8b6f47" topColor="#a3845c" />
              <IsoBox col={9} row={7} w={1} d={2} h={14} color="#8b6f47" topColor="#a3845c" />

              {/* Home office: desk */}
              <IsoBox col={15.5} row={2.5} w={2} d={1} h={6} color="#8b6f47" topColor="#a3845c" />
              <IsoBox col={15.5} row={2.5} w={0.8} d={0.5} h={12} color="#1e1e2e" topColor="#ea580c" />

              {/* Living room: sofa */}
              <IsoBox col={15} row={7.5} w={2.5} d={1.2} h={6} color="#db2777" topColor="#f472b6" />
              <IsoBox col={16} row={9} w={1.5} d={0.8} h={4} color="#92400e" topColor="#a3845c" />

              {/* Trees around the office */}
              <Tree col={0} row={0} />
              <Tree col={12} row={0} />
              <Tree col={0} row={11} />
              <Tree col={12} row={11} />
              <Tree col={20} row={0} />
              <Tree col={20} row={11} />
              <Tree col={-1} row={5} />
              <Tree col={21} row={5} />

              {/* Wing labels on ground */}
              <text x="260" y="38" textAnchor="middle" fill="#2d5016" fontSize="11" fontWeight="800" fontFamily="ui-sans-serif" opacity="0.6">BUSINESS</text>
              <text x="560" y="38" textAnchor="middle" fill="#92400e" fontSize="11" fontWeight="800" fontFamily="ui-sans-serif" opacity="0.6">PERSONAL</text>

              {/* Agents */}
              {AGENTS.map(agent => agentPos[agent.id] && (
                <AgentSprite
                  key={agent.id}
                  agent={agent}
                  pos={agentPos[agent.id]}
                  active={!!actives[agent.id]}
                  bubble={bubbles[agent.id]}
                  onClick={() => {
                    const room = ROOMS.find(r => r.id === agent.room)
                    if (room) onAsk(room.actions[0].q)
                  }}
                />
              ))}
            </svg>
          </div>

          {/* Room actions */}
          {selected && (
            <div className="rounded-xl border-2 bg-white overflow-hidden shadow-sm mb-3" style={{ borderColor: selected.color + '40' }}>
              <div className="px-4 py-2.5 flex items-center justify-between" style={{ backgroundColor: selected.color + '10' }}>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: selected.color }} />
                  <span className="text-sm font-semibold text-gray-800">{selected.name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-400">{selected.wing === 'personal' ? 'Personal' : 'Business'}</span>
                </div>
                <button onClick={(e) => { e.stopPropagation(); setSelectedRoom(null) }} className="text-gray-400 hover:text-gray-600">×</button>
              </div>
              <div className="px-4 py-2.5 flex flex-wrap gap-2">
                {selected.actions.map((a, i) => (
                  <button key={i} onClick={() => onAsk(a.q)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all hover:shadow-sm"
                    style={{ borderColor: selected.color + '40', color: selected.color }}>
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Activity feed */}
        <div className="w-72 flex-shrink-0">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="text-sm font-semibold text-gray-700">Activity Feed</h3>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 font-medium">Live</span>
          </div>
          <div ref={logRef} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-y-auto" style={{ height: 'calc(100% - 36px)' }}>
            {logs.length === 0 ? (
              <p className="text-sm text-gray-400 p-4">Agents clocking in...</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {[...logs].reverse().map((log, i) => (
                  <div key={i} className="px-3.5 py-2.5 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: log.color }} />
                        <span className="text-xs font-semibold" style={{ color: log.color }}>@{log.name.toLowerCase()}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-medium">done</span>
                      </div>
                      <span className="text-[10px] text-gray-400">{log.time}</span>
                    </div>
                    <p className="text-xs text-gray-600 pl-3.5">{log.msg}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
