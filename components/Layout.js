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
  Users,
  ListOrdered,
  Newspaper,
  Flame,
  Target,
  MessageSquare,
  ExternalLink,
  Leaf,
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
  {
    id: 'orders',
    name: 'Orders',
    icon: Package,
    children: [
      { id: 'orders-analytics', name: 'Analytics', subTab: 'analytics', icon: BarChart3 },
      { id: 'orders-list', name: 'All Orders', subTab: 'orders', icon: ListOrdered },
      { id: 'orders-customers', name: 'Customers', subTab: 'customers', icon: Users },
    ]
  },
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
  {
    id: 'researcher',
    name: 'AI Researcher',
    icon: FlaskConical,
    children: [
      { id: 'researcher-trends', name: 'Industry Trends', subTab: 'trends', icon: Newspaper },
      { id: 'researcher-products', name: 'Hot Products', subTab: 'products', icon: Flame },
      { id: 'researcher-competitors', name: 'Competitors', subTab: 'competitors', icon: Target },
      { id: 'researcher-ask', name: 'Ask AI', subTab: 'ask', icon: MessageSquare },
    ]
  },
]

export default function Layout({ children, activeTab, setActiveTab, activeSubTab, setActiveSubTab }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [expandedSections, setExpandedSections] = useState(['finance', 'orders', 'products', 'marketing', 'researcher'])

  const toggleSection = (sectionId) => {
    setExpandedSections(prev =>
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    )
  }

  const handleNavClick = (item, child = null) => {
    if (child) {
      setActiveTab(item.id)
      setActiveSubTab(child.subTab)
    } else if (item.children) {
      toggleSection(item.id)
      setActiveTab(item.id)
      setActiveSubTab('overview')
    } else {
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
    <div className="min-h-screen bg-gradient-to-br from-cream-50 via-white to-flair-50">
      {/* Decorative background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-flair-100 rounded-full opacity-30 blur-3xl"></div>
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-sage-100 rounded-full opacity-20 blur-3xl"></div>
        <div className="absolute -bottom-40 right-1/3 w-80 h-80 bg-cream-200 rounded-full opacity-30 blur-3xl"></div>
      </div>

      {/* Header */}
      <header className="glass-header fixed top-0 left-0 right-0 z-30 shadow-sm">
        <div className="flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-xl hover:bg-flair-50 text-flair-700 lg:hidden transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 gradient-flair rounded-xl flex items-center justify-center text-white shadow-lg shadow-flair-700/20">
                <Leaf className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xl font-bold text-flair-700">Flair</span>
                <span className="text-xl font-light text-flair-500 ml-1">HQ</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://chooseflair.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-flair-600 hover:text-flair-700 hover:bg-flair-50 transition-colors"
            >
              chooseflair.com
              <ExternalLink className="w-3 h-3" />
            </a>
            <div className="w-9 h-9 gradient-flair rounded-xl flex items-center justify-center text-white text-sm font-semibold shadow-md">
              K
            </div>
          </div>
        </div>
      </header>

      <div className="flex pt-[60px]">
        {/* Sidebar */}
        <aside className={`fixed left-0 top-[60px] h-[calc(100vh-60px)] glass-sidebar transition-all duration-300 z-20 ${sidebarOpen ? 'w-64' : 'w-0 lg:w-16'} overflow-hidden`}>
          <nav className="p-3 space-y-1 overflow-y-auto h-[calc(100%-120px)]">
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
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all duration-200 ${
                      isActive
                        ? 'bg-flair-700 text-white shadow-lg shadow-flair-700/20'
                        : 'text-flair-600 hover:bg-flair-50 hover:text-flair-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : ''}`} />
                      <span className={`font-medium ${sidebarOpen ? 'block' : 'hidden lg:hidden'}`}>
                        {item.name}
                      </span>
                    </div>
                    {hasChildren && sidebarOpen && (
                      <span className={isActive ? 'text-white/70' : 'text-flair-400'}>
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
                    <div className="mt-1 ml-4 pl-3 border-l-2 border-flair-100 space-y-0.5">
                      {item.children.map((child) => {
                        const ChildIcon = child.icon
                        const isChildActive = isActiveChild(item, child)
                        return (
                          <button
                            key={child.id}
                            onClick={() => handleNavClick(item, child)}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-sm transition-all duration-200 ${
                              isChildActive
                                ? 'bg-flair-100 text-flair-700 font-medium'
                                : 'text-flair-500 hover:bg-flair-50 hover:text-flair-600'
                            }`}
                          >
                            <ChildIcon className={`w-4 h-4 flex-shrink-0 ${isChildActive ? 'text-flair-600' : ''}`} />
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

          {/* Bottom Card */}
          <div className={`absolute bottom-4 left-3 right-3 ${sidebarOpen ? 'block' : 'hidden'}`}>
            <div className="gradient-flair rounded-2xl p-4 text-white shadow-lg shadow-flair-700/30">
              <div className="flex items-center gap-2 mb-2">
                <Leaf className="w-5 h-5" />
                <span className="font-semibold">Flair HQ</span>
              </div>
              <p className="text-sm text-white/80">Your wellness business dashboard</p>
              <div className="mt-3 pt-3 border-t border-white/20 flex items-center justify-between">
                <span className="text-xs text-white/60">v2.0</span>
                <a
                  href="https://chooseflair.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-white/80 hover:text-white flex items-center gap-1"
                >
                  Visit Store <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-16'} relative z-10`}>
          <div className="p-6 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-flair-900/20 backdrop-blur-sm z-10 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  )
}
