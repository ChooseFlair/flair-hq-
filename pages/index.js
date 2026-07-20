import { useState, useEffect, useRef } from 'react'
import Head from 'next/head'
import Jarvis from '../components/Jarvis'
import AgentOffice from '../components/AgentOffice'
import Proposals from '../components/Proposals'
import Overview from '../components/Overview'
import TaskManager from '../components/TaskManager'
import Finance from '../components/Finance'
import Forecast from '../components/Forecast'
import Products from '../components/Products'
import Marketing from '../components/Marketing'
import PnL from '../components/PnL'
import Researcher from '../components/Researcher'
import PersonalBanking from '../components/PersonalBanking'
import PersonalTasks from '../components/PersonalTasks'

const WORK_QUICK_LINKS = [
  { name: 'Shopify', url: 'https://admin.shopify.com', color: '#96bf48' },
  { name: 'Klaviyo', url: 'https://www.klaviyo.com/dashboard', color: '#1a1a2e' },
  { name: 'Meta Ads', url: 'https://adsmanager.facebook.com', color: '#1877f2' },
  { name: 'Facebook', url: 'https://www.facebook.com/chooseflair', color: '#1877f2' },
  { name: 'Instagram', url: 'https://www.instagram.com/chooseflair', color: '#e1306c' },
  { name: 'Revolut', url: 'https://business.revolut.com', color: '#0075eb' },
  { name: 'PayPal', url: 'https://www.paypal.com/myaccount', color: '#003087' },
  { name: 'Windsor AI', url: 'https://onboard.windsor.ai', color: '#6366f1' },
  { name: 'Vercel', url: 'https://vercel.com/dashboard', color: '#000' },
  { name: 'Supabase', url: 'https://supabase.com/dashboard', color: '#3ecf8e' },
  { name: 'Flair Store', url: 'https://chooseflair.com', color: '#1d9e75' },
]

const PERSONAL_QUICK_LINKS = [
  { name: 'Nationwide', url: 'https://www.nationwide.co.uk', color: '#003366' },
  { name: 'Halifax', url: 'https://www.halifax.co.uk', color: '#005b99' },
  { name: 'Gmail', url: 'https://mail.google.com', color: '#ea4335' },
]

const PERSONAL_NAV = [
  { section: 'Personal', items: [
    { id: 'banking', label: 'Banking', icon: '🏦' },
    { id: 'personal-tasks', label: 'Tasks', icon: '📝' },
  ]},
]

const NAV = [
  { section: 'AI', items: [
    { id: 'office', label: 'Agent Office', icon: '🏢' },
    { id: 'jarvis', label: 'Jarvis Chat', icon: '⚡' },
    { id: 'approvals', label: 'Approvals', icon: '✅' },
  ]},
  { section: 'Business', items: [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'pnl', label: 'P&L', icon: '💰' },
    { id: 'finance', label: 'Finance', icon: '🏦', subs: [
      { id: 'overview', label: 'Overview' },
      { id: 'accounts', label: 'Revolut' },
      { id: 'paypal', label: 'PayPal' },
    ]},
    { id: 'forecast', label: 'Forecast', icon: '📈' },
    { id: 'products', label: 'Products', icon: '🛒', subs: [
      { id: 'analytics', label: 'Sales Analytics' },
      { id: 'catalog', label: 'Catalog & COGS' },
      { id: 'potential', label: 'Profitability' },
      { id: 'alibaba', label: 'Alibaba' },
    ]},
    { id: 'marketing', label: 'Marketing', icon: '📣', subs: [
      { id: 'overview', label: 'Overview' },
      { id: 'organic', label: 'Organic Social' },
      { id: 'email', label: 'Email (Klaviyo)' },
      { id: 'meta', label: 'Meta Ads' },
    ]},
  ]},
  { section: 'Tools', items: [
    { id: 'tasks', label: 'Task Manager', icon: '📋' },
    { id: 'researcher', label: 'Researcher', icon: '🔬', subs: [
      { id: 'trends', label: 'Industry Trends' },
      { id: 'products', label: 'Hot Products' },
      { id: 'competitors', label: 'Competitors' },
      { id: 'calculator', label: 'Profitability' },
      { id: 'alibaba', label: 'Alibaba' },
      { id: 'ask', label: 'Ask AI' },
    ]},
  ]},
]

export default function Home() {
  const [mode, setMode] = useState('work')
  const [view, setView] = useState('office')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeSubTab, setActiveSubTab] = useState(null)
  const [expanded, setExpanded] = useState(['finance', 'products', 'marketing', 'researcher'])
  const jarvisRef = useRef(null)

  const currentNav = mode === 'personal' ? PERSONAL_NAV : NAV
  const quickLinks = mode === 'personal' ? PERSONAL_QUICK_LINKS : WORK_QUICK_LINKS

  useEffect(() => {
    // Returning from the TrueLayer OAuth flow lands on personal banking
    const params = new URLSearchParams(window.location.search)
    if (params.get('bank_connected') || params.get('bank_error')) {
      switchMode('personal')
      return
    }
    const saved = localStorage.getItem('flair_hq_mode')
    if (saved === 'personal') switchMode('personal')
  }, [])

  function switchMode(next) {
    if (next === mode) return
    setMode(next)
    setView(next === 'personal' ? 'banking' : 'office')
    setActiveSubTab(null)
    try { localStorage.setItem('flair_hq_mode', next) } catch {}
  }

  function handleAgentAsk(query) {
    setView('jarvis')
    setTimeout(() => {
      if (jarvisRef.current?.send) jarvisRef.current.send(query)
    }, 100)
  }

  function handleNav(item, sub) {
    setView(item.id)
    if (sub) {
      setActiveSubTab(sub.id)
    } else if (item.subs) {
      setActiveSubTab(item.subs[0].id)
      setExpanded(prev => prev.includes(item.id) ? prev.filter(x => x !== item.id) : [...prev, item.id])
    } else {
      setActiveSubTab(null)
    }
  }

  function renderContent() {
    switch (view) {
      case 'office': return <div className="px-6 py-6"><div className="max-w-6xl mx-auto"><AgentOffice onAsk={handleAgentAsk} /></div></div>
      case 'jarvis': return <div className="h-full"><Jarvis ref={jarvisRef} /></div>
      case 'approvals': return <div className="px-6 py-6"><div className="max-w-4xl mx-auto"><Proposals /></div></div>
      case 'overview': return <div className="px-6 py-6"><Overview /></div>
      case 'pnl': return <div className="px-6 py-6"><PnL /></div>
      case 'finance': return <div className="px-6 py-6"><Finance activeSubTab={activeSubTab} setActiveSubTab={setActiveSubTab} /></div>
      case 'forecast': return <div className="px-6 py-6"><Forecast /></div>
      case 'products': return <div className="px-6 py-6"><Products activeSubTab={activeSubTab} setActiveSubTab={setActiveSubTab} /></div>
      case 'marketing': return <div className="px-6 py-6"><Marketing activeSubTab={activeSubTab} setActiveSubTab={setActiveSubTab} /></div>
      case 'tasks': return <div className="px-6 py-6"><TaskManager /></div>
      case 'researcher': return <div className="px-6 py-6"><Researcher activeSubTab={activeSubTab} setActiveSubTab={setActiveSubTab} /></div>
      case 'banking': return <div className="px-6 py-6"><PersonalBanking /></div>
      case 'personal-tasks': return <div className="px-6 py-6"><PersonalTasks /></div>
      default: return <div className="px-6 py-6"><div className="max-w-6xl mx-auto"><AgentOffice onAsk={handleAgentAsk} /></div></div>
    }
  }

  return (
    <>
      <Head>
        <title>Flair HQ</title>
        <meta name="description" content="Flair HQ - AI-powered business dashboard" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="h-screen flex p-3 gap-3">
        <aside className={`${sidebarOpen ? 'w-60' : 'w-0'} flex-shrink-0 glass rounded-3xl flex flex-col transition-all duration-300 overflow-hidden`}>
          <div className="px-4 py-4 flex items-center gap-3 flex-shrink-0">
            <div className={`w-9 h-9 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white text-sm font-extrabold shadow-md ${mode === 'personal' ? 'from-indigo-500 to-violet-600' : 'from-emerald-500 to-teal-600'}`}>
              {mode === 'personal' ? 'K' : 'F'}
            </div>
            <div>
              <span className="text-base font-extrabold text-ink block leading-tight">Flair HQ</span>
              <span className="text-[10px] text-ink-faint font-medium">{mode === 'personal' ? 'personal space' : 'chooseflair.com'}</span>
            </div>
          </div>

          <div className="px-3 pb-2 flex-shrink-0">
            <div className="relative grid grid-cols-2 p-1 bg-white/40 rounded-full border border-white/60">
              <span
                className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full bg-gray-900 shadow-md transition-transform duration-300 ease-out ${mode === 'personal' ? 'translate-x-[calc(100%+4px)]' : 'translate-x-0'}`}
                aria-hidden
              />
              {['work', 'personal'].map(m => (
                <button
                  key={m}
                  onClick={() => switchMode(m)}
                  className={`relative z-10 py-1.5 text-xs font-semibold rounded-full capitalize transition-colors ${
                    mode === m ? 'text-white' : 'text-ink-soft hover:text-ink'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto py-2 px-2.5">
            {currentNav.map(group => (
              <div key={group.section} className="mb-3">
                <p className="text-[10px] font-bold text-ink-faint uppercase tracking-wider px-2.5 mb-1.5">{group.section}</p>
                {group.items.map(item => (
                  <div key={item.id}>
                    <button
                      onClick={() => handleNav(item)}
                      className={`w-full text-left px-3 py-2 rounded-2xl text-sm transition-all mb-0.5 flex items-center justify-between ${
                        view === item.id ? 'bg-gray-900 text-white font-semibold shadow-md' : 'text-ink-soft hover:bg-white/60 hover:text-ink'
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <span className="text-sm">{item.icon}</span>
                        {item.label}
                      </span>
                      {item.subs && (
                        <svg className={`w-3.5 h-3.5 transition-transform ${expanded.includes(item.id) ? 'rotate-180' : ''} ${view === item.id ? 'text-white/60' : 'text-ink-faint'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                      )}
                    </button>
                    {item.subs && expanded.includes(item.id) && (
                      <div className="ml-5 pl-3 border-l-2 border-emerald-200/50 mb-1">
                        {item.subs.map(sub => (
                          <button
                            key={sub.id}
                            onClick={() => handleNav(item, sub)}
                            className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs transition-all ${
                              view === item.id && activeSubTab === sub.id
                                ? 'bg-white/70 text-ink font-semibold shadow-sm'
                                : 'text-ink-faint hover:text-ink-soft hover:bg-white/40'
                            }`}
                          >
                            {sub.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}

            <div className="mb-3">
              <p className="text-[10px] font-bold text-ink-faint uppercase tracking-wider px-2.5 mb-1.5">Quick Links</p>
              <div className="grid grid-cols-3 gap-1 px-1">
                {quickLinks.map(link => (
                  <a
                    key={link.name}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center gap-1 px-1 py-2 rounded-2xl hover:bg-white/60 transition-colors group"
                  >
                    <div className="w-7 h-7 rounded-xl flex items-center justify-center text-white text-[10px] font-bold shadow-sm" style={{ backgroundColor: link.color }}>
                      {link.name.charAt(0)}
                    </div>
                    <span className="text-[9px] text-ink-faint group-hover:text-ink-soft text-center leading-tight truncate w-full">{link.name}</span>
                  </a>
                ))}
              </div>
            </div>
          </nav>

          <div className="px-4 py-3.5 flex-shrink-0">
            <div className="flex items-center gap-2 glass-strong rounded-full px-3 py-2">
              <div className={`w-2 h-2 rounded-full animate-pulse-soft ${mode === 'personal' ? 'bg-indigo-500' : 'bg-emerald-500'}`} />
              <span className="text-xs text-ink-soft font-medium">{mode === 'personal' ? 'Kept separate from business' : '6 agents online'}</span>
            </div>
          </div>
        </aside>

        <div className="flex-1 flex flex-col min-w-0 gap-3">
          <header className="h-14 flex-shrink-0 glass rounded-3xl flex items-center px-4 gap-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="glass-orb w-9 h-9 rounded-full flex items-center justify-center text-ink-soft hover:text-ink">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <span className="text-lg font-extrabold text-ink">{currentNav.flatMap(g => g.items).find(i => i.id === view)?.label || view}</span>
            {activeSubTab && view !== 'jarvis' && view !== 'office' && view !== 'approvals' && (
              <span className="text-xs text-ink-faint font-medium">/ {currentNav.flatMap(g => g.items).find(i => i.id === view)?.subs?.find(s => s.id === activeSubTab)?.label}</span>
            )}
          </header>

          <div className="flex-1 min-h-0 overflow-auto glass rounded-3xl">
            {renderContent()}
          </div>
        </div>
      </div>
    </>
  )
}
