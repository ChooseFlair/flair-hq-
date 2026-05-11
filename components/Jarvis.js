import { useState, useRef, useEffect } from 'react'

const SUGGESTIONS = [
  'How are sales doing this week?',
  'Show me my top customers',
  "What's my ROAS looking like?",
  'How are my Klaviyo flows performing?',
  'Give me a full business overview',
  'What should I focus on today?',
]

function Markdown({ text }) {
  const lines = text.split('\n')
  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        if (line.startsWith('### ')) return <h3 key={i} className="text-sm font-bold text-cyan-200 mt-2">{line.slice(4)}</h3>
        if (line.startsWith('## ')) return <h2 key={i} className="text-base font-bold text-cyan-100 mt-2">{line.slice(3)}</h2>
        if (line.startsWith('# ')) return <h1 key={i} className="text-lg font-bold text-white mt-2">{line.slice(2)}</h1>
        if (line.startsWith('**') && line.endsWith('**')) return <p key={i} className="font-semibold text-cyan-100">{line.slice(2, -2)}</p>
        if (line.startsWith('- ') || line.startsWith('* ')) return <li key={i} className="ml-4 text-cyan-100/80 text-sm">{formatInline(line.slice(2))}</li>
        if (line.match(/^\d+\.\s/)) return <li key={i} className="ml-4 text-cyan-100/80 text-sm list-decimal">{formatInline(line.replace(/^\d+\.\s/, ''))}</li>
        if (line.trim() === '') return <div key={i} className="h-1" />
        if (line.startsWith('```')) return null
        return <p key={i} className="text-cyan-100/80 text-sm leading-relaxed">{formatInline(line)}</p>
      })}
    </div>
  )
}

function formatInline(text) {
  return text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`|£[\d,.]+)/).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i} className="text-cyan-200 font-semibold">{part.slice(2, -2)}</strong>
    if (part.startsWith('*') && part.endsWith('*')) return <em key={i} className="text-cyan-300">{part.slice(1, -1)}</em>
    if (part.startsWith('`') && part.endsWith('`')) return <code key={i} className="bg-cyan-500/10 px-1 py-0.5 rounded text-cyan-300 text-xs">{part.slice(1, -1)}</code>
    if (part.startsWith('£')) return <span key={i} className="text-emerald-400 font-bold">{part}</span>
    return part
  })
}

function HudRings({ active }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
      <svg viewBox="0 0 800 800" className="w-[700px] h-[700px] opacity-60" style={{ filter: 'drop-shadow(0 0 20px rgba(0, 255, 255, 0.15))' }}>
        {/* Outer ring - slow rotate */}
        <g className={active ? 'hud-spin-fast' : 'hud-spin-slow'}>
          <circle cx="400" cy="400" r="350" fill="none" stroke="rgba(0,220,255,0.15)" strokeWidth="1" />
          <path d="M 400 50 A 350 350 0 0 1 750 400" fill="none" stroke="rgba(0,220,255,0.5)" strokeWidth="2" strokeLinecap="round" />
          <path d="M 400 750 A 350 350 0 0 1 50 400" fill="none" stroke="rgba(0,220,255,0.3)" strokeWidth="1.5" strokeLinecap="round" />
          {/* Tick marks outer */}
          {Array.from({ length: 72 }).map((_, j) => {
            const angle = (j * 5 * Math.PI) / 180
            const r1 = 345, r2 = j % 6 === 0 ? 335 : 340
            return <line key={j} x1={400 + r1 * Math.cos(angle)} y1={400 + r1 * Math.sin(angle)} x2={400 + r2 * Math.cos(angle)} y2={400 + r2 * Math.sin(angle)} stroke={j % 6 === 0 ? 'rgba(0,220,255,0.6)' : 'rgba(0,220,255,0.2)'} strokeWidth={j % 6 === 0 ? 1.5 : 0.5} />
          })}
        </g>

        {/* Middle ring - counter rotate */}
        <g className={active ? 'hud-spin-counter-fast' : 'hud-spin-counter'}>
          <circle cx="400" cy="400" r="280" fill="none" stroke="rgba(0,220,255,0.1)" strokeWidth="1" />
          <path d="M 400 120 A 280 280 0 0 1 680 400" fill="none" stroke="rgba(0,220,255,0.4)" strokeWidth="2" strokeDasharray="8 4" strokeLinecap="round" />
          <path d="M 120 400 A 280 280 0 0 1 400 120" fill="none" stroke="rgba(0,220,255,0.25)" strokeWidth="1.5" strokeDasharray="12 6" strokeLinecap="round" />
          {/* Dots around middle ring */}
          {Array.from({ length: 48 }).map((_, j) => {
            const angle = (j * 7.5 * Math.PI) / 180
            return <circle key={j} cx={400 + 280 * Math.cos(angle)} cy={400 + 280 * Math.sin(angle)} r={j % 4 === 0 ? 2.5 : 1} fill={j % 4 === 0 ? 'rgba(0,220,255,0.6)' : 'rgba(0,220,255,0.2)'} />
          })}
        </g>

        {/* Inner ring - faster */}
        <g className={active ? 'hud-spin-inner-fast' : 'hud-spin-inner'}>
          <circle cx="400" cy="400" r="200" fill="none" stroke="rgba(0,220,255,0.08)" strokeWidth="1" />
          <path d="M 600 400 A 200 200 0 0 1 400 600" fill="none" stroke="rgba(0,220,255,0.5)" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M 200 400 A 200 200 0 0 1 400 200" fill="none" stroke="rgba(0,220,255,0.35)" strokeWidth="2" strokeLinecap="round" />
          <path d="M 400 200 A 200 200 0 0 1 600 400" fill="none" stroke="rgba(0,220,255,0.15)" strokeWidth="1" strokeDasharray="4 8" strokeLinecap="round" />
        </g>

        {/* Core ring */}
        <g className={active ? 'hud-pulse-fast' : 'hud-pulse'}>
          <circle cx="400" cy="400" r="120" fill="none" stroke="rgba(0,220,255,0.2)" strokeWidth="1" />
          <circle cx="400" cy="400" r="115" fill="none" stroke="rgba(0,220,255,0.08)" strokeWidth="8" />
          {Array.from({ length: 24 }).map((_, j) => {
            const angle = (j * 15 * Math.PI) / 180
            return <line key={j} x1={400 + 112 * Math.cos(angle)} y1={400 + 112 * Math.sin(angle)} x2={400 + 120 * Math.cos(angle)} y2={400 + 120 * Math.sin(angle)} stroke="rgba(0,220,255,0.3)" strokeWidth="1" />
          })}
        </g>

        {/* Center glow */}
        <circle cx="400" cy="400" r="60" fill="url(#centerGlow)" className={active ? 'hud-pulse-fast' : 'hud-pulse'} />
        <circle cx="400" cy="400" r="4" fill="rgba(0,220,255,0.8)" />

        <defs>
          <radialGradient id="centerGlow">
            <stop offset="0%" stopColor="rgba(0,220,255,0.08)" />
            <stop offset="100%" stopColor="rgba(0,220,255,0)" />
          </radialGradient>
        </defs>
      </svg>
    </div>
  )
}

export default function Jarvis() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, loading])

  useEffect(() => { inputRef.current?.focus() }, [])

  async function send(text) {
    const msg = text || input.trim()
    if (!msg || loading) return
    setMessages(prev => [...prev, { role: 'user', content: msg }])
    setInput('')
    setLoading(true)
    try {
      const res = await fetch('/api/jarvis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, history: messages.slice(-10) }),
      })
      const json = await res.json()
      if (!res.ok || json.error) {
        setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${json.error || 'Unknown'}`, error: true }])
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: json.response, tools: json.tools_used || [] }])
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Connection error: ${e.message}`, error: true }])
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const hasMessages = messages.length > 0

  return (
    <div className="h-screen flex flex-col bg-black overflow-hidden relative">
      <style jsx global>{`
        @keyframes hudSpinSlow { from { transform: rotate(0deg); transform-origin: 400px 400px; } to { transform: rotate(360deg); transform-origin: 400px 400px; } }
        @keyframes hudSpinCounter { from { transform: rotate(360deg); transform-origin: 400px 400px; } to { transform: rotate(0deg); transform-origin: 400px 400px; } }
        @keyframes hudPulse { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }
        .hud-spin-slow { animation: hudSpinSlow 60s linear infinite; }
        .hud-spin-fast { animation: hudSpinSlow 8s linear infinite; }
        .hud-spin-counter { animation: hudSpinCounter 45s linear infinite; }
        .hud-spin-counter-fast { animation: hudSpinCounter 6s linear infinite; }
        .hud-spin-inner { animation: hudSpinSlow 30s linear infinite; }
        .hud-spin-inner-fast { animation: hudSpinSlow 4s linear infinite; }
        .hud-pulse { animation: hudPulse 4s ease-in-out infinite; }
        .hud-pulse-fast { animation: hudPulse 1.2s ease-in-out infinite; }
        .jarvis-scrollbar::-webkit-scrollbar { width: 4px; }
        .jarvis-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .jarvis-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,220,255,0.2); border-radius: 4px; }
        .jarvis-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0,220,255,0.4); }
        @keyframes scanline { 0% { transform: translateY(-100%); } 100% { transform: translateY(100vh); } }
        .scanline { animation: scanline 8s linear infinite; }
      `}</style>

      {/* Scanline effect */}
      <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden opacity-[0.03]">
        <div className="scanline w-full h-[2px] bg-cyan-400" />
      </div>

      {/* Vignette */}
      <div className="absolute inset-0 pointer-events-none z-40" style={{ background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.6) 100%)' }} />

      {/* HUD Rings Background */}
      <div className={`transition-all duration-1000 ${hasMessages ? 'opacity-20 scale-75' : 'opacity-100 scale-100'}`}>
        <HudRings active={loading} />
      </div>

      {/* Top bar */}
      <div className="relative z-20 px-6 py-3 flex items-center justify-between border-b border-cyan-500/10">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className={`w-8 h-8 rounded-full border ${loading ? 'border-cyan-400 shadow-lg shadow-cyan-400/30' : 'border-cyan-500/30'} flex items-center justify-center transition-all duration-500`}>
              <div className={`w-2 h-2 rounded-full ${loading ? 'bg-cyan-400 animate-ping' : 'bg-cyan-500/60'}`} />
            </div>
          </div>
          <div>
            <h1 className="text-cyan-300 font-mono text-sm tracking-[0.3em] uppercase">Jarvis</h1>
            <p className="text-cyan-500/40 text-[10px] font-mono tracking-widest">FLAIR HQ SYSTEM v2.0</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-[10px] font-mono text-cyan-500/30 tracking-wider">
          <span className="hidden sm:block">SHOPIFY</span>
          <span className="hidden sm:block">KLAVIYO</span>
          <span className="hidden sm:block">META</span>
          <span className="hidden sm:block">WINDSOR</span>
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${loading ? 'bg-cyan-400 animate-pulse' : 'bg-emerald-500/60'}`} />
            <span className={loading ? 'text-cyan-400' : 'text-emerald-500/40'}>{loading ? 'PROCESSING' : 'ONLINE'}</span>
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto relative z-20 jarvis-scrollbar">
        {!hasMessages ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="relative mb-8">
              <h2 className="text-2xl font-mono text-cyan-300/90 tracking-[0.2em] uppercase mb-2">Systems Online</h2>
              <p className="text-cyan-500/40 text-sm font-mono max-w-md">All data connectors active. Ready to analyse your business, Karl.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 max-w-lg w-full">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => send(s)}
                  className="group text-left px-4 py-3 rounded border border-cyan-500/10 hover:border-cyan-400/40 bg-cyan-500/[0.02] hover:bg-cyan-500/[0.06] text-cyan-400/60 hover:text-cyan-300 text-xs font-mono transition-all duration-300"
                >
                  <span className="text-cyan-500/20 group-hover:text-cyan-400/40 mr-1 transition-colors">&gt;</span>
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="px-6 py-4 space-y-4 max-w-4xl mx-auto">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] ${msg.role === 'user'
                  ? 'bg-cyan-500/10 border border-cyan-500/20 rounded-lg rounded-br-none px-4 py-2.5'
                  : 'bg-white/[0.02] border border-cyan-500/10 rounded-lg rounded-bl-none px-4 py-3'
                }`}>
                  {msg.role === 'user' ? (
                    <p className="text-cyan-200 text-sm font-mono">{msg.content}</p>
                  ) : (
                    <>
                      {msg.error ? (
                        <p className="text-red-400/80 text-sm font-mono">{msg.content}</p>
                      ) : (
                        <Markdown text={msg.content} />
                      )}
                      {msg.tools?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2.5 pt-2.5 border-t border-cyan-500/10">
                          {msg.tools.map((t, j) => (
                            <span key={j} className="text-[9px] px-2 py-0.5 rounded font-mono bg-cyan-500/5 text-cyan-500/50 border border-cyan-500/10">
                              {t.replace('get_', '').replace(/_/g, ' ').toUpperCase()}
                            </span>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-white/[0.02] border border-cyan-500/20 rounded-lg rounded-bl-none px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-cyan-500/40 text-xs font-mono tracking-wider">ANALYSING DATA...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="relative z-20 px-4 py-3 border-t border-cyan-500/10">
        <div className="flex items-end gap-2 max-w-4xl mx-auto">
          <div className="flex-1 border border-cyan-500/15 rounded-lg bg-cyan-500/[0.02] focus-within:border-cyan-400/30 focus-within:bg-cyan-500/[0.04] transition-all duration-300">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="> Ask Jarvis..."
              rows={1}
              className="w-full bg-transparent text-cyan-200 placeholder-cyan-500/20 px-4 py-3 text-sm font-mono resize-none focus:outline-none"
              style={{ maxHeight: '120px' }}
              onInput={e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px' }}
            />
          </div>
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            className={`p-3 rounded-lg border transition-all duration-300 ${
              input.trim() && !loading
                ? 'border-cyan-400/40 bg-cyan-400/10 text-cyan-300 hover:bg-cyan-400/20 hover:shadow-lg hover:shadow-cyan-400/10'
                : 'border-cyan-500/10 bg-transparent text-cyan-500/20'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
