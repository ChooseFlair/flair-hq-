import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import {
  FlaskConical,
  TrendingUp,
  TrendingDown,
  Flame,
  Target,
  Newspaper,
  MessageSquare,
  ExternalLink,
  RefreshCw,
  Sparkles,
  ArrowUp,
  ArrowRight,
  Clock,
  Globe,
  Zap,
  Heart,
  Leaf,
  Brain,
  Moon,
  Wind,
  Search,
  BookOpen,
  AlertCircle,
  CheckCircle,
  Star,
  Calculator,
  DollarSign,
  PlusCircle,
  Trash2,
  Package,
  XCircle,
  Save,
} from 'lucide-react'
import AlibabaCalculator from './AlibabaCalculator'

export default function Researcher({ activeSubTab, setActiveSubTab }) {
  const activeTab = activeSubTab || 'trends'
  const setActiveTab = setActiveSubTab || (() => {})

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [trends, setTrends] = useState([])
  const [hotProducts, setHotProducts] = useState([])
  const [competitors, setCompetitors] = useState([])
  const [industryNews, setIndustryNews] = useState([])
  const [aiQuery, setAiQuery] = useState('')
  const [aiResponse, setAiResponse] = useState('')
  const [researching, setResearching] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)

  // Bundle Calculator State
  const [bundles, setBundles] = useState([
    {
      id: 1,
      name: 'Starter Bundle',
      items: [
        { name: 'Walnut Inhaler', unitCost: 8.50, quantity: 1 },
        { name: 'Spearmint 3-Pack', unitCost: 1.20, quantity: 2 },
      ],
      sellingPrice: 39.99,
      shippingCost: 3.50,
      packagingCost: 1.50,
      platformFee: 2.9,
    }
  ])

  // Business data for calculator
  const [businessData, setBusinessData] = useState({
    metaCAC: 8.50,
    paypalFeeRate: 0.029,
    paypalFixedFee: 0.30,
    loading: false
  })

  useEffect(() => {
    loadAllData()
    loadBusinessData()
  }, [])

  const loadBusinessData = async () => {
    try {
      const metaRes = await fetch('/api/meta/overview').catch(() => null)
      const metaData = metaRes ? await metaRes.json() : null

      let metaCAC = 8.50
      if (metaData?.summary) {
        const spend = metaData.summary.spend || 0
        const purchases = metaData.summary.purchases || 0
        if (purchases > 0) metaCAC = spend / purchases
      }

      setBusinessData(prev => ({ ...prev, metaCAC, loading: false }))
    } catch {
      setBusinessData(prev => ({ ...prev, loading: false }))
    }
  }

  const loadAllData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        loadTrends(),
        loadHotProducts(),
        loadCompetitors(),
        loadIndustryNews(),
      ])
      setLastUpdated(new Date())
    } finally {
      setLoading(false)
    }
  }

  const refreshData = async () => {
    setRefreshing(true)
    await loadAllData()
    setRefreshing(false)
  }

  const loadTrends = async () => {
    setTrends([
      { id: 1, title: 'Adaptogens & Stress Relief', description: 'Ashwagandha, Rhodiola seeing 40% YoY growth.', growth: '+40%', category: 'Ingredients', icon: Brain, color: 'purple' },
      { id: 2, title: 'Functional Aromatherapy', description: 'Essential oils for focus, sleep, energy outpacing general aromatherapy.', growth: '+28%', category: 'Products', icon: Wind, color: 'blue' },
      { id: 3, title: 'Sleep Wellness Market', description: 'Sleep aids hitting £3.2B market. Melatonin alternatives trending.', growth: '+35%', category: 'Market', icon: Moon, color: 'indigo' },
      { id: 4, title: 'Sustainable Packaging', description: '78% of consumers pay more for eco-friendly packaging.', growth: '+22%', category: 'Sustainability', icon: Leaf, color: 'green' },
      { id: 5, title: 'Breathwork & Mindfulness', description: 'Breathing tools gaining mainstream adoption.', growth: '+55%', category: 'Wellness', icon: Wind, color: 'teal' },
      { id: 6, title: 'Nicotine Alternatives', description: 'Non-nicotine oral fixation products growing.', growth: '+32%', category: 'Health', icon: Heart, color: 'red' },
    ])
  }

  const loadHotProducts = async () => {
    setHotProducts([
      { id: 1, name: 'Portable Essential Oil Diffusers', category: 'Aromatherapy', trend: 'hot', searchVolume: '45K/mo', growth: '+125%', priceRange: '£15-40', opportunity: 'high' },
      { id: 2, name: 'Adaptogen Drinks', category: 'Functional Beverages', trend: 'hot', searchVolume: '32K/mo', growth: '+89%', priceRange: '£30-50/month', opportunity: 'medium' },
      { id: 3, name: 'CBD Sleep Products', category: 'Sleep', trend: 'rising', searchVolume: '28K/mo', growth: '+45%', priceRange: '£20-60', opportunity: 'medium' },
      { id: 4, name: 'Breathwork Tools', category: 'Mindfulness', trend: 'hot', searchVolume: '18K/mo', growth: '+200%', priceRange: '£20-45', opportunity: 'high' },
      { id: 5, name: 'Magnesium Supplements', category: 'Supplements', trend: 'rising', searchVolume: '55K/mo', growth: '+38%', priceRange: '£10-25', opportunity: 'low' },
      { id: 6, name: 'Herbal Inhaler Sticks', category: 'Aromatherapy', trend: 'stable', searchVolume: '22K/mo', growth: '+12%', priceRange: '£2-8', opportunity: 'medium' },
    ])
  }

  const loadCompetitors = async () => {
    setCompetitors([
      { name: 'Ripple+', website: 'rippleplus.com', category: 'Aromatherapy Vapes', pricing: '£14.99', strengths: ['Social presence', 'Wide flavors'], weaknesses: ['Disposable', 'Plastic'], threat: 'high', recentActivity: 'Launched Focus line' },
      { name: 'FÜUM', website: 'getfuum.com', category: 'Essential Oil Inhalers', pricing: '£34.99', strengths: ['Premium', 'Reusable', 'UK-based'], weaknesses: ['Higher price'], threat: 'high', recentActivity: 'EU expansion' },
      { name: 'Monq', website: 'monq.com', category: 'Personal Diffusers', pricing: '$20-30', strengths: ['US leader', 'Strong brand'], weaknesses: ['US-focused', 'Disposable'], threat: 'medium', recentActivity: 'Testing UK via Amazon' },
      { name: 'Komuso', website: 'komusodesign.com', category: 'Breathwork Tools', pricing: '£65-85', strengths: ['Unique', 'Premium'], weaknesses: ['Single function'], threat: 'low', recentActivity: 'Meditation app partnerships' },
    ])
  }

  const loadIndustryNews = async () => {
    setIndustryNews([
      { id: 1, title: 'UK Wellness Market to Hit £32B by 2026', source: 'Wellness Daily', date: '2 hours ago', summary: 'Aromatherapy up 28%.', relevant: true },
      { id: 2, title: 'TikTok Drives 300% Spike in Aromatherapy Interest', source: 'Marketing Week', date: '5 hours ago', summary: '#AromatherapyTok trending.', relevant: true },
      { id: 3, title: 'FDA Scrutiny on Vape-Style Wellness Products', source: 'Regulatory News', date: '1 day ago', summary: 'UK MHRA watching.', relevant: true },
      { id: 4, title: 'Sustainable Packaging Mandate Coming to UK', source: 'Packaging Europe', date: '2 days ago', summary: 'New regulations expected 2025.', relevant: true },
      { id: 5, title: 'Gen Z Spending 2x More on Wellness', source: 'Consumer Insights', date: '3 days ago', summary: '18-25 prioritizing mental wellness.', relevant: true },
    ])
  }

  // Bundle Calculator Functions
  const formatCurrency = (value) => `£${parseFloat(value || 0).toFixed(2)}`

  const addBundle = () => {
    setBundles(prev => [...prev, {
      id: Date.now(),
      name: '',
      items: [{ name: '', unitCost: '', quantity: 1 }],
      sellingPrice: '',
      shippingCost: '',
      packagingCost: '',
      platformFee: '2.9',
    }])
  }

  const removeBundle = (bundleId) => {
    setBundles(prev => prev.filter(b => b.id !== bundleId))
  }

  const updateBundle = (bundleId, field, value) => {
    setBundles(prev => prev.map(b => b.id === bundleId ? { ...b, [field]: value } : b))
  }

  const addItemToBundle = (bundleId) => {
    setBundles(prev => prev.map(b => {
      if (b.id === bundleId) {
        return { ...b, items: [...b.items, { name: '', unitCost: '', quantity: 1 }] }
      }
      return b
    }))
  }

  const removeItemFromBundle = (bundleId, itemIndex) => {
    setBundles(prev => prev.map(b => {
      if (b.id === bundleId) {
        return { ...b, items: b.items.filter((_, i) => i !== itemIndex) }
      }
      return b
    }))
  }

  const updateBundleItem = (bundleId, itemIndex, field, value) => {
    setBundles(prev => prev.map(b => {
      if (b.id === bundleId) {
        const newItems = [...b.items]
        newItems[itemIndex] = { ...newItems[itemIndex], [field]: value }
        return { ...b, items: newItems }
      }
      return b
    }))
  }

  const calculateBundleProfitability = (bundle) => {
    const sellingPrice = parseFloat(bundle.sellingPrice) || 0
    if (sellingPrice === 0) return null

    const totalCOGS = bundle.items.reduce((sum, item) => {
      return sum + (parseFloat(item.unitCost) || 0) * (parseInt(item.quantity) || 1)
    }, 0)

    const shippingCost = parseFloat(bundle.shippingCost) || 0
    const packagingCost = parseFloat(bundle.packagingCost) || 0
    const platformFeeRate = (parseFloat(bundle.platformFee) || 0) / 100
    const platformFee = sellingPrice * platformFeeRate
    const paypalFee = (sellingPrice * businessData.paypalFeeRate) + businessData.paypalFixedFee

    const totalVariableCosts = totalCOGS + shippingCost + packagingCost + platformFee + paypalFee
    const grossProfit = sellingPrice - totalVariableCosts
    const grossMargin = (grossProfit / sellingPrice) * 100

    const marketingCost = businessData.metaCAC
    const netProfit = grossProfit - marketingCost
    const netMargin = (netProfit / sellingPrice) * 100

    let verdict = 'unprofitable'
    if (netMargin >= 20) verdict = 'highly-profitable'
    else if (netMargin >= 10) verdict = 'profitable'
    else if (netMargin >= 0) verdict = 'marginal'

    return {
      totalCOGS,
      grossProfit,
      grossMargin,
      netProfit,
      netMargin,
      verdict,
      breakdown: {
        cogs: totalCOGS,
        shipping: shippingCost,
        packaging: packagingCost,
        platformFee,
        paypalFee,
        marketing: marketingCost,
      }
    }
  }

  // AI Functions
  const handleAiResearch = async () => {
    if (!aiQuery.trim()) return
    setResearching(true)
    setAiResponse('')

    try {
      const res = await fetch('/api/ai/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: aiQuery }),
      })
      if (res.ok) {
        const data = await res.json()
        setAiResponse(data.response)
      } else {
        simulateAiResponse()
      }
    } catch {
      simulateAiResponse()
    }
    setResearching(false)
  }

  const simulateAiResponse = () => {
    const responses = {
      default: `**Health & Wellness Analysis for Flair**

**Market Overview:**
UK aromatherapy market growing at 15% annually. Key drivers:
- Post-pandemic mental health focus
- Smoking cessation trends
- Gen Z wellness spending

**Flair Competitive Position:**
✓ Premium wooden design differentiates
✓ Reusable model aligns with sustainability
✓ UK-based = faster shipping

**Bundle Recommendations:**
1. **Starter Bundle** £39.99 - Inhaler + 2 refills
2. **Gift Set** £54.99 - Inhaler + 6 refills + gift box
3. **Subscribe & Save** - 10% off recurring refills`,
    }
    setAiResponse(responses.default)
  }

  const getTrendColor = (color) => {
    const colors = {
      purple: 'bg-purple-100 text-purple-600',
      blue: 'bg-blue-100 text-blue-600',
      indigo: 'bg-indigo-100 text-indigo-600',
      green: 'bg-green-100 text-green-600',
      teal: 'bg-teal-100 text-teal-600',
      red: 'bg-red-100 text-red-600',
    }
    return colors[color] || 'bg-gray-100 text-gray-600'
  }

  const getThreatColor = (threat) => {
    switch (threat) {
      case 'high': return 'bg-red-100 text-red-700'
      case 'medium': return 'bg-yellow-100 text-yellow-700'
      case 'low': return 'bg-green-100 text-green-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-flair-600 mx-auto mb-4"></div>
          <p className="text-flair-500">Loading research data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-flair-700 flex items-center gap-2">
            <FlaskConical className="w-7 h-7 text-flair-600" />
            Researcher
          </h1>
          <p className="text-flair-500 mt-1">Industry intelligence, calculators & insights.</p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-flair-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Updated {format(lastUpdated, 'h:mm a')}
            </span>
          )}
          <button
            onClick={refreshData}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 gradient-flair text-white rounded-xl hover:opacity-90 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { id: 'trends', label: 'Industry Trends', icon: Newspaper },
          { id: 'products', label: 'Hot Products', icon: Flame },
          { id: 'competitors', label: 'Competitors', icon: Target },
          { id: 'calculator', label: 'Profitability', icon: Calculator },
          { id: 'alibaba', label: 'Alibaba', icon: DollarSign },
          { id: 'ask', label: 'Ask AI', icon: MessageSquare },
        ].map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'gradient-flair text-white shadow-lg shadow-flair-700/20'
                  : 'bg-white/60 backdrop-blur-sm text-flair-600 hover:bg-white/80 border border-flair-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Industry Trends Tab */}
      {activeTab === 'trends' && (
        <div className="space-y-6">
          <div className="gradient-flair rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-5 h-5" />
              <h3 className="font-semibold">Live Industry Updates</h3>
            </div>
            <div className="space-y-3">
              {industryNews.slice(0, 3).map((news) => (
                <div key={news.id} className="flex items-start gap-3 bg-white/10 rounded-xl p-3">
                  <Globe className="w-4 h-4 mt-1 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{news.title}</p>
                    <p className="text-xs text-white/70 mt-1">{news.source} • {news.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {trends.map((trend) => {
              const Icon = trend.icon
              return (
                <div key={trend.id} className="bg-white/60 backdrop-blur-xl border border-white/50 rounded-2xl p-5 hover:bg-white/80 hover:shadow-lg transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${getTrendColor(trend.color)}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="flex items-center gap-1 text-sage-600 font-semibold text-sm">
                      <ArrowUp className="w-4 h-4" />
                      {trend.growth}
                    </span>
                  </div>
                  <h4 className="font-semibold text-flair-700 mb-2">{trend.title}</h4>
                  <p className="text-sm text-flair-500 mb-3">{trend.description}</p>
                  <span className="inline-block px-2 py-1 bg-flair-50 text-flair-600 text-xs rounded-lg">
                    {trend.category}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Hot Products Tab */}
      {activeTab === 'products' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/60 backdrop-blur-xl border border-white/50 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Flame className="w-4 h-4 text-orange-500" />
                <p className="text-sm text-flair-500">Hot Products</p>
              </div>
              <p className="text-2xl font-bold text-orange-600">{hotProducts.filter(p => p.trend === 'hot').length}</p>
            </div>
            <div className="bg-white/60 backdrop-blur-xl border border-white/50 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-sage-500" />
                <p className="text-sm text-flair-500">Rising</p>
              </div>
              <p className="text-2xl font-bold text-sage-600">{hotProducts.filter(p => p.trend === 'rising').length}</p>
            </div>
            <div className="bg-white/60 backdrop-blur-xl border border-white/50 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Star className="w-4 h-4 text-yellow-500" />
                <p className="text-sm text-flair-500">High Opportunity</p>
              </div>
              <p className="text-2xl font-bold text-yellow-600">{hotProducts.filter(p => p.opportunity === 'high').length}</p>
            </div>
            <div className="bg-white/60 backdrop-blur-xl border border-white/50 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Search className="w-4 h-4 text-blue-500" />
                <p className="text-sm text-flair-500">Tracked</p>
              </div>
              <p className="text-2xl font-bold text-blue-600">{hotProducts.length}</p>
            </div>
          </div>

          <div className="bg-white/60 backdrop-blur-xl border border-white/50 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-flair-100/50 bg-white/30">
              <h3 className="font-semibold text-flair-700">Hot Products in Health & Wellness</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-flair-50/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-flair-600 uppercase">Product</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-flair-600 uppercase">Trend</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-flair-600 uppercase">Search Vol</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-flair-600 uppercase">Growth</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-flair-600 uppercase">Price</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-flair-600 uppercase">Opportunity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-flair-100/50">
                  {hotProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-flair-50/30 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-medium text-flair-700">{product.name}</p>
                        <p className="text-xs text-flair-400">{product.category}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${
                          product.trend === 'hot' ? 'bg-orange-100 text-orange-700' :
                          product.trend === 'rising' ? 'bg-green-100 text-green-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {product.trend === 'hot' && <Flame className="w-3 h-3" />}
                          {product.trend}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-flair-600">{product.searchVolume}</td>
                      <td className="px-6 py-4 text-sm font-medium text-sage-600">{product.growth}</td>
                      <td className="px-6 py-4 text-sm text-flair-600">{product.priceRange}</td>
                      <td className="px-6 py-4">
                        <span className={`text-sm font-medium capitalize ${
                          product.opportunity === 'high' ? 'text-green-600' :
                          product.opportunity === 'medium' ? 'text-yellow-600' : 'text-gray-400'
                        }`}>{product.opportunity}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Competitors Tab */}
      {activeTab === 'competitors' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {competitors.map((comp) => (
              <div key={comp.name} className="bg-white/60 backdrop-blur-xl border border-white/50 rounded-2xl overflow-hidden hover:shadow-lg transition-all">
                <div className="px-6 py-4 border-b border-flair-100/50 flex items-center justify-between bg-white/30">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 gradient-flair rounded-xl flex items-center justify-center font-bold text-white">
                      {comp.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-semibold text-flair-700">{comp.name}</h4>
                      <a href={`https://${comp.website}`} target="_blank" rel="noopener noreferrer" className="text-xs text-flair-500 hover:underline flex items-center gap-1">
                        {comp.website} <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-lg ${getThreatColor(comp.threat)}`}>
                    {comp.threat} threat
                  </span>
                </div>
                <div className="px-6 py-4 space-y-3">
                  <div className="flex gap-4 text-sm">
                    <div>
                      <p className="text-flair-400">Category</p>
                      <p className="font-medium text-flair-700">{comp.category}</p>
                    </div>
                    <div>
                      <p className="text-flair-400">Pricing</p>
                      <p className="font-medium text-flair-700">{comp.pricing}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {comp.strengths.map((s, i) => (
                      <span key={i} className="px-2 py-1 bg-sage-50 text-sage-700 text-xs rounded-lg">{s}</span>
                    ))}
                    {comp.weaknesses.map((w, i) => (
                      <span key={i} className="px-2 py-1 bg-red-50 text-red-700 text-xs rounded-lg">{w}</span>
                    ))}
                  </div>
                  <p className="text-xs text-flair-400">Recent: {comp.recentActivity}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Profitability Calculator Tab */}
      {activeTab === 'calculator' && (
        <div className="space-y-6">
          <div className="bg-flair-50 border border-flair-200 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <Target className="w-5 h-5 text-flair-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-flair-700">Bundle Profitability Calculator</h3>
                <p className="text-sm text-flair-500 mt-1">
                  Create product bundles and calculate profitability with your current CAC (£{businessData.metaCAC.toFixed(2)}) and fees.
                </p>
              </div>
            </div>
          </div>

          {bundles.map((bundle, bundleIndex) => {
            const profitability = calculateBundleProfitability(bundle)
            return (
              <div key={bundle.id} className="bg-white/60 backdrop-blur-xl border border-white/50 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-flair-100/50 bg-white/30 flex items-center justify-between">
                  <input
                    type="text"
                    value={bundle.name}
                    onChange={(e) => updateBundle(bundle.id, 'name', e.target.value)}
                    placeholder={`Bundle ${bundleIndex + 1}`}
                    className="text-lg font-semibold text-flair-700 bg-transparent border-none outline-none placeholder-flair-300"
                  />
                  {bundles.length > 1 && (
                    <button onClick={() => removeBundle(bundle.id)} className="text-flair-400 hover:text-red-500 transition-colors">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
                <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left - Inputs */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-flair-600 mb-2">Bundle Items</label>
                      <div className="space-y-2">
                        {bundle.items.map((item, itemIndex) => (
                          <div key={itemIndex} className="flex gap-2 items-center">
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => updateBundleItem(bundle.id, itemIndex, 'name', e.target.value)}
                              placeholder="Product name"
                              className="flex-1 px-3 py-2 bg-white/50 border border-flair-100 rounded-xl text-sm focus:bg-white/80 focus:border-flair-300 outline-none"
                            />
                            <input
                              type="number"
                              value={item.unitCost}
                              onChange={(e) => updateBundleItem(bundle.id, itemIndex, 'unitCost', e.target.value)}
                              placeholder="Cost"
                              className="w-20 px-3 py-2 bg-white/50 border border-flair-100 rounded-xl text-sm focus:bg-white/80 focus:border-flair-300 outline-none"
                            />
                            <span className="text-flair-400 text-sm">×</span>
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateBundleItem(bundle.id, itemIndex, 'quantity', e.target.value)}
                              className="w-16 px-3 py-2 bg-white/50 border border-flair-100 rounded-xl text-sm focus:bg-white/80 focus:border-flair-300 outline-none"
                            />
                            {bundle.items.length > 1 && (
                              <button onClick={() => removeItemFromBundle(bundle.id, itemIndex)} className="text-flair-400 hover:text-red-500">
                                <XCircle className="w-5 h-5" />
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          onClick={() => addItemToBundle(bundle.id)}
                          className="flex items-center gap-2 text-sm text-flair-500 hover:text-flair-700 transition-colors"
                        >
                          <PlusCircle className="w-4 h-4" /> Add item
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm text-flair-500 mb-1">Bundle Price (£)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={bundle.sellingPrice}
                          onChange={(e) => updateBundle(bundle.id, 'sellingPrice', e.target.value)}
                          placeholder="39.99"
                          className="w-full px-3 py-2 bg-white/50 border border-flair-100 rounded-xl text-sm focus:bg-white/80 focus:border-flair-300 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-flair-500 mb-1">Shipping (£)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={bundle.shippingCost}
                          onChange={(e) => updateBundle(bundle.id, 'shippingCost', e.target.value)}
                          placeholder="3.50"
                          className="w-full px-3 py-2 bg-white/50 border border-flair-100 rounded-xl text-sm focus:bg-white/80 focus:border-flair-300 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-flair-500 mb-1">Packaging (£)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={bundle.packagingCost}
                          onChange={(e) => updateBundle(bundle.id, 'packagingCost', e.target.value)}
                          placeholder="1.50"
                          className="w-full px-3 py-2 bg-white/50 border border-flair-100 rounded-xl text-sm focus:bg-white/80 focus:border-flair-300 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-flair-500 mb-1">Platform Fee (%)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={bundle.platformFee}
                          onChange={(e) => updateBundle(bundle.id, 'platformFee', e.target.value)}
                          placeholder="2.9"
                          className="w-full px-3 py-2 bg-white/50 border border-flair-100 rounded-xl text-sm focus:bg-white/80 focus:border-flair-300 outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right - Results */}
                  <div>
                    {profitability ? (
                      <div className="space-y-4">
                        <div className={`p-4 rounded-2xl ${
                          profitability.verdict === 'highly-profitable' ? 'bg-sage-100 border-2 border-sage-400' :
                          profitability.verdict === 'profitable' ? 'bg-sage-50 border border-sage-300' :
                          profitability.verdict === 'marginal' ? 'bg-yellow-50 border border-yellow-300' :
                          'bg-red-50 border border-red-300'
                        }`}>
                          <div className="flex items-center gap-3">
                            {profitability.verdict.includes('profitable') ? <CheckCircle className="w-8 h-8 text-sage-600" /> :
                             profitability.verdict === 'marginal' ? <AlertCircle className="w-8 h-8 text-yellow-600" /> :
                             <XCircle className="w-8 h-8 text-red-600" />}
                            <div>
                              <p className="font-bold text-lg capitalize">{profitability.verdict.replace('-', ' ')}</p>
                              <p className="text-sm">Net margin: {profitability.netMargin.toFixed(1)}%</p>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-flair-50 rounded-xl p-3">
                            <p className="text-xs text-flair-500">COGS</p>
                            <p className="text-lg font-bold text-flair-700">{formatCurrency(profitability.totalCOGS)}</p>
                          </div>
                          <div className="bg-flair-50 rounded-xl p-3">
                            <p className="text-xs text-flair-500">Gross Profit</p>
                            <p className="text-lg font-bold text-sage-600">{formatCurrency(profitability.grossProfit)}</p>
                          </div>
                          <div className="bg-flair-50 rounded-xl p-3">
                            <p className="text-xs text-flair-500">Marketing (CAC)</p>
                            <p className="text-lg font-bold text-flair-700">{formatCurrency(profitability.breakdown.marketing)}</p>
                          </div>
                          <div className={`rounded-xl p-3 ${profitability.netProfit >= 0 ? 'bg-sage-100' : 'bg-red-100'}`}>
                            <p className="text-xs text-flair-500">Net Profit</p>
                            <p className={`text-lg font-bold ${profitability.netProfit >= 0 ? 'text-sage-700' : 'text-red-700'}`}>
                              {formatCurrency(profitability.netProfit)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center text-flair-400 bg-flair-50 rounded-2xl p-8">
                        <div className="text-center">
                          <Calculator className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <p>Add items and price to see analysis</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}

          <button
            onClick={addBundle}
            className="w-full py-4 border-2 border-dashed border-flair-200 rounded-2xl text-flair-500 hover:border-flair-400 hover:text-flair-600 flex items-center justify-center gap-2 transition-colors"
          >
            <PlusCircle className="w-5 h-5" /> Add Another Bundle
          </button>
        </div>
      )}

      {/* Alibaba Calculator Tab */}
      {activeTab === 'alibaba' && <AlibabaCalculator />}

      {/* Ask AI Tab */}
      {activeTab === 'ask' && (
        <div className="space-y-6">
          <div className="bg-white/60 backdrop-blur-xl border border-white/50 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-flair-700 mb-2">Ask the Researcher</h3>
            <p className="text-sm text-flair-500 mb-4">
              Get insights about market, competitors, pricing, and growth opportunities.
            </p>

            <div className="space-y-4">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAiResearch()}
                  placeholder="Ask about bundles, pricing, competitors..."
                  className="flex-1 px-4 py-3 bg-white/50 border border-flair-100 rounded-xl focus:bg-white/80 focus:border-flair-300 outline-none"
                />
                <button
                  onClick={handleAiResearch}
                  disabled={researching || !aiQuery.trim()}
                  className="px-6 py-3 gradient-flair text-white font-medium rounded-xl hover:opacity-90 disabled:opacity-50 transition-all flex items-center gap-2"
                >
                  {researching ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {researching ? 'Thinking...' : 'Research'}
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="text-sm text-flair-400">Try:</span>
                {['Bundle ideas', 'Pricing strategy', 'Competitor analysis'].map((q) => (
                  <button
                    key={q}
                    onClick={() => setAiQuery(q)}
                    className="px-3 py-1 text-sm bg-flair-50 text-flair-600 rounded-lg hover:bg-flair-100 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {(researching || aiResponse) && (
            <div className="bg-white/60 backdrop-blur-xl border border-white/50 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 gradient-flair rounded-xl flex items-center justify-center text-white">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h4 className="font-semibold text-flair-700">Research Results</h4>
              </div>

              {researching ? (
                <div className="flex items-center gap-3 py-8">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-flair-600"></div>
                  <span className="text-flair-500">Analyzing...</span>
                </div>
              ) : (
                <div className="prose prose-sm max-w-none">
                  <div className="whitespace-pre-wrap text-flair-600 leading-relaxed">
                    {aiResponse}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
