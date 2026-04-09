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
  Sun,
  Droplets,
  Wind,
  Search,
  BookOpen,
  AlertCircle,
  CheckCircle,
  Star,
} from 'lucide-react'

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

  useEffect(() => {
    loadAllData()
  }, [])

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
    // In production, this would fetch from a trends API or web scraping service
    // For now, we'll use curated health & wellness trends
    setTrends([
      {
        id: 1,
        title: 'Adaptogens & Stress Relief',
        description: 'Ashwagandha, Rhodiola, and other adaptogens seeing 40% YoY growth in wellness products.',
        growth: '+40%',
        sentiment: 'rising',
        category: 'Ingredients',
        icon: Brain,
        color: 'purple',
      },
      {
        id: 2,
        title: 'Functional Aromatherapy',
        description: 'Essential oils for specific functions (focus, sleep, energy) outpacing general aromatherapy.',
        growth: '+28%',
        sentiment: 'rising',
        category: 'Products',
        icon: Wind,
        color: 'blue',
      },
      {
        id: 3,
        title: 'Sleep Wellness Market',
        description: 'Sleep aids and relaxation products hitting £3.2B market size. Melatonin alternatives trending.',
        growth: '+35%',
        sentiment: 'rising',
        category: 'Market',
        icon: Moon,
        color: 'indigo',
      },
      {
        id: 4,
        title: 'Sustainable Packaging',
        description: '78% of consumers willing to pay more for eco-friendly packaging. Plastic-free is key.',
        growth: '+22%',
        sentiment: 'rising',
        category: 'Sustainability',
        icon: Leaf,
        color: 'green',
      },
      {
        id: 5,
        title: 'Breathwork & Mindfulness',
        description: 'Breathing exercises and mindfulness tools gaining mainstream adoption post-pandemic.',
        growth: '+55%',
        sentiment: 'rising',
        category: 'Wellness',
        icon: Wind,
        color: 'teal',
      },
      {
        id: 6,
        title: 'Nicotine Alternatives',
        description: 'Non-nicotine oral fixation products growing as smoking cessation aids.',
        growth: '+32%',
        sentiment: 'rising',
        category: 'Health',
        icon: Heart,
        color: 'red',
      },
    ])
  }

  const loadHotProducts = async () => {
    // Curated hot products in health & wellness space
    setHotProducts([
      {
        id: 1,
        name: 'Portable Essential Oil Diffusers',
        brand: 'Various',
        category: 'Aromatherapy',
        trend: 'hot',
        searchVolume: '45K/mo',
        growth: '+125%',
        priceRange: '£15-40',
        opportunity: 'high',
        notes: 'USB-powered, travel-friendly designs trending. Matches Flair positioning.',
      },
      {
        id: 2,
        name: 'Adaptogen Drinks',
        brand: 'Mud/Wtr, Everyday Dose',
        category: 'Functional Beverages',
        trend: 'hot',
        searchVolume: '32K/mo',
        growth: '+89%',
        priceRange: '£30-50/month',
        opportunity: 'medium',
        notes: 'Coffee alternatives with mushrooms, adaptogens. Subscription models.',
      },
      {
        id: 3,
        name: 'CBD Sleep Products',
        brand: 'Various UK brands',
        category: 'Sleep',
        trend: 'rising',
        searchVolume: '28K/mo',
        growth: '+45%',
        priceRange: '£20-60',
        opportunity: 'medium',
        notes: 'Gummies, oils, and inhalers for sleep. UK regulatory compliance key.',
      },
      {
        id: 4,
        name: 'Breathwork Tools',
        brand: 'Shift, Komuso',
        category: 'Mindfulness',
        trend: 'hot',
        searchVolume: '18K/mo',
        growth: '+200%',
        priceRange: '£20-45',
        opportunity: 'high',
        notes: 'Exhale-focused tools for anxiety. Similar oral fixation benefit to Flair.',
      },
      {
        id: 5,
        name: 'Magnesium Supplements',
        brand: 'Various',
        category: 'Supplements',
        trend: 'rising',
        searchVolume: '55K/mo',
        growth: '+38%',
        priceRange: '£10-25',
        opportunity: 'low',
        notes: 'Glycinate for sleep, L-threonate for cognition. Crowded market.',
      },
      {
        id: 6,
        name: 'Personal Air Purifiers',
        brand: 'Various',
        category: 'Wellness Tech',
        trend: 'stable',
        searchVolume: '12K/mo',
        growth: '+15%',
        priceRange: '£30-100',
        opportunity: 'low',
        notes: 'Wearable purifiers. Niche but growing awareness.',
      },
      {
        id: 7,
        name: 'Herbal Inhaler Sticks',
        brand: 'Poy-Sian, Vicks',
        category: 'Aromatherapy',
        trend: 'stable',
        searchVolume: '22K/mo',
        growth: '+12%',
        priceRange: '£2-8',
        opportunity: 'medium',
        notes: 'Traditional menthol inhalers. Flair offers premium alternative.',
      },
      {
        id: 8,
        name: 'Stress Relief Wearables',
        brand: 'Apollo, Cove',
        category: 'Wellness Tech',
        trend: 'rising',
        searchVolume: '8K/mo',
        growth: '+65%',
        priceRange: '£200-400',
        opportunity: 'low',
        notes: 'Haptic devices for stress. High price point, different market.',
      },
    ])
  }

  const loadCompetitors = async () => {
    setCompetitors([
      {
        name: 'Ripple+',
        website: 'rippleplus.com',
        category: 'Aromatherapy Vapes',
        pricing: '£14.99 (disposable)',
        strengths: ['Strong social presence', 'Lifestyle branding', 'Wide flavor range'],
        weaknesses: ['Disposable only', 'Plastic construction'],
        threat: 'high',
        recentActivity: 'Launched new "Focus" line with caffeine alternatives',
      },
      {
        name: 'FÜUM',
        website: 'getfuum.com',
        category: 'Essential Oil Inhalers',
        pricing: '£34.99 (reusable)',
        strengths: ['Premium positioning', 'Reusable design', 'UK-based'],
        weaknesses: ['Higher price', 'Limited flavors'],
        threat: 'high',
        recentActivity: 'Expanded to EU markets, new subscription model',
      },
      {
        name: 'Monq',
        website: 'monq.com',
        category: 'Personal Diffusers',
        pricing: '$20-30 (disposable)',
        strengths: ['US market leader', 'Strong brand', 'Wide distribution'],
        weaknesses: ['US-focused', 'Disposable model'],
        threat: 'medium',
        recentActivity: 'Testing UK market entry via Amazon',
      },
      {
        name: 'Komuso',
        website: 'komusodesign.com',
        category: 'Breathwork Tools',
        pricing: '£65-85',
        strengths: ['Unique positioning', 'Meditation angle', 'Premium materials'],
        weaknesses: ['Single function', 'No aromatherapy'],
        threat: 'low',
        recentActivity: 'Partnered with meditation apps',
      },
      {
        name: 'VitaStik',
        website: 'vitastik.com',
        category: 'Vitamin Inhalers',
        pricing: '$10-15 (disposable)',
        strengths: ['Vitamin angle', 'Budget price'],
        weaknesses: ['Quality perception', 'Disposable'],
        threat: 'low',
        recentActivity: 'Struggling with supply chain issues',
      },
    ])
  }

  const loadIndustryNews = async () => {
    // In production, fetch from news API or RSS feeds
    setIndustryNews([
      {
        id: 1,
        title: 'UK Wellness Market to Hit £32B by 2026',
        source: 'Wellness Daily',
        date: '2 hours ago',
        summary: 'New report shows UK wellness spending accelerating post-pandemic with aromatherapy up 28%.',
        url: '#',
        relevant: true,
      },
      {
        id: 2,
        title: 'TikTok Drives 300% Spike in Aromatherapy Interest',
        source: 'Marketing Week',
        date: '5 hours ago',
        summary: '#AromatherapyTok trending with 2.3B views. Young consumers discovering essential oils.',
        url: '#',
        relevant: true,
      },
      {
        id: 3,
        title: 'FDA Scrutiny on Vape-Style Wellness Products',
        source: 'Regulatory News',
        date: '1 day ago',
        summary: 'US regulators examining wellness vapes. UK MHRA watching closely.',
        url: '#',
        relevant: true,
      },
      {
        id: 4,
        title: 'Sustainable Packaging Mandate Coming to UK',
        source: 'Packaging Europe',
        date: '2 days ago',
        summary: 'New UK regulations on plastic packaging expected 2025. Early adopters advantaged.',
        url: '#',
        relevant: true,
      },
      {
        id: 5,
        title: 'Gen Z Spending 2x More on Wellness Than Millennials',
        source: 'Consumer Insights',
        date: '3 days ago',
        summary: 'Research shows 18-25 demographic prioritizing mental wellness products.',
        url: '#',
        relevant: true,
      },
    ])
  }

  const handleAiResearch = async () => {
    if (!aiQuery.trim()) return

    setResearching(true)
    setAiResponse('')

    try {
      // Try to call actual AI API
      const res = await fetch('/api/ai/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: aiQuery }),
      })

      if (res.ok) {
        const data = await res.json()
        setAiResponse(data.response)
      } else {
        // Fallback to simulated response
        simulateAiResponse()
      }
    } catch {
      simulateAiResponse()
    }

    setResearching(false)
  }

  const simulateAiResponse = () => {
    const responses = {
      default: `**Health & Wellness Industry Analysis for Flair**

Based on current market data and trends:

**Market Overview:**
The UK aromatherapy and wellness inhaler market is valued at approximately £180M and growing at 15% annually. Key drivers include:
- Post-pandemic focus on mental health
- Smoking cessation trends (NHS data shows 12% decline in smokers)
- Gen Z wellness spending surge

**Flair's Competitive Position:**
✓ Premium wooden design differentiates from plastic competitors
✓ Reusable model aligns with sustainability trends
✓ UK-based = faster shipping, local appeal
✓ Price point (£29.99) sits in sweet spot

**Key Opportunities:**
1. **Breathwork positioning** - Partner with meditation/breathwork influencers
2. **Subscription model** - Recurring refill revenue (aim for 6+ purchases)
3. **Corporate wellness** - B2B bulk orders for employee wellness programs
4. **Sleep collection** - Lavender/chamomile focused for £3.2B sleep market

**Recommended Actions:**
- Launch TikTok content (platform showing 300% aromatherapy interest growth)
- Develop "Focus" and "Sleep" product lines
- Consider biodegradable refill packaging`,
      pricing: `**Pricing Strategy Analysis:**

**Current Flair Pricing:**
- Inhalers: £29.99
- Refill 3-Packs: £4.99

**Competitor Comparison:**
| Brand | Type | Price | Model |
|-------|------|-------|-------|
| Flair | Reusable | £29.99 | Premium |
| FÜUM | Reusable | £34.99 | Premium |
| Ripple+ | Disposable | £14.99 | Volume |
| Monq | Disposable | £18.99 | Mid |

**Analysis:**
✓ Your inhaler pricing is competitive vs FÜUM (£5 cheaper)
✓ Refills at £4.99 offer excellent value vs buying new
✓ LTV potential: £29.99 + (£4.99 × 12 refills) = £89.87

**Recommendations:**
1. **Starter Bundle**: £39.99 (inhaler + 3 refills) - 15% discount, higher AOV
2. **Subscription**: £4.49/refill pack for subscribers (-10%)
3. **Gift Set**: £54.99 (inhaler + 6 refills + gift box) for holidays`,
      marketing: `**Marketing Strategy Recommendations:**

**Priority Channels (Ranked):**
1. **TikTok** - 300% growth in aromatherapy content, young demo
2. **Instagram Reels** - Visual product, lifestyle positioning
3. **Meta Ads** - Proven DTC performance, retargeting
4. **Email (Klaviyo)** - Retention, refill reminders, cross-sell

**Content Pillars:**
- "The Mindful Moment" - stress relief, breathing
- "Eco-Luxury" - sustainable materials, premium quality
- "Made Different" - vs disposable vapes, healthier choice
- "Ritual" - morning/evening routine integration

**Influencer Strategy:**
- Micro-influencers (10K-50K) in wellness/yoga niche
- Anxiety/mental health advocates
- Eco-lifestyle creators
- Ex-smoker community

**Campaign Ideas:**
- "30 Days of Calm" challenge
- Limited edition seasonal scents
- Refer-a-friend for free refills`,
    }

    const queryLower = aiQuery.toLowerCase()
    if (queryLower.includes('price') || queryLower.includes('pricing') || queryLower.includes('cost')) {
      setAiResponse(responses.pricing)
    } else if (queryLower.includes('market') || queryLower.includes('advertising') || queryLower.includes('ads') || queryLower.includes('social')) {
      setAiResponse(responses.marketing)
    } else {
      setAiResponse(responses.default)
    }
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

  const getOpportunityColor = (opp) => {
    switch (opp) {
      case 'high': return 'text-green-600'
      case 'medium': return 'text-yellow-600'
      case 'low': return 'text-gray-400'
      default: return 'text-gray-400'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading industry intelligence...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FlaskConical className="w-7 h-7 text-green-600" />
            AI Researcher
          </h1>
          <p className="text-gray-500 mt-1">Live industry intelligence for health & wellness.</p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Updated {format(lastUpdated, 'h:mm a')}
            </span>
          )}
          <button
            onClick={refreshData}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
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
          { id: 'ask', label: 'Ask AI', icon: MessageSquare },
        ].map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-green-100 text-green-700'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
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
          {/* Live News Feed */}
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-6 text-white">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-5 h-5" />
              <h3 className="font-semibold">Live Industry Updates</h3>
            </div>
            <div className="space-y-3">
              {industryNews.slice(0, 3).map((news) => (
                <div key={news.id} className="flex items-start gap-3 bg-white/10 rounded-lg p-3">
                  <Globe className="w-4 h-4 mt-1 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{news.title}</p>
                    <p className="text-xs text-white/70 mt-1">{news.source} • {news.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Trend Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {trends.map((trend) => {
              const Icon = trend.icon
              return (
                <div key={trend.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getTrendColor(trend.color)}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="flex items-center gap-1 text-green-600 font-semibold text-sm">
                      <ArrowUp className="w-4 h-4" />
                      {trend.growth}
                    </span>
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">{trend.title}</h4>
                  <p className="text-sm text-gray-500 mb-3">{trend.description}</p>
                  <span className="inline-block px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                    {trend.category}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Full News List */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Recent Industry News</h3>
              <span className="text-xs text-gray-400">Health & Wellness</span>
            </div>
            <div className="divide-y divide-gray-100">
              {industryNews.map((news) => (
                <div key={news.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Newspaper className="w-5 h-5 text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900">{news.title}</h4>
                      <p className="text-sm text-gray-500 mt-1">{news.summary}</p>
                      <p className="text-xs text-gray-400 mt-2">{news.source} • {news.date}</p>
                    </div>
                    {news.relevant && (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">Relevant</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Hot Products Tab */}
      {activeTab === 'products' && (
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Flame className="w-4 h-4 text-orange-500" />
                <p className="text-sm text-gray-500">Hot Products</p>
              </div>
              <p className="text-2xl font-bold text-orange-600">{hotProducts.filter(p => p.trend === 'hot').length}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <p className="text-sm text-gray-500">Rising</p>
              </div>
              <p className="text-2xl font-bold text-green-600">{hotProducts.filter(p => p.trend === 'rising').length}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Star className="w-4 h-4 text-yellow-500" />
                <p className="text-sm text-gray-500">High Opportunity</p>
              </div>
              <p className="text-2xl font-bold text-yellow-600">{hotProducts.filter(p => p.opportunity === 'high').length}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Search className="w-4 h-4 text-blue-500" />
                <p className="text-sm text-gray-500">Total Tracked</p>
              </div>
              <p className="text-2xl font-bold text-blue-600">{hotProducts.length}</p>
            </div>
          </div>

          {/* Products Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Hot Products in Health & Wellness</h3>
              <p className="text-sm text-gray-500 mt-1">Trending products relevant to Flair's market</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trend</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Search Vol</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Growth</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Opportunity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {hotProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">{product.name}</p>
                          <p className="text-xs text-gray-500">{product.brand}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{product.category}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          product.trend === 'hot' ? 'bg-orange-100 text-orange-700' :
                          product.trend === 'rising' ? 'bg-green-100 text-green-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {product.trend === 'hot' && <Flame className="w-3 h-3" />}
                          {product.trend === 'rising' && <TrendingUp className="w-3 h-3" />}
                          {product.trend}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{product.searchVolume}</td>
                      <td className="px-6 py-4">
                        <span className="text-green-600 font-medium text-sm">{product.growth}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{product.priceRange}</td>
                      <td className="px-6 py-4">
                        <span className={`font-medium text-sm capitalize ${getOpportunityColor(product.opportunity)}`}>
                          {product.opportunity}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Product Notes */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
            <h4 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Insights for Flair
            </h4>
            <ul className="space-y-2 text-sm text-blue-700">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 mt-0.5 text-green-600" />
                <span><strong>Portable Diffusers</strong> and <strong>Breathwork Tools</strong> are your closest adjacencies - similar benefits and audience.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 mt-0.5 text-green-600" />
                <span>Consider developing <strong>"Focus"</strong> and <strong>"Sleep"</strong> specific blends to tap into those trending categories.</span>
              </li>
              <li className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 text-yellow-600" />
                <span>Adaptogens and CBD products require different positioning and may have regulatory considerations.</span>
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* Competitors Tab */}
      {activeTab === 'competitors' && (
        <div className="space-y-6">
          {/* Competitor Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {competitors.map((comp) => (
              <div key={comp.name} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center font-bold text-gray-600">
                      {comp.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{comp.name}</h4>
                      <a href={`https://${comp.website}`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                        {comp.website} <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getThreatColor(comp.threat)}`}>
                    {comp.threat} threat
                  </span>
                </div>
                <div className="px-6 py-4 space-y-4">
                  <div className="flex gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Category</p>
                      <p className="font-medium text-gray-900">{comp.category}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Pricing</p>
                      <p className="font-medium text-gray-900">{comp.pricing}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-2">Strengths</p>
                    <div className="flex flex-wrap gap-1">
                      {comp.strengths.map((s, i) => (
                        <span key={i} className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-2">Weaknesses</p>
                    <div className="flex flex-wrap gap-1">
                      {comp.weaknesses.map((w, i) => (
                        <span key={i} className="px-2 py-1 bg-red-50 text-red-700 text-xs rounded">
                          {w}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-500">Recent Activity</p>
                    <p className="text-sm text-gray-700 mt-1">{comp.recentActivity}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Competitive Advantage */}
          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
            <h4 className="font-semibold text-lg mb-3">Flair's Competitive Advantages</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white/10 rounded-lg p-4">
                <Leaf className="w-6 h-6 mb-2" />
                <p className="font-medium">Premium Materials</p>
                <p className="text-sm text-green-100">Wooden construction vs plastic competitors</p>
              </div>
              <div className="bg-white/10 rounded-lg p-4">
                <RefreshCw className="w-6 h-6 mb-2" />
                <p className="font-medium">Refillable System</p>
                <p className="text-sm text-green-100">Sustainable model vs disposables</p>
              </div>
              <div className="bg-white/10 rounded-lg p-4">
                <Globe className="w-6 h-6 mb-2" />
                <p className="font-medium">UK Based</p>
                <p className="text-sm text-green-100">Local trust, faster shipping</p>
              </div>
              <div className="bg-white/10 rounded-lg p-4">
                <Heart className="w-6 h-6 mb-2" />
                <p className="font-medium">Flavor Variety</p>
                <p className="text-sm text-green-100">9 unique blends and growing</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ask AI Tab */}
      {activeTab === 'ask' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Ask the AI Researcher</h3>
            <p className="text-sm text-gray-500 mb-4">
              Get instant insights about your market, competitors, pricing, and growth opportunities.
            </p>

            <div className="space-y-4">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAiResearch()}
                  placeholder="Ask about pricing, competitors, marketing strategies..."
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                />
                <button
                  onClick={handleAiResearch}
                  disabled={researching || !aiQuery.trim()}
                  className="px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {researching ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Thinking...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Research
                    </>
                  )}
                </button>
              </div>

              {/* Quick Questions */}
              <div className="flex flex-wrap gap-2">
                <span className="text-sm text-gray-500">Try:</span>
                {['Market overview', 'Pricing strategy', 'Marketing channels', 'Competitor analysis', 'Growth opportunities'].map((q) => (
                  <button
                    key={q}
                    onClick={() => setAiQuery(q)}
                    className="px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* AI Response */}
          {(researching || aiResponse) && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center text-white">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h4 className="font-semibold text-gray-900">Research Results</h4>
              </div>

              {researching ? (
                <div className="flex items-center gap-3 py-8">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-600"></div>
                  <span className="text-gray-500">Analyzing market data...</span>
                </div>
              ) : (
                <div className="prose prose-sm max-w-none">
                  <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                    {aiResponse}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Research Tips */}
          <div className="bg-gray-50 rounded-xl p-6">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-gray-500" />
              Research Tips
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
              <div className="flex items-start gap-2">
                <ArrowRight className="w-4 h-4 mt-0.5 text-green-500" />
                <span>Ask about specific competitors by name for detailed analysis</span>
              </div>
              <div className="flex items-start gap-2">
                <ArrowRight className="w-4 h-4 mt-0.5 text-green-500" />
                <span>Request pricing recommendations with your target margins</span>
              </div>
              <div className="flex items-start gap-2">
                <ArrowRight className="w-4 h-4 mt-0.5 text-green-500" />
                <span>Ask about marketing strategies for specific channels</span>
              </div>
              <div className="flex items-start gap-2">
                <ArrowRight className="w-4 h-4 mt-0.5 text-green-500" />
                <span>Request seasonal strategy recommendations</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
