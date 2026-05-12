import { useState } from 'react'

const BOOKMARKS = [
  {
    category: 'Store & Ops',
    items: [
      { label: 'Shopify Admin', url: 'https://admin.shopify.com/store/m13sj1-xz/orders', icon: '🛍' },
      { label: 'ShipStation', url: 'https://ship.shipstation.com', icon: '📦' },
    ],
  },
  {
    category: 'Finance',
    items: [
      { label: 'Revolut Business', url: 'https://business.revolut.com', icon: '💳' },
      { label: 'PayPal', url: 'https://www.paypal.com/myaccount/summary', icon: '🅿️' },
      { label: 'Xero', url: 'https://go.xero.com', icon: '📒' },
      { label: 'Companies House', url: 'https://find-and-update.company-information.service.gov.uk', icon: '🏛' },
      { label: 'HMRC Business Tax', url: 'https://www.gov.uk/log-in-register-hmrc-online-services', icon: '🧾' },
    ],
  },
  {
    category: 'Marketing',
    items: [
      { label: 'Klaviyo Campaigns', url: 'https://www.klaviyo.com/dashboard', icon: '✉️' },
      { label: 'Meta Business Suite', url: 'https://business.facebook.com', icon: '📘' },
      { label: 'Meta Ads Manager', url: 'https://adsmanager.facebook.com', icon: '📊' },
      { label: 'Pipeboard Reports', url: 'https://app.pipeboard.co', icon: '📈' },
    ],
  },
  {
    category: 'AI & Productivity',
    items: [
      { label: 'Claude', url: 'https://claude.ai', icon: '🤖' },
      { label: 'Anthropic Console', url: 'https://console.anthropic.com', icon: '🛠' },
      { label: 'ChatGPT', url: 'https://chat.openai.com', icon: '💬' },
      { label: 'Manus AI', url: 'https://manus.im', icon: '✋' },
      { label: 'Canva', url: 'https://canva.com', icon: '🎨' },
      { label: 'Clean Email', url: 'https://app.clean.email', icon: '🧹' },
    ],
  },
  {
    category: 'Dev',
    items: [
      { label: 'Vercel', url: 'https://vercel.com/dashboard', icon: '▲' },
      { label: 'GitHub', url: 'https://github.com/ChooseFlair', icon: '🐙' },
    ],
  },
]

export default function Bookmarks({ open, onClose }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/80 backdrop-blur-md backdrop-in" onClick={onClose}>
      <div className="w-full max-w-4xl bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl modal-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.06]">
          <div>
            <h2 className="text-white text-lg font-semibold tracking-tight">Quick links</h2>
            <p className="text-slate-400 text-xs mt-0.5">Your daily stack</p>
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
          {BOOKMARKS.map(group => (
            <div key={group.category}>
              <div className="text-xs font-medium text-slate-400 mb-2">{group.category}</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {group.items.map((item, i) => (
                  <a
                    key={item.label}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ animationDelay: `${i * 30}ms` }}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.08] hover:border-white/[0.14] hover:-translate-y-0.5 transition-all duration-200 group fade-up"
                  >
                    <span className="text-base">{item.icon}</span>
                    <span className="text-white text-sm truncate group-hover:text-white">{item.label}</span>
                    <svg className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 ml-auto flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
