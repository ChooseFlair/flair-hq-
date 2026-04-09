import { useState } from 'react'
import {
  LayoutDashboard,
  ClipboardList,
  Building2,
  Package,
  ShoppingBag,
  TrendingUp,
  FlaskConical,
  ChevronDown,
  ChevronRight,
  Menu,
  CreditCard,
  Wallet,
  Eye,
  Mail,
  Share2,
  BarChart3,
  LineChart,
  Calculator,
  DollarSign,
  Tags,
} from 'lucide-react'

const navigation = [
  { id: 'overview', name: 'Overview', icon: LayoutDashboard },
  { id: 'tasks', name: 'Task Manager', icon: ClipboardList },
  {
    id: 'finance',
    name: 'Finance',
    icon: Building2,
    children: [
      { id: 'finance-overview', name: 'Overview', subTab: 'overview', icon: Eye },
      { id: 'finance-revolut', name: 'Revolut', subTab: 'accounts', icon: Wallet },
      { id: 'finance-paypal', name: 'PayPal', subTab: 'paypal', icon: CreditCard },
    ]
  },
  { id: 'forecast', name: 'Forecast', icon: LineChart },
  { id: 'orders', name: 'Orders', icon: Package },
  {
    id: 'products',
    name: 'Products',
    icon: ShoppingBag,
    children: [
      { id: 'products-analytics', name: 'Sales Analytics', subTab: 'analytics', icon: BarChart3 },
      { id: 'products-catalog', name: 'Catalog & COGS', subTab: 'catalog', icon: Tags },
      { id: 'products-calculator', name: 'Profitability', subTab: 'potential', icon: Calculator },
      { id: 'products-alibaba', name: 'Alibaba', subTab: 'alibaba', icon: DollarSign },
    ]
  },
  {
    id: 'marketing',
    name: 'Marketing',
    icon: TrendingUp,
    children: [
      { id: 'marketing-overview', name: 'Overview', subTab: 'overview', icon: Eye },
      { id: 'marketing-organic', name: 'Organic Social', subTab: 'organic', icon: Share2 },
      { id: 'marketing-email', name: 'Email (Klaviyo)', subTab: 'email', icon: Mail },
      { id: 'marketing-meta', name: 'Meta Ads', subTab: 'meta', icon: BarChart3 },
    ]
  },
  { id: 'researcher', name: 'AI Researcher', icon: FlaskConical },
]

export default function Layout({ children, activeTab, setActiveTab, activeSubTab, setActiveSubTab }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [expandedSections, setExpandedSections] = useState(['finance', 'products', 'marketing'])

  const toggleSection = (sectionId) => {
    setExpandedSections(prev =>
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    )
  }

  const handleNavClick = (item, child = null) => {
    if (child) {
      // Clicking a child item
      setActiveTab(item.id)
      setActiveSubTab(child.subTab)
    } else if (item.children) {
      // Clicking a parent with children - toggle expansion and navigate
      toggleSection(item.id)
      setActiveTab(item.id)
      setActiveSubTab('overview')
    } else {
      // Clicking a regular item
      setActiveTab(item.id)
      setActiveSubTab(null)
    }
  }

  const isActiveParent = (item) => {
    return activeTab === item.id
  }

  const isActiveChild = (item, child) => {
    return activeTab === item.id && activeSubTab === child.subTab
  }

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
              <Menu className="w-6 h-6" />
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
            {navigation.map((item) => {
              const Icon = item.icon
              const hasChildren = item.children && item.children.length > 0
              const isExpanded = expandedSections.includes(item.id)
              const isActive = isActiveParent(item)

              return (
                <div key={item.id}>
                  {/* Parent Item */}
                  <button
                    onClick={() => handleNavClick(item)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-colors ${
                      isActive && !hasChildren
                        ? 'bg-green-50 text-green-700 font-medium'
                        : isActive && hasChildren
                        ? 'bg-green-50 text-green-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      <span className={`${sidebarOpen ? 'block' : 'hidden lg:hidden'}`}>
                        {item.name}
                      </span>
                    </div>
                    {hasChildren && sidebarOpen && (
                      <span className="text-gray-400">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </span>
                    )}
                  </button>

                  {/* Children */}
                  {hasChildren && isExpanded && sidebarOpen && (
                    <div className="mt-1 ml-4 pl-4 border-l border-gray-200 space-y-1">
                      {item.children.map((child) => {
                        const ChildIcon = child.icon
                        return (
                          <button
                            key={child.id}
                            onClick={() => handleNavClick(item, child)}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                              isActiveChild(item, child)
                                ? 'bg-green-50 text-green-700 font-medium'
                                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                            }`}
                          >
                            <ChildIcon className="w-4 h-4 flex-shrink-0" />
                            <span>{child.name}</span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </nav>

          {/* Quick Stats in Sidebar */}
          <div className={`absolute bottom-4 left-4 right-4 ${sidebarOpen ? 'block' : 'hidden'}`}>
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white">
              <p className="text-sm text-green-100">Need help?</p>
              <p className="text-xs mt-1 text-green-200">Dashboard v2.0</p>
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
