import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import DashboardWidgets from './DashboardWidgets'
import Bookmarks from './Bookmarks'
import Prompts from './Prompts'

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

const ORB_PALETTES = {
  idle:       { core: '34,211,238',  halo: '99,102,241',  accent: '125,211,252' },
  listening:  { core: '34,211,238',  halo: '6,182,212',   accent: '165,243,252' },
  processing: { core: '139,92,246',  halo: '34,211,238',  accent: '196,181,253' },
  speaking:   { core: '168,85,247',  halo: '236,72,153',  accent: '244,114,182' },
}

function JarvisOrb({ state }) {
  const c = ORB_PALETTES[state] || ORB_PALETTES.idle
  const speed = state === 'idle' ? 1 : state === 'listening' ? 2.2 : state === 'speaking' ? 1.8 : 3
  const orbPulseDur = `${(6 / speed).toFixed(2)}s`
  const orbitDur = `${(40 / speed).toFixed(0)}s`
  const morphDur = `${(10 / speed).toFixed(2)}s`

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <svg viewBox="0 0 800 800" className="w-[min(85vmin,820px)] h-[min(85vmin,820px)]" style={{ filter: `drop-shadow(0 0 40px rgba(${c.core},0.35))` }}>
        <defs>
          <radialGradient id="orbGlow">
            <stop offset="0%" stopColor={`rgba(${c.accent},0.95)`} />
            <stop offset="30%" stopColor={`rgba(${c.core},0.55)`} />
            <stop offset="60%" stopColor={`rgba(${c.halo},0.18)`} />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>
          <radialGradient id="orbSurface" cx="40%" cy="35%">
            <stop offset="0%" stopColor={`rgba(${c.accent},0.85)`} />
            <stop offset="40%" stopColor={`rgba(${c.core},0.35)`} />
            <stop offset="80%" stopColor={`rgba(${c.halo},0.45)`} />
            <stop offset="100%" stopColor={`rgba(${c.halo},0.85)`} />
          </radialGradient>
          <radialGradient id="orbHighlight" cx="35%" cy="30%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.5)" />
            <stop offset="40%" stopColor="rgba(255,255,255,0.05)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
          <filter id="orbTurbulence" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="2" seed="3" result="noise">
              <animate attributeName="baseFrequency" values="0.010;0.020;0.013;0.010" dur={morphDur} repeatCount="indefinite" />
            </feTurbulence>
            <feDisplacementMap in="SourceGraphic" in2="noise" scale={state === 'speaking' ? 32 : state === 'listening' ? 24 : 14} />
          </filter>
          <filter id="orbBlur">
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>

        <circle cx="400" cy="400" r="380" fill="url(#orbGlow)" opacity="0.35" />

        <g style={{ transformOrigin: '400px 400px', animation: `orbOrbit ${orbitDur} linear infinite` }}>
          {Array.from({ length: 32 }).map((_, i) => {
            const a = (i / 32) * Math.PI * 2
            const r = 300 + (i % 3) * 8
            const size = i % 4 === 0 ? 3 : i % 2 === 0 ? 1.6 : 0.9
            return <circle key={i} cx={400 + r * Math.cos(a)} cy={400 + r * Math.sin(a)} r={size} fill={`rgba(${c.accent},${i % 4 === 0 ? 0.9 : 0.4})`} />
          })}
        </g>

        <g style={{ transformOrigin: '400px 400px', animation: `orbOrbitReverse ${parseFloat(orbitDur) * 0.65}s linear infinite` }}>
          {Array.from({ length: 18 }).map((_, i) => {
            const a = (i / 18) * Math.PI * 2
            const r = 245
            return <circle key={i} cx={400 + r * Math.cos(a)} cy={400 + r * Math.sin(a)} r={i % 3 === 0 ? 2 : 1} fill={`rgba(${c.core},0.6)`} />
          })}
          <circle cx="400" cy="400" r="245" fill="none" stroke={`rgba(${c.core},0.18)`} strokeWidth="0.8" strokeDasharray="2 14" />
        </g>

        <g style={{ transformOrigin: '400px 400px', animation: `orbOrbit ${parseFloat(orbitDur) * 1.4}s linear infinite` }}>
          <circle cx="400" cy="400" r="200" fill="none" stroke={`rgba(${c.halo},0.25)`} strokeWidth="1" strokeDasharray="1 6" />
          <path d={`M 400 ${400 - 200} A 200 200 0 0 1 ${400 + 200} 400`} fill="none" stroke={`rgba(${c.accent},0.55)`} strokeWidth="2" strokeLinecap="round" />
          <path d={`M 400 ${400 + 200} A 200 200 0 0 1 ${400 - 200} 400`} fill="none" stroke={`rgba(${c.core},0.35)`} strokeWidth="1.5" strokeLinecap="round" />
        </g>

        <g filter="url(#orbTurbulence)" style={{ transformOrigin: '400px 400px', animation: `orbBreathe ${orbPulseDur} ease-in-out infinite` }}>
          <circle cx="400" cy="400" r="155" fill="url(#orbSurface)" />
          <circle cx="400" cy="400" r="155" fill="none" stroke={`rgba(${c.accent},0.7)`} strokeWidth="1.2" />
        </g>

        <circle cx="400" cy="400" r="155" fill="url(#orbHighlight)" style={{ transformOrigin: '400px 400px', animation: `orbBreathe ${orbPulseDur} ease-in-out infinite` }} />

        <circle cx="400" cy="400" r="50" fill={`rgba(${c.accent},0.25)`} filter="url(#orbBlur)" style={{ transformOrigin: '400px 400px', animation: `orbCorePulse ${(parseFloat(orbPulseDur) / 1.8).toFixed(2)}s ease-in-out infinite` }} />
        <circle cx="400" cy="400" r="6" fill={`rgba(255,255,255,0.95)`} style={{ transformOrigin: '400px 400px', animation: `orbCorePulse ${(parseFloat(orbPulseDur) / 1.8).toFixed(2)}s ease-in-out infinite` }} />

        {(state === 'speaking' || state === 'listening') && (
          <g>
            {[0, 1, 2].map(i => (
              <circle
                key={i}
                cx="400"
                cy="400"
                r="160"
                fill="none"
                stroke={`rgba(${c.core},0.5)`}
                strokeWidth="1.5"
                style={{ transformOrigin: '400px 400px', animation: `orbRipple 2.4s ease-out infinite`, animationDelay: `${i * 0.8}s`, opacity: 0 }}
              />
            ))}
          </g>
        )}
      </svg>
    </div>
  )
}

export default function Jarvis() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [listening, setListening] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [voiceOut, setVoiceOut] = useState(false)
  const [interim, setInterim] = useState('')
  const [speechSupported, setSpeechSupported] = useState(false)
  const [bookmarksOpen, setBookmarksOpen] = useState(false)
  const [promptsOpen, setPromptsOpen] = useState(false)
  const scrollRef = useRef(null)
  const inputRef = useRef(null)
  const recogRef = useRef(null)
  const voiceOutRef = useRef(false)

  useEffect(() => { voiceOutRef.current = voiceOut }, [voiceOut])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, loading])

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return
    setSpeechSupported(true)
    const rec = new SR()
    rec.continuous = false
    rec.interimResults = true
    rec.lang = 'en-GB'
    rec.onresult = (event) => {
      let interimText = ''
      let finalText = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript
        if (event.results[i].isFinal) finalText += t
        else interimText += t
      }
      setInterim(interimText)
      if (finalText.trim()) {
        setInterim('')
        send(finalText.trim())
      }
    }
    rec.onerror = () => { setListening(false); setInterim('') }
    rec.onend = () => { setListening(false); setInterim('') }
    recogRef.current = rec
    return () => { try { rec.abort() } catch {} }
  }, [])

  function speak(text) {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const clean = text
      .replace(/```[\s\S]*?```/g, '')
      .replace(/[*_#`>]/g, '')
      .replace(/\n+/g, '. ')
      .replace(/\s+/g, ' ')
      .trim()
    if (!clean) return
    const utter = new SpeechSynthesisUtterance(clean)
    utter.rate = 1.05
    utter.pitch = 0.95
    const voices = window.speechSynthesis.getVoices()
    const pick =
      voices.find(v => /en-GB/i.test(v.lang) && /male|daniel|oliver/i.test(v.name)) ||
      voices.find(v => /Google UK English Male/i.test(v.name)) ||
      voices.find(v => /en-GB/i.test(v.lang)) ||
      voices.find(v => /en-US/i.test(v.lang))
    if (pick) utter.voice = pick
    utter.onstart = () => setSpeaking(true)
    utter.onend = () => setSpeaking(false)
    utter.onerror = () => setSpeaking(false)
    window.speechSynthesis.speak(utter)
  }

  function toggleMic() {
    if (!recogRef.current) return
    if (listening) {
      try { recogRef.current.stop() } catch {}
      setListening(false)
      return
    }
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel()
    setSpeaking(false)
    try {
      recogRef.current.start()
      setListening(true)
    } catch {}
  }

  async function send(text) {
    const msg = text || input.trim()
    if (!msg || loading) return
    setMessages(prev => [...prev, { role: 'user', content: msg }])
    setInput('')
    setInterim('')
    setListening(false)
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
        if (voiceOutRef.current) speak(json.response)
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
  const active = loading || listening || speaking

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 5) return 'Working late, Karl'
    if (h < 12) return 'Good morning, Karl'
    if (h < 17) return 'Good afternoon, Karl'
    if (h < 22) return 'Good evening, Karl'
    return 'Burning the midnight oil, Karl'
  })()

  return (
    <div className="h-screen flex flex-col bg-black overflow-hidden relative">
      <style jsx global>{`
        @keyframes orbOrbit { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes orbOrbitReverse { from { transform: rotate(360deg); } to { transform: rotate(0deg); } }
        @keyframes orbBreathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }
        @keyframes orbCorePulse {
          0%, 100% { transform: scale(1); opacity: 0.9; }
          50% { transform: scale(1.3); opacity: 1; }
        }
        @keyframes orbRipple {
          0% { transform: scale(1); opacity: 0.7; }
          80% { opacity: 0; }
          100% { transform: scale(2.4); opacity: 0; }
        }
        @keyframes jarvisDrift {
          0%, 100% { transform: translate(0, 0); }
          20% { transform: translate(10px, -14px); }
          40% { transform: translate(-12px, 8px); }
          60% { transform: translate(14px, 10px); }
          80% { transform: translate(-8px, -6px); }
        }
        .jarvis-drift { animation: jarvisDrift 18s ease-in-out infinite; }
        @keyframes scanline { 0% { transform: translateY(-100%); } 100% { transform: translateY(100vh); } }
        .scanline { animation: scanline 8s linear infinite; }
        @keyframes micPulseRing {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(1.8); opacity: 0; }
        }
        .mic-pulse-ring { animation: micPulseRing 1.4s ease-out infinite; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fadeUp 0.6s ease-out both; }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .fade-in { animation: fadeIn 0.4s ease-out both; }
        @keyframes modalIn {
          from { opacity: 0; transform: translateY(20px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .modal-in { animation: modalIn 0.25s ease-out both; }
        @keyframes backdropIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .backdrop-in { animation: backdropIn 0.2s ease-out both; }
        @keyframes greetGlow {
          0%, 100% { text-shadow: 0 0 20px rgba(34,211,238,0.4); }
          50% { text-shadow: 0 0 32px rgba(34,211,238,0.7); }
        }
        .greet-glow { animation: greetGlow 4s ease-in-out infinite; }
        .pill-hover { transition: transform 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease, border-color 0.2s ease; }
        .pill-hover:hover { transform: translateY(-2px) scale(1.04); }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .shimmer { background: linear-gradient(90deg, transparent, rgba(34,211,238,0.15), transparent); background-size: 200% 100%; animation: shimmer 3s linear infinite; }
        .jarvis-scrollbar::-webkit-scrollbar { width: 4px; }
        .jarvis-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .jarvis-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,220,255,0.2); border-radius: 4px; }
        .jarvis-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0,220,255,0.4); }
      `}</style>

      <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden opacity-[0.03]">
        <div className="scanline w-full h-[2px] bg-cyan-400" />
      </div>

      <div className="absolute inset-0 pointer-events-none z-40" style={{ background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.6) 100%)' }} />

      <div className={`absolute inset-0 transition-all duration-1000 jarvis-drift ${hasMessages ? 'opacity-40 scale-[0.55] translate-y-[-10%]' : 'opacity-100 scale-100'}`}>
        <JarvisOrb state={speaking ? 'speaking' : loading ? 'processing' : listening ? 'listening' : 'idle'} />
      </div>

      {(listening || interim) && (
        <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-[-180px] z-30 pointer-events-none">
          <div className="px-5 py-2 rounded-full border border-cyan-400/40 bg-black/60 backdrop-blur-sm text-cyan-200 text-sm font-mono tracking-wide max-w-[80vw] text-center">
            {interim || 'Listening...'}
          </div>
        </div>
      )}

      <div className="relative z-20 px-6 py-3 flex items-center justify-between border-b border-cyan-500/10">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className={`w-8 h-8 rounded-full border ${loading ? 'border-cyan-300 shadow-lg shadow-cyan-400/40' : 'border-cyan-300/70'} flex items-center justify-center transition-all duration-500`}>
              <div className={`w-2 h-2 rounded-full ${loading ? 'bg-cyan-300 animate-ping' : 'bg-cyan-300'}`} />
            </div>
          </div>
          <div>
            <h1 className="text-white text-base font-semibold tracking-tight">Jarvis</h1>
            <p className="text-slate-400 text-xs">Flair HQ</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-300">
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-sky-400 animate-pulse' : 'bg-emerald-400'}`} />
            <span className={active ? 'text-sky-300' : 'text-emerald-400'}>
              {listening ? 'Listening' : speaking ? 'Speaking' : loading ? 'Processing' : 'Online'}
            </span>
          </div>
          <button
            onClick={() => {
              if (voiceOut && typeof window !== 'undefined') window.speechSynthesis?.cancel()
              setVoiceOut(v => !v)
            }}
            title={voiceOut ? 'Voice replies: ON' : 'Voice replies: OFF'}
            className={`p-1.5 rounded border transition-all ${voiceOut ? 'border-cyan-300 bg-cyan-400/15 text-cyan-100' : 'border-cyan-300/40 text-cyan-200 hover:text-cyan-100 hover:border-cyan-300/70'}`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {voiceOut ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M17.95 6.05a8 8 0 010 11.9M11 5L6 9H2v6h4l5 4V5z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5L6 9H2v6h4l5 4V5z M22 9l-6 6 M16 9l6 6" />
              )}
            </svg>
          </button>
          <Link
            href="/pnl"
            title="P&amp;L dashboard"
            className="p-1.5 rounded border border-cyan-300/40 text-cyan-200 hover:text-cyan-100 hover:border-cyan-300/70 transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </Link>
          <Link
            href="/integrations"
            title="Integrations &amp; setup"
            className="p-1.5 rounded border border-cyan-300/40 text-cyan-200 hover:text-cyan-100 hover:border-cyan-300/70 transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </Link>
        </div>
      </div>

      <DashboardWidgets />

      <Bookmarks open={bookmarksOpen} onClose={() => setBookmarksOpen(false)} />
      <Prompts open={promptsOpen} onClose={() => setPromptsOpen(false)} onSelect={send} />

      <div ref={scrollRef} className="flex-1 overflow-y-auto relative z-20 jarvis-scrollbar">
        {!hasMessages ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="relative mb-8 fade-up" style={{ animationDelay: '0.1s' }}>
              <h2 className="text-4xl md:text-5xl font-semibold text-white tracking-tight mb-2 greet-glow">{greeting}</h2>
              <p className="text-slate-300 text-base max-w-md">All systems online. How can I help today?</p>
            </div>
            <button
              onClick={() => setPromptsOpen(true)}
              className="px-6 py-3 rounded-full bg-white/[0.06] border border-white/10 text-white hover:bg-white/[0.10] hover:border-white/20 text-sm font-medium pill-hover fade-up"
              style={{ animationDelay: '0.4s' }}
            >
              Browse prompts
            </button>
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
                    <p className="text-white text-sm leading-relaxed">{msg.content}</p>
                  ) : (
                    <>
                      {msg.error ? (
                        <p className="text-rose-400 text-sm">{msg.content}</p>
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
                    <span className="text-slate-400 text-sm">Thinking…</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="relative z-20 px-4 pt-2 pb-5 border-t border-cyan-500/10 flex flex-col items-center gap-3">
        <div className="flex items-center justify-center gap-6">
          <button
            onClick={() => setPromptsOpen(true)}
            title="Quick prompts"
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/[0.06] border border-white/10 text-white hover:bg-white/[0.10] hover:border-white/20 pill-hover"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <span className="text-sm font-medium">Prompts</span>
          </button>

          <button
            onClick={() => setBookmarksOpen(true)}
            title="Quick links"
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/[0.06] border border-white/10 text-white hover:bg-white/[0.10] hover:border-white/20 pill-hover"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            <span className="text-sm font-medium">Links</span>
          </button>

          <div className="relative flex items-center justify-center">
          {listening && (
            <>
              <span className="absolute inset-0 rounded-full border-2 border-cyan-400 mic-pulse-ring" />
              <span className="absolute inset-0 rounded-full border-2 border-cyan-400 mic-pulse-ring" style={{ animationDelay: '0.5s' }} />
            </>
          )}
          <button
            onClick={toggleMic}
            disabled={!speechSupported}
            title={!speechSupported ? 'Voice input not supported in this browser' : listening ? 'Stop listening' : 'Tap to speak'}
            className={`relative w-16 h-16 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
              !speechSupported
                ? 'border-cyan-500/10 text-cyan-500/20 cursor-not-allowed'
                : listening
                  ? 'border-cyan-400 bg-cyan-400/20 text-cyan-100 shadow-lg shadow-cyan-400/40'
                  : speaking
                    ? 'border-purple-400/60 bg-purple-400/10 text-purple-200 shadow-lg shadow-purple-400/30'
                    : 'border-cyan-500/30 bg-cyan-500/[0.04] text-cyan-300 hover:border-cyan-400/60 hover:bg-cyan-400/10 hover:shadow-lg hover:shadow-cyan-400/20'
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-14 0m7 7v3m-4 0h8M12 3a3 3 0 00-3 3v5a3 3 0 006 0V6a3 3 0 00-3-3z" />
            </svg>
          </button>
          </div>
        </div>

        <div className="flex items-end gap-2 w-full max-w-4xl mx-auto">
          <div className="flex-1 border border-cyan-500/15 rounded-lg bg-cyan-500/[0.02] focus-within:border-cyan-400/30 focus-within:bg-cyan-500/[0.04] transition-all duration-300">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={listening ? '> Listening...' : '> Ask Jarvis...'}
              rows={1}
              className="w-full bg-transparent text-white placeholder-slate-500 px-4 py-3 text-sm resize-none focus:outline-none"
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
