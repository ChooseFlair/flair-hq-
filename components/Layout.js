import { useState } from 'react'

const tabs = [
  { id: 'overview', name: 'Overview', icon: '📊' },
  { id: 'orders', name: 'Orders', icon: '📦' },
  { id: 'products', name: 'Products', icon: '🛍️' },
  { id: 'marketing', name: 'Marketing', icon: '📈' },
  { id: 'researcher', name: 'AI Researcher', icon: '🔬' },
]

export default function Layout({ children, activeTab, setActiveTab }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 fixed top-0 left-0 right-0 z-30">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 lg:hidden"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center text-white font-bold">
                F
              </div>
              <span className="text-xl font-bold text-gray-900">Flair HQ</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://chooseflair.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              chooseflair.com
            </a>
            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm font-medium">
              K
            </div>
          </div>
        </div>
      </header>

      <div className="flex pt-14">
        {/* Sidebar */}
        <aside className={`fixed left-0 top-14 h-[calc(100vh-3.5rem)] bg-white border-r border-gray-200 transition-all duration-300 z-20 ${sidebarOpen ? 'w-64' : 'w-0 lg:w-16'} overflow-hidden`}>
          <nav className="p-4 space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                  activeTab === tab.id
                    ? 'bg-green-50 text-green-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <span className="text-lg">{tab.icon}</span>
                <span className={`${sidebarOpen ? 'block' : 'hidden lg:hidden'}`}>{tab.name}</span>
              </button>
            ))}
          </nav>

          {/* Quick Stats in Sidebar */}
          <div className={`absolute bottom-4 left-4 right-4 ${sidebarOpen ? 'block' : 'hidden'}`}>
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white">
              <p className="text-sm text-green-100">Need help?</p>
              <p className="text-xs mt-1 text-green-200">Dashboard v1.0</p>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-16'}`}>
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-10 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  )
}
