import { useState, useEffect } from 'react'
import { getCompetitors, supabase } from '../lib/supabase'

export default function Researcher() {
  const [competitors, setCompetitors] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeResearch, setActiveResearch] = useState('competitors')
  const [aiQuery, setAiQuery] = useState('')
  const [aiResponse, setAiResponse] = useState('')
  const [researching, setResearching] = useState(false)

  useEffect(() => {
    async function loadCompetitors() {
      try {
        const data = await getCompetitors()
        setCompetitors(data || [])
      } catch (err) {
        console.error('Error loading competitors:', err)
        // Use default competitors if table doesn't exist or is empty
        setCompetitors([
          { name: 'Ripple+', website: 'rippleplus.com', category: 'Aromatherapy Vapes', notes: 'Similar positioning' },
          { name: 'FÜUM', website: 'getfuum.com', category: 'Essential Oil Inhalers', notes: 'Premium segment' },
          { name: 'Monq', website: 'monq.com', category: 'Personal Diffusers', notes: 'US market leader' },
          { name: 'VitaStik', website: 'vitastik.com', category: 'Vitamin Inhalers', notes: 'Health-focused' },
          { name: 'Inhale Health', website: 'inhalehealth.com', category: 'Wellness Inhalers', notes: 'Vitamin B12 focus' },
          { name: 'Corked', website: 'getcorked.co', category: 'Wine Aroma', notes: 'Niche market' },
        ])
      } finally {
        setLoading(false)
      }
    }

    loadCompetitors()
  }, [])

  const handleAiResearch = async () => {
    if (!aiQuery.trim()) return

    setResearching(true)
    setAiResponse('')

    // Simulate AI response (in production, this would call an AI API)
    setTimeout(() => {
      const responses = {
        default: `Based on my analysis of the nicotine-free inhaler market:

**Market Overview:**
The nicotine-free aromatherapy inhaler market is growing at approximately 12% annually, driven by:
- Increasing health consciousness
- Smoking cessation trends
- Wellness lifestyle adoption

**Competitive Positioning for Flair:**
1. **Premium Quality** - Your wooden inhalers differentiate from plastic competitors
2. **UK-Based** - Local advantage in UK/EU markets
3. **Price Point** - Competitive at £29.99 for inhalers

**Recommendations:**
- Focus on subscription model for refills (recurring revenue)
- Emphasize the eco-friendly wooden design
- Target the 25-45 age demographic interested in wellness

**Key Metrics to Watch:**
- Customer Lifetime Value (aim for 6+ refill purchases)
- Repeat purchase rate
- Social proof (reviews, UGC)`,
        pricing: `**Pricing Analysis for Flair:**

Current Pricing:
- Inhalers: £29.99
- Refill Packs: £4.99

Competitor Comparison:
- Ripple+: £14.99 (disposable)
- FÜUM: £34.99 (premium)
- Monq: $20-30 USD (disposable)

**Recommendations:**
1. Your inhaler pricing is competitive for a reusable product
2. Consider a starter bundle at £39.99 (inhaler + 2 refills)
3. Subscription pricing at £4.49/pack could drive retention`,
        marketing: `**Marketing Strategy Recommendations:**

**Channel Priority:**
1. Meta Ads (Facebook/Instagram) - Visual products perform well
2. TikTok - Wellness trends, unboxing content
3. Email (Klaviyo) - Retention and cross-sell

**Content Angles:**
- "The mindful alternative" positioning
- Stress relief and relaxation benefits
- Eco-friendly materials story
- Made in UK quality

**Target Audiences:**
- Ex-smokers seeking oral fixation alternatives
- Wellness enthusiasts (yoga, meditation)
- Eco-conscious millennials`
      }

      const queryLower = aiQuery.toLowerCase()
      if (queryLower.includes('price') || queryLower.includes('pricing')) {
        setAiResponse(responses.pricing)
      } else if (queryLower.includes('market') || queryLower.includes('advertising') || queryLower.includes('ads')) {
        setAiResponse(responses.marketing)
      } else {
        setAiResponse(responses.default)
      }
      setResearching(false)
    }, 2000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AI Researcher</h1>
        <p className="text-gray-500 mt-1">Competitive intelligence and market insights powered by AI.</p>
      </div>

      {/* Research Tabs */}
      <div className="flex gap-2">
        {['competitors', 'insights', 'ask-ai'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveResearch(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeResearch === tab
                ? 'bg-green-100 text-green-700'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            {tab === 'competitors' && 'Competitors'}
            {tab === 'insights' && 'Market Insights'}
            {tab === 'ask-ai' && 'Ask AI'}
          </button>
        ))}
      </div>

      {/* Competitors Tab */}
      {activeResearch === 'competitors' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Competitor Tracking</h3>
              <p className="text-sm text-gray-500 mt-1">Monitor your key competitors in the aromatherapy inhaler space.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Competitor</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Website</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {competitors.map((competitor, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-medium text-gray-900">{competitor.name}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <a
                          href={`https://${competitor.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          {competitor.website}
                        </a>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {competitor.category}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {competitor.notes}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
            <h4 className="font-semibold">Competitive Advantage</h4>
            <p className="mt-2 text-green-100">
              Flair's key differentiators: Premium wooden construction, UK-based brand, refillable system with variety of flavors.
              Focus on sustainability and quality craftsmanship in your messaging.
            </p>
          </div>
        </div>
      )}

      {/* Market Insights Tab */}
      {activeResearch === 'insights' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Market Trends</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="text-green-500 mt-1">↑</span>
                  <div>
                    <p className="font-medium text-gray-900">Wellness Market Growth</p>
                    <p className="text-sm text-gray-500">12% CAGR in aromatherapy products</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-500 mt-1">↑</span>
                  <div>
                    <p className="font-medium text-gray-900">Eco-Conscious Consumers</p>
                    <p className="text-sm text-gray-500">73% prefer sustainable products</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-blue-500 mt-1">→</span>
                  <div>
                    <p className="font-medium text-gray-900">Subscription Economy</p>
                    <p className="text-sm text-gray-500">Recurring revenue models thriving</p>
                  </div>
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Opportunities</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="text-purple-500">💡</span>
                  <div>
                    <p className="font-medium text-gray-900">Gift Market</p>
                    <p className="text-sm text-gray-500">Premium packaging for gifting occasions</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-purple-500">💡</span>
                  <div>
                    <p className="font-medium text-gray-900">B2B / Corporate</p>
                    <p className="text-sm text-gray-500">Wellness programs, employee gifts</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-purple-500">💡</span>
                  <div>
                    <p className="font-medium text-gray-900">Seasonal Collections</p>
                    <p className="text-sm text-gray-500">Limited edition seasonal scents</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Target Customer Profile</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Age Range</p>
                <p className="text-lg font-semibold text-gray-900">25-45</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Primary Interest</p>
                <p className="text-lg font-semibold text-gray-900">Wellness & Self-Care</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Key Motivation</p>
                <p className="text-lg font-semibold text-gray-900">Stress Relief</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ask AI Tab */}
      {activeResearch === 'ask-ai' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Ask the AI Researcher</h3>
            <p className="text-sm text-gray-500 mb-4">
              Get instant insights about your market, competitors, pricing strategies, and growth opportunities.
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
                  className="px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {researching ? 'Researching...' : 'Research'}
                </button>
              </div>

              {/* Quick Questions */}
              <div className="flex flex-wrap gap-2">
                <span className="text-sm text-gray-500">Try:</span>
                {['Market overview', 'Pricing strategy', 'Marketing channels'].map((q) => (
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
                <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">
                  AI
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
        </div>
      )}
    </div>
  )
}
