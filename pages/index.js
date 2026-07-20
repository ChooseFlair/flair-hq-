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
      <div className="h-screen flex bg-gray-50">
        <aside className={`${sidebarOpen ? 'w-60' : 'w-0'} flex-shrink-0 bg-white border-r border-gray-200 flex flex-col transition-all duration-200 overflow-hidden`}>
          <div className="px-4 py-3.5 border-b border-gray-100 flex items-center gap-3 flex-shrink-0">
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center text-white text-sm font-bold shadow-sm ${mode === 'personal' ? 'from-indigo-500 to-violet-600' : 'from-emerald-500 to-teal-600'}`}>
              {mode === 'personal' ? 'K' : 'F'}
            </div>
            <div>
              <span className="text-base font-bold text-gray-900 block leading-tight">Flair HQ</span>
              <span className="text-[10px] text-gray-400">{mode === 'personal' ? 'personal space' : 'chooseflair.com'}</span>
            </div>
          </div>

          <div className="px-2.5 pt-2.5 flex-shrink-0">
            <div className="grid grid-cols-2 gap-1 p-1 bg-gray-100 rounded-lg">
              {['work', 'personal'].map(m => (
                <button
                  key={m}
                  onClick={() => switchMode(m)}
                  className={`py-1.5 text-xs font-medium rounded-md capitalize transition-all ${
                    mode === m ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
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
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-2.5 mb-1">{group.section}</p>
                {group.items.map(item => (
                  <div key={item.id}>
                    <button
                      onClick={() => handleNav(item)}
                      className={`w-full text-left px-2.5 py-2 rounded-lg text-sm transition-all mb-0.5 flex items-center justify-between ${
                        view === item.id ? 'bg-gray-900 text-white font-medium' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-sm">{item.icon}</span>
                        {item.label}
                      </span>
                      {item.subs && (
                        <svg className={`w-3.5 h-3.5 transition-transform ${expanded.includes(item.id) ? 'rotate-180' : ''} ${view === item.id ? 'text-white/60' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                      )}
                    </button>
                    {item.subs && expanded.includes(item.id) && (
                      <div className="ml-5 pl-3 border-l-2 border-gray-100 mb-1">
                        {item.subs.map(sub => (
                          <button
                            key={sub.id}
                            onClick={() => handleNav(item, sub)}
                            className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs transition-all ${
                              view === item.id && activeSubTab === sub.id
                                ? 'bg-gray-100 text-gray-900 font-medium'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
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
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-2.5 mb-1">Quick Links</p>
              <div className="grid grid-cols-3 gap-1 px-1">
                {quickLinks.map(link => (
                  <a
                    key={link.name}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center gap-1 px-1 py-2 rounded-lg hover:bg-gray-50 transition-colors group"
                  >
                    <div className="w-6 h-6 rounded-md flex items-center justify-center text-white text-[9px] font-bold" style={{ backgroundColor: link.color }}>
                      {link.name.charAt(0)}
                    </div>
                    <span className="text-[9px] text-gray-400 group-hover:text-gray-600 text-center leading-tight truncate w-full">{link.name}</span>
                  </a>
                ))}
              </div>
            </div>
          </nav>

          <div className="px-4 py-3 border-t border-gray-100 flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${mode === 'personal' ? 'bg-indigo-500' : 'bg-emerald-500'}`} />
              <span className="text-xs text-gray-400">{mode === 'personal' ? 'Kept separate from business' : '6 agents online'}</span>
            </div>
          </div>
        </aside>

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 flex-shrink-0 bg-white border-b border-gray-200 flex items-center px-4 gap-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <span className="text-sm font-medium text-gray-700">{currentNav.flatMap(g => g.items).find(i => i.id === view)?.label || view}</span>
            {activeSubTab && view !== 'jarvis' && view !== 'office' && view !== 'approvals' && (
              <span className="text-xs text-gray-400">/ {currentNav.flatMap(g => g.items).find(i => i.id === view)?.subs?.find(s => s.id === activeSubTab)?.label}</span>
            )}
          </header>

          <div className="flex-1 min-h-0 overflow-auto">
            {renderContent()}
          </div>
        </div>
      </div>
    </>
  )
}
