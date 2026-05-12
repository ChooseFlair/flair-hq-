import { useState, useEffect } from 'react'

const TONES = {
  emerald: 'border-emerald-400/40 bg-emerald-400/[0.08] text-emerald-100',
  amber: 'border-amber-400/40 bg-amber-400/[0.08] text-amber-100',
  rose: 'border-rose-400/40 bg-rose-400/[0.08] text-rose-100',
  slate: 'border-white/15 bg-white/[0.04] text-slate-200',
}

export default function InsightBubble() {
  const [insight, setInsight] = useState(null)
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    let alive = true
    fetch('/api/dashboard/insight')
      .then(r => r.json())
      .then(j => { if (alive) setInsight(j.insight) })
      .catch(() => {})
    return () => { alive = false }
  }, [])

  if (!insight || hidden) return null

  const tone = TONES[insight.tone] || TONES.slate

  return (
    <div className="absolute left-1/2 -translate-x-1/2 bottom-[28%] z-30 max-w-md w-[calc(100%-2rem)] px-4 pointer-events-none">
      <div className={`relative pointer-events-auto rounded-2xl border px-5 py-4 backdrop-blur-md shadow-2xl bubble-in ${tone}`}>
        <div className="flex items-start gap-3">
          <div className="text-xs font-semibold tracking-wide opacity-70 mt-0.5">Jarvis</div>
          <p className="flex-1 text-sm leading-relaxed">{insight.text}</p>
          <button
            onClick={() => setHidden(true)}
            className="text-current opacity-50 hover:opacity-100 -mt-1 -mr-1 p-1"
            title="Dismiss"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        {/* Speech tail pointing down toward the input area */}
        <div className={`absolute left-1/2 -bottom-2 -translate-x-1/2 w-4 h-4 rotate-45 border-r border-b ${tone.split(' ')[0]} ${tone.split(' ')[1]}`} />
      </div>
      <style jsx>{`
        @keyframes bubbleIn {
          from { opacity: 0; transform: translateY(8px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .bubble-in { animation: bubbleIn 0.5s ease-out both; animation-delay: 1.2s; }
      `}</style>
    </div>
  )
}
