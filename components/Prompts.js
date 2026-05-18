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
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/80 backdrop-blur-md backdrop-in" onClick={onClose}>
      <div className="w-full max-w-4xl bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl modal-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.06]">
          <div>
            <h2 className="text-white text-lg font-semibold tracking-tight">Prompts</h2>
            <p className="text-slate-400 text-xs mt-0.5">Tap to ask</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-6 py-5 space-y-5">
          {PROMPTS.map(group => (
            <div key={group.category}>
              <div className="text-xs font-medium text-slate-400 mb-2">{group.category}</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {group.items.map((item, i) => (
                  <button
                    key={item}
                    onClick={() => { onSelect(item); onClose() }}
                    style={{ animationDelay: `${i * 30}ms` }}
                    className="text-left px-4 py-3 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.08] hover:border-white/[0.14] hover:translate-x-0.5 transition-all duration-200 fade-up"
                  >
                    <span className="text-white text-sm">{item}</span>
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
