import { useState, useRef } from 'react'
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

const NAV = [
  { section: 'AI', items: [
    { id: 'office', label: 'Agent Office' },
    { id: 'jarvis', label: 'Jarvis Chat' },
    { id: 'approvals', label: 'Approvals' },
  ]},
  { section: 'Business', items: [
    { id: 'overview', label: 'Overview' },
    { id: 'pnl', label: 'P&L' },
    { id: 'finance', label: 'Finance' },
    { id: 'forecast', label: 'Forecast' },
    { id: 'products', label: 'Products' },
    { id: 'marketing', label: 'Marketing' },
  ]},
  { section: 'Tools', items: [
    { id: 'tasks', label: 'Task Manager' },
    { id: 'researcher', label: 'Researcher' },
  ]},
]

export default function Home() {
  const [view, setView] = useState('office')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeSubTab, setActiveSubTab] = useState(null)
  const jarvisRef = useRef(null)

  function handleAgentAsk(query) {
    setView('jarvis')
    setTimeout(() => {
      if (jarvisRef.current?.send) jarvisRef.current.send(query)
    }, 100)
  }

  function renderContent() {
    switch (view) {
      case 'office':
        return <div className="px-6 py-6"><div className="max-w-6xl mx-auto"><AgentOffice onAsk={handleAgentAsk} /></div></div>
      case 'jarvis':
        return <div className="h-full"><Jarvis ref={jarvisRef} /></div>
      case 'approvals':
        return <div className="px-6 py-6"><div className="max-w-4xl mx-auto"><Proposals /></div></div>
      case 'overview':
        return <div className="px-6 py-6"><Overview /></div>
      case 'pnl':
        return <div className="px-6 py-6"><PnL /></div>
      case 'finance':
        return <div className="px-6 py-6"><Finance activeSubTab={activeSubTab} setActiveSubTab={setActiveSubTab} /></div>
      case 'forecast':
        return <div className="px-6 py-6"><Forecast /></div>
      case 'products':
        return <div className="px-6 py-6"><Products activeSubTab={activeSubTab} setActiveSubTab={setActiveSubTab} /></div>
      case 'marketing':
        return <div className="px-6 py-6"><Marketing activeSubTab={activeSubTab} setActiveSubTab={setActiveSubTab} /></div>
      case 'tasks':
        return <div className="px-6 py-6"><TaskManager /></div>
      case 'researcher':
        return <div className="px-6 py-6"><Researcher activeSubTab={activeSubTab} setActiveSubTab={setActiveSubTab} /></div>
      default:
        return <div className="px-6 py-6"><div className="max-w-6xl mx-auto"><AgentOffice onAsk={handleAgentAsk} /></div></div>
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
        <aside className={`${sidebarOpen ? 'w-56' : 'w-0'} flex-shrink-0 bg-white border-r border-gray-200 flex flex-col transition-all duration-200 overflow-hidden`}>
          <div className="px-4 py-4 border-b border-gray-100 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shadow-sm">F</div>
            <span className="text-lg font-bold text-gray-900">Flair HQ</span>
          </div>

          <nav className="flex-1 overflow-y-auto py-3 px-3">
            {NAV.map(group => (
              <div key={group.section} className="mb-4">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-2 mb-1.5">{group.section}</p>
                {group.items.map(item => (
                  <button
                    key={item.id}
                    onClick={() => { setView(item.id); setActiveSubTab(null) }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all mb-0.5 ${
                      view === item.id
                        ? 'bg-gray-900 text-white'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            ))}
          </nav>

          <div className="px-4 py-3 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs text-gray-400">6 agents online</span>
            </div>
          </div>
        </aside>

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 flex-shrink-0 bg-white border-b border-gray-200 flex items-center px-4 gap-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <span className="text-sm font-medium text-gray-700 capitalize">{NAV.flatMap(g => g.items).find(i => i.id === view)?.label || view}</span>
          </header>

          <div className="flex-1 min-h-0 overflow-auto">
            {renderContent()}
          </div>
        </div>
      </div>
    </>
  )
}
