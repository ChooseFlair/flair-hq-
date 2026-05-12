import Link from 'next/link'

const PAGES = [
  { href: '/pnl', icon: '📊', label: 'P&L', desc: 'Profit, ROAS, EBITDA' },
  { href: '/inventory', icon: '📦', label: 'Inventory', desc: 'Stock + reorder' },
  { href: '/email', icon: '✉️', label: 'Email', desc: 'Klaviyo flows + campaigns' },
  { href: '/files', icon: '📎', label: 'Files', desc: 'Documents + notes' },
  { href: '/shipping', icon: '🚚', label: 'Shipping', desc: 'ShipStation upload' },
  { href: '/integrations', icon: '🔌', label: 'Integrations', desc: 'Connector health' },
]

export default function PagesMenu({ open, onClose }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/80 backdrop-blur-md backdrop-in" onClick={onClose}>
      <div className="w-full max-w-3xl bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl modal-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.06]">
          <div>
            <h2 className="text-white text-lg font-semibold tracking-tight">Jump to</h2>
            <p className="text-slate-400 text-xs mt-0.5">All pages</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="px-6 py-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {PAGES.map((p, i) => (
              <Link
                key={p.href}
                href={p.href}
                onClick={onClose}
                style={{ animationDelay: `${i * 30}ms` }}
                className="flex items-start gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.08] hover:border-white/[0.14] hover:-translate-y-0.5 transition-all duration-200 group fade-up"
              >
                <span className="text-2xl">{p.icon}</span>
                <div className="min-w-0">
                  <div className="text-white font-medium text-sm">{p.label}</div>
                  <div className="text-slate-400 text-xs mt-0.5">{p.desc}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
