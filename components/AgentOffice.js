import { useState, useEffect, useRef, useCallback } from 'react'

// ─── Pixel art rendered on canvas for crisp retro look ─────────
const TILE = 16
const COLS = 52
const ROWS = 32
const SCALE = 2

const PALETTE = {
  grass: ['#5a8c2a', '#4a7c22', '#6a9c32'],
  path: ['#c4a46c', '#b89860'],
  wallTop: '#8b7355',
  wallFront: '#a3845c',
  wallDark: '#6b5a42',
  floorWood: ['#c49a6c', '#b8905e', '#d4a878'],
  floorCarpet: ['#6868a8', '#5858a0', '#7878b0'],
  floorTile: ['#d8d0c0', '#ccc4b4', '#e0d8c8'],
  roofTop: '#7c5c3c',
  roofSide: '#5c4028',
  desk: '#8b6f47',
  deskTop: '#a3845c',
  monitor: '#1a1a2e',
  screenBlue: '#4488cc',
  screenGreen: '#44cc88',
  screenOrange: '#cc8844',
  chair: '#444',
  shelf: '#7a6040',
  bookColors: ['#cc4444', '#4488cc', '#44aa44', '#cc8844', '#aa44cc', '#44aaaa'],
  sofa: '#884466',
  sofaLight: '#aa6688',
  plant: '#44aa44',
  plantDark: '#2d8a2d',
  pot: '#8b5e3c',
  rug: '#884444',
  rugLight: '#aa5555',
  bed: '#6666aa',
  bedSheet: '#8888cc',
  window: '#88ccee',
  windowFrame: '#a3845c',
  lamp: '#ffdd44',
  tv: '#222',
  tvScreen: '#334466',
}

// Room layout: [x, y, w, h, floorType, label]
const ROOMS = [
  // Business wing (top half)
  { id: 'finance', x: 1, y: 1, w: 12, h: 8, floor: 'floorWood', label: 'Finance', color: '#16a34a',
    query: 'Show me P&L summary and financial health' },
  { id: 'marketing', x: 14, y: 1, w: 12, h: 8, floor: 'floorCarpet', label: 'Marketing', color: '#8b5cf6',
    query: 'How are my ads and email marketing performing?' },
  { id: 'sales', x: 27, y: 1, w: 12, h: 8, floor: 'floorWood', label: 'Sales', color: '#3b82f6',
    query: 'Sales overview — orders, revenue, refunds' },
  { id: 'warehouse', x: 40, y: 1, w: 11, h: 8, floor: 'floorTile', label: 'Warehouse', color: '#dc2626',
    query: 'Show inventory levels and best sellers' },
  // Personal wing (bottom half)
  { id: 'homeoffice', x: 1, y: 18, w: 16, h: 8, floor: 'floorWood', label: 'Home Office', color: '#ea580c',
    query: 'What are my personal bank balances?' },
  { id: 'living', x: 18, y: 18, w: 16, h: 8, floor: 'floorCarpet', label: 'Living Room', color: '#db2777',
    query: 'Break down personal spending by category' },
  { id: 'bedroom', x: 35, y: 18, w: 16, h: 8, floor: 'floorWood', label: 'Bedroom', color: '#7c3aed',
    query: 'Show me everything — life and business total' },
]

const AGENTS = [
  { id: 'fin', name: 'Finance', color: [22, 163, 106], room: 'finance', msgs: ['Calculating EBITDA...', 'Filing P&L...', 'Margins healthy'] },
  { id: 'mkt', name: 'Marketing', color: [139, 92, 246], room: 'marketing', msgs: ['Checking ROAS...', 'Reviewing Klaviyo...', 'Ads performing'] },
  { id: 'sales', name: 'Sales', color: [59, 130, 246], room: 'sales', msgs: ['New order!', 'Scanning refunds...', 'AOV trending up'] },
  { id: 'prod', name: 'Products', color: [220, 38, 38], room: 'warehouse', msgs: ['Counting stock...', 'All items stocked', 'COGS updated'] },
  { id: 'personal', name: 'Personal', color: [234, 88, 12], room: 'homeoffice', msgs: ['Checking banks...', 'Halifax reviewed', 'Categorising spend'] },
  { id: 'life', name: 'Life', color: [219, 39, 119], room: 'living', msgs: ['Relaxing...', 'Budgets ok', 'Expenses tracked'] },
]

function drawOffice(ctx) {
  const w = COLS * TILE, h = ROWS * TILE
  // Clear
  ctx.fillStyle = PALETTE.grass[0]
  ctx.fillRect(0, 0, w, h)

  // Grass texture
  for (let x = 0; x < w; x += TILE) {
    for (let y = 0; y < h; y += TILE) {
      ctx.fillStyle = PALETTE.grass[(x + y * 3) % 3]
      ctx.fillRect(x, y, TILE, TILE)
      // grass blades
      if (Math.random() > 0.7) {
        ctx.fillStyle = PALETTE.grass[2]
        ctx.fillRect(x + 4, y + 2, 2, 4)
      }
    }
  }

  // Path between wings
  for (let y = 0; y < h; y += TILE) {
    ctx.fillStyle = PALETTE.path[(y / TILE) % 2]
    ctx.fillRect(0, 9 * TILE, w, 9 * TILE)
  }
  // Path texture
  for (let x = 0; x < w; x += TILE) {
    for (let py = 9; py < 18; py++) {
      ctx.fillStyle = PALETTE.path[(x / TILE + py) % 2]
      ctx.fillRect(x, py * TILE, TILE, TILE)
    }
  }

  // Labels
  ctx.fillStyle = 'rgba(0,0,0,0.3)'
  ctx.font = 'bold 10px monospace'
  ctx.fillText('BUSINESS WING', 18 * TILE, 10.5 * TILE)
  ctx.fillText('PERSONAL WING', 18 * TILE, 17 * TILE)

  // Draw rooms
  ROOMS.forEach(room => {
    const rx = room.x * TILE, ry = room.y * TILE
    const rw = room.w * TILE, rh = room.h * TILE

    // Floor
    for (let x = 0; x < room.w; x++) {
      for (let y = 0; y < room.h; y++) {
        const colors = PALETTE[room.floor]
        ctx.fillStyle = colors[(x + y) % colors.length]
        ctx.fillRect(rx + x * TILE, ry + y * TILE, TILE, TILE)
      }
    }

    // Walls (top and left)
    ctx.fillStyle = PALETTE.wallTop
    ctx.fillRect(rx, ry - 4, rw, 4)
    ctx.fillStyle = PALETTE.wallFront
    ctx.fillRect(rx, ry, rw, 3)
    ctx.fillStyle = PALETTE.wallDark
    ctx.fillRect(rx - 3, ry - 4, 3, rh + 4)
    ctx.fillRect(rx + rw, ry - 4, 3, rh + 4)

    // Room label
    ctx.fillStyle = 'rgba(255,255,255,0.9)'
    ctx.fillRect(rx + rw / 2 - 30, ry + 4, 60, 12)
    ctx.fillStyle = room.color
    ctx.font = 'bold 8px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(room.label, rx + rw / 2, ry + 13)
    ctx.textAlign = 'start'
  })

  // ── Furniture ──

  // Finance: desk + filing cabinet
  drawDesk(ctx, 3, 4)
  drawMonitor(ctx, 3, 3, PALETTE.screenGreen)
  drawChair(ctx, 3, 6)
  drawFileCabinet(ctx, 9, 2)
  drawPlant(ctx, 11, 2)

  // Marketing: pinboard + desk
  drawDesk(ctx, 17, 4)
  drawMonitor(ctx, 17, 3, PALETTE.screenBlue)
  drawChair(ctx, 17, 6)
  drawPinboard(ctx, 22, 2, 3)
  drawPlant(ctx, 15, 7)

  // Sales: dual monitors + boxes
  drawDesk(ctx, 30, 4)
  drawMonitor(ctx, 29, 3, PALETTE.screenBlue)
  drawMonitor(ctx, 31, 3, PALETTE.screenBlue)
  drawChair(ctx, 30, 6)
  drawBox(ctx, 36, 6)
  drawBox(ctx, 37, 7)

  // Warehouse: shelves
  drawShelf(ctx, 42, 2, 4)
  drawShelf(ctx, 42, 5, 4)
  drawShelf(ctx, 47, 2, 3)
  drawBox(ctx, 48, 7)
  drawBox(ctx, 49, 7)

  // Home office: desk + bookshelf
  drawDesk(ctx, 5, 21)
  drawMonitor(ctx, 5, 20, PALETTE.screenOrange)
  drawChair(ctx, 5, 23)
  drawBookshelf(ctx, 12, 19, 4)
  drawPlant(ctx, 2, 24)
  drawLamp(ctx, 8, 19)

  // Living room: sofa + TV + rug + table
  drawSofa(ctx, 22, 22)
  drawTV(ctx, 22, 19)
  drawRug(ctx, 21, 23, 6, 2)
  drawTable(ctx, 24, 24)
  drawPlant(ctx, 32, 19)
  drawLamp(ctx, 19, 19)

  // Bedroom: bed + wardrobe
  drawBed(ctx, 39, 20)
  drawWardrobe(ctx, 47, 19)
  drawLamp(ctx, 44, 19)
  drawRug(ctx, 38, 24, 4, 1)
  drawPlant(ctx, 49, 24)

  // Trees on the path
  drawTree(ctx, 5, 11)
  drawTree(ctx, 15, 13)
  drawTree(ctx, 25, 11)
  drawTree(ctx, 35, 13)
  drawTree(ctx, 45, 11)
  drawTree(ctx, 10, 15)
  drawTree(ctx, 30, 15)
  drawTree(ctx, 42, 15)
}

// ── Furniture draw helpers ──
function drawDesk(ctx, x, y) {
  ctx.fillStyle = PALETTE.desk; ctx.fillRect(x * TILE, y * TILE, TILE * 3, TILE)
  ctx.fillStyle = PALETTE.deskTop; ctx.fillRect(x * TILE, y * TILE - 2, TILE * 3, 2)
  ctx.fillStyle = PALETTE.wallDark; ctx.fillRect(x * TILE + 2, y * TILE + TILE, 4, TILE - 2)
  ctx.fillRect((x + 2) * TILE + 10, y * TILE + TILE, 4, TILE - 2)
}
function drawMonitor(ctx, x, y, screenColor) {
  ctx.fillStyle = PALETTE.monitor; ctx.fillRect(x * TILE + 3, y * TILE + 4, TILE - 6, TILE - 4)
  ctx.fillStyle = screenColor; ctx.fillRect(x * TILE + 5, y * TILE + 6, TILE - 10, TILE - 8)
  ctx.fillStyle = PALETTE.monitor; ctx.fillRect(x * TILE + 6, y * TILE + TILE, 4, 3)
}
function drawChair(ctx, x, y) {
  ctx.fillStyle = PALETTE.chair; ctx.fillRect(x * TILE + 3, y * TILE + 2, TILE - 6, TILE - 4)
  ctx.fillStyle = '#555'; ctx.fillRect(x * TILE + 4, y * TILE, TILE - 8, 4)
}
function drawFileCabinet(ctx, x, y) {
  ctx.fillStyle = '#888'; ctx.fillRect(x * TILE, y * TILE, TILE, TILE * 2)
  ctx.fillStyle = '#999'; ctx.fillRect(x * TILE + 2, y * TILE + 2, TILE - 4, TILE - 4)
  ctx.fillRect(x * TILE + 2, y * TILE + TILE + 2, TILE - 4, TILE - 4)
  ctx.fillStyle = '#bbb'; ctx.fillRect(x * TILE + 6, y * TILE + 6, 4, 2)
  ctx.fillRect(x * TILE + 6, y * TILE + TILE + 6, 4, 2)
}
function drawPlant(ctx, x, y) {
  ctx.fillStyle = PALETTE.pot; ctx.fillRect(x * TILE + 4, y * TILE + 8, 8, 8)
  ctx.fillStyle = PALETTE.plant; ctx.fillRect(x * TILE + 2, y * TILE, 12, 10)
  ctx.fillStyle = PALETTE.plantDark; ctx.fillRect(x * TILE + 4, y * TILE + 2, 4, 6)
}
function drawShelf(ctx, x, y, w) {
  for (let i = 0; i < w; i++) {
    ctx.fillStyle = PALETTE.shelf; ctx.fillRect((x + i) * TILE, y * TILE, TILE, TILE * 2)
    ctx.fillStyle = PALETTE.bookColors[i % 6]; ctx.fillRect((x + i) * TILE + 2, y * TILE + 2, 5, TILE - 4)
    ctx.fillStyle = PALETTE.bookColors[(i + 3) % 6]; ctx.fillRect((x + i) * TILE + 8, y * TILE + 2, 5, TILE - 4)
    ctx.fillStyle = PALETTE.bookColors[(i + 1) % 6]; ctx.fillRect((x + i) * TILE + 2, y * TILE + TILE + 2, 5, TILE - 4)
    ctx.fillStyle = PALETTE.bookColors[(i + 4) % 6]; ctx.fillRect((x + i) * TILE + 8, y * TILE + TILE + 2, 5, TILE - 4)
  }
}
function drawBox(ctx, x, y) {
  ctx.fillStyle = '#c4a06a'; ctx.fillRect(x * TILE + 2, y * TILE + 2, TILE - 4, TILE - 4)
  ctx.fillStyle = '#a08050'; ctx.fillRect(x * TILE + 6, y * TILE + 2, 2, TILE - 4)
  ctx.fillRect(x * TILE + 2, y * TILE + 6, TILE - 4, 2)
}
function drawPinboard(ctx, x, y, w) {
  ctx.fillStyle = '#c4956a'; ctx.fillRect(x * TILE, y * TILE, w * TILE, TILE * 2)
  const colors = ['#ff6b6b', '#6bbbff', '#ffbb6b', '#6bff6b', '#ff6bff']
  for (let i = 0; i < w * 2; i++) {
    ctx.fillStyle = colors[i % 5]; ctx.fillRect(x * TILE + 4 + (i % (w * 2)) * 7, y * TILE + 3 + Math.floor(i / w) * 10, 6, 8)
  }
}
function drawSofa(ctx, x, y) {
  ctx.fillStyle = PALETTE.sofa; ctx.fillRect(x * TILE, y * TILE + 4, TILE * 4, TILE + 8)
  ctx.fillStyle = PALETTE.sofaLight; ctx.fillRect(x * TILE, y * TILE, TILE * 4, 8)
  ctx.fillRect(x * TILE - 4, y * TILE, 6, TILE + 12)
  ctx.fillRect(x * TILE + TILE * 4 - 2, y * TILE, 6, TILE + 12)
}
function drawTV(ctx, x, y) {
  ctx.fillStyle = PALETTE.tv; ctx.fillRect(x * TILE, y * TILE + 2, TILE * 4, TILE - 2)
  ctx.fillStyle = PALETTE.tvScreen; ctx.fillRect(x * TILE + 3, y * TILE + 4, TILE * 4 - 6, TILE - 6)
}
function drawRug(ctx, x, y, w, h) {
  ctx.fillStyle = PALETTE.rug; ctx.fillRect(x * TILE, y * TILE, w * TILE, h * TILE)
  ctx.fillStyle = PALETTE.rugLight; ctx.fillRect(x * TILE + 4, y * TILE + 4, w * TILE - 8, h * TILE - 8)
}
function drawTable(ctx, x, y) {
  ctx.fillStyle = PALETTE.desk; ctx.fillRect(x * TILE + 2, y * TILE + 2, TILE - 4, TILE - 4)
  ctx.fillStyle = PALETTE.deskTop; ctx.fillRect(x * TILE + 2, y * TILE + 2, TILE - 4, 2)
}
function drawBed(ctx, x, y) {
  ctx.fillStyle = PALETTE.bed; ctx.fillRect(x * TILE, y * TILE, TILE * 3, TILE * 4)
  ctx.fillStyle = PALETTE.bedSheet; ctx.fillRect(x * TILE + 2, y * TILE + 2, TILE * 3 - 4, TILE * 2)
  ctx.fillStyle = '#fff'; ctx.fillRect(x * TILE + 4, y * TILE + 4, TILE - 2, TILE - 4)
  ctx.fillRect(x * TILE + TILE + 6, y * TILE + 4, TILE - 2, TILE - 4)
}
function drawWardrobe(ctx, x, y) {
  ctx.fillStyle = '#6b5a42'; ctx.fillRect(x * TILE, y * TILE, TILE * 2, TILE * 3)
  ctx.fillStyle = '#7a6a52'; ctx.fillRect(x * TILE + 2, y * TILE + 2, TILE - 2, TILE * 3 - 4)
  ctx.fillRect(x * TILE + TILE, y * TILE + 2, TILE - 2, TILE * 3 - 4)
  ctx.fillStyle = '#bbb'; ctx.fillRect(x * TILE + TILE - 1, y * TILE + TILE + 4, 2, 4)
}
function drawLamp(ctx, x, y) {
  ctx.fillStyle = '#444'; ctx.fillRect(x * TILE + 6, y * TILE + 8, 4, 8)
  ctx.fillStyle = PALETTE.lamp; ctx.fillRect(x * TILE + 2, y * TILE + 2, 12, 8)
  ctx.fillStyle = '#ffe066'; ctx.fillRect(x * TILE + 4, y * TILE + 4, 8, 4)
}
function drawTree(ctx, x, y) {
  ctx.fillStyle = '#5a3a1a'; ctx.fillRect(x * TILE + 5, y * TILE + 10, 6, 6)
  ctx.fillStyle = '#2d8a2d'; ctx.fillRect(x * TILE, y * TILE, TILE, 12)
  ctx.fillStyle = '#228822'; ctx.fillRect(x * TILE + 2, y * TILE - 4, TILE - 4, 8)
  ctx.fillStyle = '#1a7a1a'; ctx.fillRect(x * TILE + 4, y * TILE + 2, 4, 6)
}

// ── Agent sprite on canvas ──
function drawAgent(ctx, agent, x, y, frame, isBobbing) {
  const [r, g, b] = agent.color
  const color = `rgb(${r},${g},${b})`
  const light = `rgb(${Math.min(r + 60, 255)},${Math.min(g + 60, 255)},${Math.min(b + 60, 255)})`
  const dark = `rgb(${Math.max(r - 40, 0)},${Math.max(g - 40, 0)},${Math.max(b - 40, 0)})`

  const bobY = isBobbing ? Math.sin(frame * 0.3) * 1.5 : 0
  const py = y + bobY

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.15)'
  ctx.beginPath(); ctx.ellipse(x, y + 14, 7, 3, 0, 0, Math.PI * 2); ctx.fill()

  // Legs
  const legOff = isBobbing ? Math.sin(frame * 0.5) * 2 : 0
  ctx.fillStyle = dark
  ctx.fillRect(x - 4, py + 6 - legOff, 3, 6)
  ctx.fillRect(x + 1, py + 6 + legOff, 3, 6)

  // Body
  ctx.fillStyle = color
  ctx.fillRect(x - 6, py - 6, 12, 13)
  ctx.fillStyle = light
  ctx.fillRect(x - 4, py - 5, 4, 5)

  // Head
  ctx.fillStyle = color
  ctx.fillRect(x - 6, py - 16, 12, 11)
  ctx.fillStyle = light
  ctx.fillRect(x - 4, py - 14, 3, 3)

  // Eyes
  ctx.fillStyle = '#111'
  ctx.fillRect(x - 4, py - 13, 3, 3)
  ctx.fillRect(x + 1, py - 13, 3, 3)
  ctx.fillStyle = '#fff'
  ctx.fillRect(x - 3, py - 12, 1, 1)
  ctx.fillRect(x + 2, py - 12, 1, 1)

  // Antenna
  ctx.fillStyle = color
  ctx.fillRect(x - 1, py - 20, 2, 5)
  ctx.fillStyle = isBobbing ? '#ffdd44' : color
  ctx.fillRect(x - 2, py - 23, 4, 4)
}

export default function AgentOffice({ onAsk }) {
  const canvasRef = useRef(null)
  const [agents, setAgents] = useState({})
  const [bubbles, setBubbles] = useState({})
  const [logs, setLogs] = useState([])
  const [actives, setActives] = useState({})
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [frame, setFrame] = useState(0)
  const logRef = useRef(null)

  // Init agents
  useEffect(() => {
    const init = {}
    AGENTS.forEach(a => {
      const room = ROOMS.find(r => r.id === a.room)
      if (room) init[a.id] = { x: (room.x + room.w / 2) * TILE, y: (room.y + room.h / 2) * TILE }
    })
    setAgents(init)
  }, [])

  // Agent behaviour loop
  useEffect(() => {
    const timers = []
    AGENTS.forEach((agent, i) => {
      const act = () => {
        const room = ROOMS.find(r => r.id === agent.room)
        if (!room) return
        const nx = (room.x + 2 + Math.random() * (room.w - 4)) * TILE
        const ny = (room.y + 2 + Math.random() * (room.h - 3)) * TILE
        setAgents(prev => ({ ...prev, [agent.id]: { x: nx, y: ny } }))
        setActives(prev => ({ ...prev, [agent.id]: true }))
        const msg = agent.msgs[Math.floor(Math.random() * agent.msgs.length)]
        timers.push(setTimeout(() => {
          setBubbles(prev => ({ ...prev, [agent.id]: msg }))
          const time = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
          setLogs(prev => [...prev.slice(-20), { name: agent.name, color: `rgb(${agent.color.join(',')})`, msg, time }])
        }, 1500))
        timers.push(setTimeout(() => {
          setBubbles(prev => ({ ...prev, [agent.id]: null }))
          setActives(prev => ({ ...prev, [agent.id]: false }))
        }, 5000))
      }
      timers.push(setTimeout(() => { act(); timers.push(setInterval(act, 7000 + i * 1100)) }, i * 1200))
    })
    return () => timers.forEach(t => { clearTimeout(t); clearInterval(t) })
  }, [])

  // Animation frame
  useEffect(() => {
    const interval = setInterval(() => setFrame(f => f + 1), 100)
    return () => clearInterval(interval)
  }, [])

  // Render canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.imageSmoothingEnabled = false

    drawOffice(ctx)

    // Draw agents
    AGENTS.forEach(agent => {
      const pos = agents[agent.id]
      if (!pos) return
      drawAgent(ctx, agent, pos.x, pos.y, frame, !!actives[agent.id])

      // Bubble
      const bubble = bubbles[agent.id]
      if (bubble) {
        const bw = ctx.measureText(bubble).width + 12
        ctx.fillStyle = 'rgba(255,255,255,0.95)'
        ctx.fillRect(pos.x - bw / 2, pos.y - 38, bw, 14)
        ctx.strokeStyle = '#ccc'
        ctx.strokeRect(pos.x - bw / 2, pos.y - 38, bw, 14)
        ctx.fillStyle = '#333'
        ctx.font = '8px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(bubble, pos.x, pos.y - 28)
        ctx.textAlign = 'start'
        // Triangle
        ctx.fillStyle = 'rgba(255,255,255,0.95)'
        ctx.beginPath(); ctx.moveTo(pos.x - 3, pos.y - 24); ctx.lineTo(pos.x + 3, pos.y - 24); ctx.lineTo(pos.x, pos.y - 20); ctx.fill()
      }
    })
  }, [agents, bubbles, actives, frame])

  // Click handler
  const handleClick = useCallback((e) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const mx = (e.clientX - rect.left) * scaleX
    const my = (e.clientY - rect.top) * scaleX

    // Check if clicked on agent
    for (const agent of AGENTS) {
      const pos = agents[agent.id]
      if (!pos) continue
      if (Math.abs(mx - pos.x) < 10 && Math.abs(my - pos.y) < 20) {
        const room = ROOMS.find(r => r.id === agent.room)
        if (room) onAsk(room.query)
        return
      }
    }

    // Check if clicked on room
    for (const room of ROOMS) {
      if (mx >= room.x * TILE && mx <= (room.x + room.w) * TILE && my >= room.y * TILE && my <= (room.y + room.h) * TILE) {
        setSelectedRoom(selectedRoom === room.id ? null : room.id)
        return
      }
    }
    setSelectedRoom(null)
  }, [agents, selectedRoom, onAsk])

  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight }, [logs])

  const selected = ROOMS.find(r => r.id === selectedRoom)

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-gray-800">Flair HQ</h2>
        <span className="text-xs text-gray-400">Click a room or agent</span>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 min-w-0">
          <div className="rounded-2xl border border-gray-200 overflow-hidden shadow-sm mb-3 bg-black">
            <canvas
              ref={canvasRef}
              width={COLS * TILE}
              height={ROWS * TILE}
              onClick={handleClick}
              className="w-full cursor-pointer"
              style={{ imageRendering: 'pixelated' }}
            />
          </div>

          {selected && (
            <div className="rounded-xl border-2 bg-white overflow-hidden shadow-sm mb-3" style={{ borderColor: selected.color + '40' }}>
              <div className="px-4 py-2.5 flex items-center justify-between" style={{ backgroundColor: selected.color + '10' }}>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: selected.color }} />
                  <span className="text-sm font-semibold text-gray-800">{selected.label}</span>
                </div>
                <button onClick={() => setSelectedRoom(null)} className="text-gray-400 hover:text-gray-600">×</button>
              </div>
              <div className="px-4 py-2.5">
                <button onClick={() => onAsk(selected.query)}
                  className="px-4 py-2 rounded-lg text-sm font-medium border transition-all hover:shadow-sm"
                  style={{ borderColor: selected.color + '40', color: selected.color }}>
                  Ask Jarvis about {selected.label}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="w-72 flex-shrink-0">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="text-sm font-semibold text-gray-700">Activity Feed</h3>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 font-medium">Live</span>
          </div>
          <div ref={logRef} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-y-auto" style={{ height: '400px' }}>
            {logs.length === 0 ? (
              <p className="text-sm text-gray-400 p-4">Agents arriving...</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {[...logs].reverse().map((log, i) => (
                  <div key={i} className="px-3.5 py-2.5 hover:bg-gray-50">
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
