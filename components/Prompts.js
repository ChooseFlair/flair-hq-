const PROMPTS = [
  { category: 'Performance', items: [
    'How are sales doing this week?',
    "What's my ROAS looking like?",
    'Give me a full business overview',
    'What should I focus on today?',
  ]},
  { category: 'Customers', items: [
    'Show me my top customers',
    'How many new customers this month?',
    'Who are my repeat buyers?',
  ]},
  { category: 'Marketing', items: [
    'How are my Klaviyo flows performing?',
    "What's working on Meta ads?",
    'Compare ad spend by source',
  ]},
  { category: 'Products', items: [
    "What's my best-selling product?",
    'Which products have low stock?',
    "Show me products that aren't selling",
  ]},
  { category: 'Finance', items: [
    "What's my P&L this month?",
    'How much did I make yesterday?',
    'Show me revenue trends',
  ]},
]

export default function Prompts({ open, onClose, onSelect }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/70 backdrop-blur-sm backdrop-in" onClick={onClose}>
      <div className="w-full max-w-4xl bg-black border border-cyan-400/30 rounded-lg shadow-2xl shadow-cyan-400/10 modal-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-cyan-500/15">
          <div>
            <h2 className="text-cyan-100 font-mono text-sm tracking-[0.3em] uppercase">Quick Prompts</h2>
            <p className="text-cyan-300/70 text-[10px] font-mono tracking-widest">TAP TO ASK</p>
          </div>
          <button
            onClick={onClose}
            className="text-cyan-300/70 hover:text-cyan-100 transition-colors p-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-6 py-5 space-y-5">
          {PROMPTS.map(group => (
            <div key={group.category}>
              <div className="text-[10px] font-mono text-cyan-400/70 tracking-[0.3em] uppercase mb-2">{group.category}</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {group.items.map((item, i) => (
                  <button
                    key={item}
                    onClick={() => { onSelect(item); onClose() }}
                    style={{ animationDelay: `${i * 30}ms` }}
                    className="text-left px-3 py-2.5 border border-cyan-500/15 bg-cyan-500/[0.03] rounded hover:border-cyan-400/50 hover:bg-cyan-400/10 hover:translate-x-1 transition-all duration-200 group fade-up"
                  >
                    <span className="text-cyan-300/40 group-hover:text-cyan-300 mr-1.5">&gt;</span>
                    <span className="text-cyan-100 text-xs font-mono group-hover:text-cyan-50">{item}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
