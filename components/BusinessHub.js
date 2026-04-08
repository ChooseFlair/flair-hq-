import { useState } from 'react'

const categories = [
  { id: 'store', label: 'Store & Products', color: '#1D9E75', bg: '#E1F5EE', text: '#085041', icon: '🛍' },
  { id: 'marketing', label: 'Marketing & Ads', color: '#534AB7', bg: '#EEEDFE', text: '#26215C', icon: '📣' },
  { id: 'email', label: 'Email & Flows', color: '#185FA5', bg: '#E6F1FB', text: '#042C53', icon: '📧' },
  { id: 'finance', label: 'Finance & Ops', color: '#BA7517', bg: '#FAEEDA', text: '#412402', icon: '💰' },
  { id: 'retention', label: 'Retention & CX', color: '#993C1D', bg: '#FAECE7', text: '#4A1B0C', icon: '💚' },
  { id: 'analytics', label: 'Analytics & Data', color: '#3B6D11', bg: '#EAF3DE', text: '#173404', icon: '📊' },
  { id: 'brand', label: 'Brand & Content', color: '#993556', bg: '#FBEAF0', text: '#4B1528', icon: '🎨' },
]

const features = [
  // Store & products (8)
  { n: 1, cat: 'store', icon: '🛍', name: 'Product catalogue manager', desc: 'All SKUs, bundles, and future lines in one view.', detail: 'Central Shopify product hub covering inhalers, refills, ear seeds, and upcoming SKUs. Manage stock, variants, pricing, and bundle logic (e.g. Starter Set) in one place.', links: ['Shopify', 'Xero'] },
  { n: 2, cat: 'store', icon: '📦', name: 'Packaging & fulfilment tracker', desc: 'Poly mailer vs kraft status, stock levels.', detail: 'Track Unpakful poly mailer stock (Starter Sets) and kraft mailer stock (refills). Log reorder points and link to supplier invoices in Xero.', links: ['Xero', 'Shopify'] },
  { n: 3, cat: 'store', icon: '💰', name: 'Pricing & AOV dashboard', desc: 'Live AOV vs £50 target with bundle modelling.', detail: 'Monitor current AOV against your £50 target. Scenario-model new product additions and bundle pricing to hit threshold. Feeds into ad ROAS calculation.', links: ['Shopify', 'Analytics'] },
  { n: 4, cat: 'store', icon: '🌿', name: 'Product expansion planner', desc: 'Aromatherapy & wellness pipeline tracking.', detail: 'Pipeline board for new SKUs — aromatherapy blends, accessories, ear seeds range extensions. Priority-scored by AOV impact and margin.', links: ['Klaviyo', 'Brand'] },
  { n: 5, cat: 'store', icon: '⭐', name: 'Reviews & UGC hub', desc: 'Collect, approve, and surface reviews.', detail: 'Centralise reviews from Reviews.io or Trustpilot. Flag UGC for repurposing in Meta ads and email. Track star rating trends over time.', links: ['Meta Ads', 'Email'] },
  { n: 6, cat: 'store', icon: '🏷', name: 'Discount & promo manager', desc: 'Codes, flash sales, and bundle offers.', detail: 'Create and track Shopify discount codes, time-limited flash sales, and bundle offers. Link to email flows and Meta ad sets to measure promo lift.', links: ['Shopify', 'Klaviyo'] },
  { n: 7, cat: 'store', icon: '🔄', name: 'Subscription & refill setup', desc: 'Refill subscription logic and intervals.', detail: 'Configure and monitor recurring refill subscriptions. Track subscription vs one-off revenue split and churn rate as a retention KPI.', links: ['Shopify', 'Klaviyo'] },
  { n: 8, cat: 'store', icon: '🌍', name: 'Horizon theme CRO log', desc: 'Track Shopify theme changes and uplift.', detail: 'Log all Horizon theme edits — CTA copy, hero images, colour tweaks — and correlate with conversion rate changes. Links to VWO for A/B tests.', links: ['VWO', 'Analytics'] },

  // Marketing & ads (8)
  { n: 9, cat: 'marketing', icon: '📣', name: 'Meta ads command centre', desc: 'CBO, retargeting, and page likes in one view.', detail: 'Dashboard across all Flair Meta campaigns: cold CBO, retargeting (consolidated per Andromeda), and page likes. Pixel ID 500331839710867.', links: ['Meta Ads', 'Analytics'] },
  { n: 10, cat: 'marketing', icon: '🎯', name: 'Audience builder', desc: 'Custom, lookalike, and retargeting audiences.', detail: 'Manage all Meta custom audiences — website visitors, purchasers, email list uploads. Build lookalikes off best buyers. Exclude recent purchasers from cold campaigns.', links: ['Meta Ads', 'Klaviyo'] },
  { n: 11, cat: 'marketing', icon: '🎬', name: 'Creative library', desc: 'Ad creatives, video rights, and performance.', detail: 'Central creative asset store. Track Francine affiliate video usage rights and expiry. Flag top-performing creatives by CTR and CPA for scaling.', links: ['Meta Ads', 'Brand'] },
  { n: 12, cat: 'marketing', icon: '📈', name: 'Ad spend & ROAS tracker', desc: 'Daily spend, ROAS, and CPP by campaign.', detail: 'Daily P&L for Meta ad spend across both ad accounts (act_671266992185192 and act_1280042125680628). Track CPP, ROAS, and blended CAC.', links: ['Meta Ads', 'Finance'] },
  { n: 13, cat: 'marketing', icon: '🤝', name: 'Affiliate manager', desc: 'Track affiliates, commissions, and content.', detail: 'Manage affiliate relationships like Francine. Track commission rates, content usage rights, performance, and payout schedule via Refersion or GoAffPro.', links: ['Shopify', 'Finance'] },
  { n: 14, cat: 'marketing', icon: '🔗', name: 'UTM & link tracker', desc: 'Campaign attribution across all channels.', detail: 'Build and manage UTM parameters for every channel — Meta, email, affiliate, organic. Map attribution back to Shopify orders and LTV.', links: ['Shopify', 'Analytics'] },
  { n: 15, cat: 'marketing', icon: '💡', name: 'A/B test log', desc: 'VWO tests, hypotheses, and results.', detail: 'Document all VWO and ad-level A/B tests. Store hypothesis, variants, results, and action taken. Reference for future test prioritisation.', links: ['VWO', 'Analytics'] },
  { n: 16, cat: 'marketing', icon: '🌱', name: 'Organic & SEO tracker', desc: 'Blog, Pinterest, and organic content KPIs.', detail: 'Track organic channel performance — blog posts, Pinterest pins, SEO keyword rankings. Link to brand content calendar and email flows.', links: ['Brand', 'Analytics'] },

  // Email & flows (8)
  { n: 17, cat: 'email', icon: '📧', name: 'Klaviyo flow library', desc: 'All active flows with status and metrics.', detail: 'Master view of every Klaviyo flow: Welcome Series, Abandoned Checkout, Post-Purchase Refill Reminder, Abandoned Basket (Paths A–D in progress). Status and open/click/revenue.', links: ['Klaviyo', 'Shopify'] },
  { n: 18, cat: 'email', icon: '🛒', name: 'Abandoned basket flow builder', desc: 'Paths A–D build progress tracker.', detail: 'Track build status of all four Abandoned Basket paths. Path A Emails 1–3 done; Email 4 and Paths B–D remaining. Includes variable syntax notes for Shopify.', links: ['Klaviyo'] },
  { n: 19, cat: 'email', icon: '👋', name: 'Welcome series manager', desc: 'Onboarding sequence performance and edits.', detail: 'Manage the Flair welcome series — tone of voice, educational content about nicotine-free inhalers, behaviour-change framing. Track open rates and conversion to first purchase.', links: ['Klaviyo', 'Analytics'] },
  { n: 20, cat: 'email', icon: '🔁', name: 'Post-purchase refill sequence', desc: 'Replenishment timing and conversion rate.', detail: 'Monitor the refill reminder flow — send timing vs average refill interval, open rate, and repurchase conversion. Key lever for improving 13–15% repeat rate.', links: ['Klaviyo', 'Retention'] },
  { n: 21, cat: 'email', icon: '🧹', name: 'List health & suppression', desc: 'Engagement scoring and suppression rules.', detail: 'Apply the suppression methodology from GAP (adapted for Flair). Identify unengaged contacts and suppress to protect deliverability and reduce cost.', links: ['Klaviyo'] },
  { n: 22, cat: 'email', icon: '📐', name: 'Template style guide', desc: 'Fonts, spacing, and formatting rules.', detail: 'Enforce the Klaviyo template rule: strip all inline text formatting from headings and body copy. Template controls font-family, size, weight, colour, line-height. Only keep margin, padding, text-align, text-transform.', links: ['Klaviyo', 'Brand'] },
  { n: 23, cat: 'email', icon: '🎁', name: 'Campaign planner', desc: 'Promotional and seasonal email calendar.', detail: 'Plan one-off campaigns — product launches, seasonal promotions, wellness moments. Link to product expansion planner and Meta ad calendar.', links: ['Klaviyo', 'Marketing'] },
  { n: 24, cat: 'email', icon: '📊', name: 'Email revenue attribution', desc: 'Flow vs campaign revenue breakdown.', detail: 'Track Klaviyo-attributed revenue split between flows and campaigns. Identify which flows drive the most incremental revenue vs last-touch.', links: ['Klaviyo', 'Finance'] },

  // Finance & ops (7)
  { n: 25, cat: 'finance', icon: '📒', name: 'Xero P&L dashboard', desc: 'Revenue, COGS, and net margin live.', detail: 'Real-time P&L via Xero Grow with Shopify integration. Track revenue, COGS (product + packaging), ad spend, and net margin. Director\'s loan balance tracked separately.', links: ['Xero', 'Shopify'] },
  { n: 26, cat: 'finance', icon: '💳', name: 'Cash flow & runway tracker', desc: 'Revolut balance and burn rate.', detail: 'Monitor Revolut Business balance against monthly burn (ad spend + COGS + subscriptions). Forecast months of runway and flag top-up triggers.', links: ['Xero', 'Revolut'] },
  { n: 27, cat: 'finance', icon: '🧾', name: 'Tax & compliance calendar', desc: 'VAT, Corporation Tax, and Companies House.', detail: 'Companies House confirmation statement due 13 May 2026. Track VAT registration threshold, Corporation Tax deadlines, and director salary/dividend planning.', links: ['Xero'] },
  { n: 28, cat: 'finance', icon: '📑', name: 'Director\'s loan ledger', desc: '0% credit card financing and repayment.', detail: 'Track director\'s loan balance from 0% credit card financing. Monitor repayment schedule and ensure compliant treatment in Xero.', links: ['Xero'] },
  { n: 29, cat: 'finance', icon: '🏭', name: 'COGS & margin calculator', desc: 'Per-unit cost breakdown by SKU.', detail: 'Calculate landed cost per unit — product, packaging (poly/kraft mailer + tissue), and fulfilment. Compare margin across SKUs to prioritise expansion.', links: ['Xero', 'Store'] },
  { n: 30, cat: 'finance', icon: '🤖', name: 'Subscription & SaaS spend tracker', desc: 'Klaviyo, Shopify, Meta, VWO costs.', detail: 'Monthly subscription cost log for all SaaS tools — Shopify, Klaviyo, Meta (agency fees if any), VWO, Revolut, Xero. Identify cost-to-revenue ratio.', links: ['Xero'] },
  { n: 31, cat: 'finance', icon: '🧮', name: 'Payroll & dividend planner', desc: 'Salary vs dividend optimisation.', detail: 'Model optimal director salary (NI threshold) plus dividend split each tax year. Flag when Flair profits justify extraction vs reinvestment.', links: ['Xero'] },

  // Retention & CX (7)
  { n: 32, cat: 'retention', icon: '💚', name: 'Repeat purchase tracker', desc: 'Current 13–15% rate vs target.', detail: 'Monitor cohort-based repeat purchase rate by acquisition month. Segment by product first purchased. Target improvement as core brand health metric.', links: ['Shopify', 'Klaviyo'] },
  { n: 33, cat: 'retention', icon: '🗣', name: 'Customer feedback log', desc: 'Support tickets, reviews, and insights.', detail: 'Aggregate feedback from reviews, support emails, and social. Tag by theme (product fit, taste, habit formation). Feed insights into product development and TOV.', links: ['Store', 'Brand'] },
  { n: 34, cat: 'retention', icon: '📉', name: 'Churn & lapse analysis', desc: 'Lapsed customers and win-back triggers.', detail: 'Identify customers who haven\'t repurchased within expected refill window. Trigger win-back Klaviyo flow. Segment by order value and product purchased.', links: ['Klaviyo', 'Email'] },
  { n: 35, cat: 'retention', icon: '🏅', name: 'LTV calculator', desc: 'Average LTV by acquisition channel.', detail: 'Calculate 90-day and 180-day LTV by channel (Meta cold vs retargeting vs email). Use to set Meta bid caps and evaluate CAC payback period.', links: ['Analytics', 'Finance'] },
  { n: 36, cat: 'retention', icon: '🧠', name: 'Behaviour-change content hub', desc: 'Educational content for habit formation.', detail: 'Centralise blog posts, email content, and product inserts that support the behaviour-change use case — nicotine replacement, stress relief, oral fixation.', links: ['Brand', 'Email'] },
  { n: 37, cat: 'retention', icon: '💬', name: 'Post-purchase NPS survey', desc: 'Satisfaction scores and qualitative data.', detail: 'Deploy post-purchase NPS via Klaviyo flow (30-day trigger). Segment promoters for review asks and UGC outreach. Use detractor data for product iteration.', links: ['Klaviyo', 'Store'] },
  { n: 38, cat: 'retention', icon: '🎀', name: 'VIP & loyalty programme', desc: 'Reward top customers and drive referrals.', detail: 'Define VIP tier thresholds (e.g. 3+ orders). Offer early access to new SKUs, loyalty discounts, and referral incentives. Build into Klaviyo segmentation.', links: ['Klaviyo', 'Shopify'] },

  // Analytics & data (6)
  { n: 39, cat: 'analytics', icon: '📡', name: 'Pixel & tracking health', desc: 'Meta pixel and Shopify event QA.', detail: 'Monitor Meta pixel (ID 500331839710867) event firing — ViewContent, AddToCart, Purchase. QA Shopify checkout tracking and ensure no duplicate events.', links: ['Meta Ads', 'Shopify'] },
  { n: 40, cat: 'analytics', icon: '📊', name: 'Blended performance dashboard', desc: 'Revenue, CAC, ROAS, and LTV in one view.', detail: 'Top-level Flair scorecard: monthly revenue, blended CAC, ROAS, AOV, repeat rate, and LTV. Updated weekly. Single source of truth for strategic decisions.', links: ['Shopify', 'Meta Ads', 'Klaviyo'] },
  { n: 41, cat: 'analytics', icon: '🔍', name: 'Conversion rate monitor', desc: 'Store CVR by traffic source.', detail: 'Track Shopify store CVR broken down by traffic source — Meta paid, email, organic, direct. Identify underperforming channels and landing page issues.', links: ['Shopify', 'VWO'] },
  { n: 42, cat: 'analytics', icon: '📅', name: 'Cohort analysis board', desc: 'Month-by-month customer cohort retention.', detail: 'Visual cohort table showing what % of each acquisition month\'s customers repurchase in months 1–6. Key for proving or disproving product-market fit.', links: ['Shopify', 'Retention'] },
  { n: 43, cat: 'analytics', icon: '🗺', name: 'Funnel visualiser', desc: 'Ad click → PDP → checkout → purchase.', detail: 'Map the full funnel: ad impression → click → product page → add to cart → checkout → purchase. Spot drop-off points for CRO prioritisation.', links: ['Meta Ads', 'VWO', 'Shopify'] },
  { n: 44, cat: 'analytics', icon: '📰', name: 'Weekly reporting template', desc: 'Auto-populated KPI report every Monday.', detail: 'Standardised weekly report pulling key metrics from Shopify, Klaviyo, and Meta. Covers revenue vs target, ad spend efficiency, email performance, and stock alerts.', links: ['Shopify', 'Klaviyo', 'Meta Ads'] },

  // Brand & content (6)
  { n: 45, cat: 'brand', icon: '🪷', name: 'Brand identity system', desc: 'Forum serif logo, palette, and guidelines.', detail: 'Central brand reference: Forum serif wordmark with lotus/wave mark, forest green (#1D9E75 family) and warm cream palette. Governs all touchpoints — packaging, email, ads, web.', links: ['Store', 'Email'] },
  { n: 46, cat: 'brand', icon: '🗓', name: 'Content calendar', desc: 'Organic, email, and ad content plan.', detail: 'Unified calendar for all content — blog posts, social, email campaigns, and ad creative briefs. Ensures consistent messaging and prevents channel conflicts.', links: ['Email', 'Marketing'] },
  { n: 47, cat: 'brand', icon: '🖼', name: 'Creative asset library', desc: 'Packshots, lifestyle imagery, and copy bank.', detail: 'Organised library of all brand assets — product photography, lifestyle images, copy variants by tone (calm, empowering, educational). Versioned for easy handoff.', links: ['Meta Ads', 'Email'] },
  { n: 48, cat: 'brand', icon: '✍️', name: 'TOV & copy guide', desc: 'Brand voice, claims, and messaging rules.', detail: 'Documents Flair\'s tone of voice — supportive, empowering, non-judgmental. Includes approved product claims, messaging hierarchy, and channel-specific adaptations.', links: ['Email', 'Store'] },
  { n: 49, cat: 'brand', icon: '📱', name: 'Social & influencer tracker', desc: 'Content schedule and influencer pipeline.', detail: 'Track social post schedule (Instagram, TikTok), influencer outreach pipeline, and gifting log. Link to affiliate manager for conversion tracking.', links: ['Marketing', 'Retention'] },
  { n: 50, cat: 'brand', icon: '🚀', name: 'Launch & campaign hub', desc: 'New product launch planning and go-to-market.', detail: 'End-to-end launch planner for new SKUs — lead time, creative brief, email campaign, Meta ad set, landing page. Linked to product expansion planner.', links: ['Store', 'Marketing', 'Email'] },
]

const catMap = {}
categories.forEach(c => catMap[c.id] = c)

export default function BusinessHub() {
  const [activeFilter, setActiveFilter] = useState('all')
  const [selectedFeature, setSelectedFeature] = useState(null)
  const [viewedFeatures, setViewedFeatures] = useState(new Set())

  const filteredFeatures = activeFilter === 'all'
    ? features
    : features.filter(f => f.cat === activeFilter)

  const openFeature = (feature) => {
    setSelectedFeature(feature)
    setViewedFeatures(prev => new Set([...prev, feature.n]))
  }

  const getCatStats = () => {
    return categories.map(cat => ({
      ...cat,
      count: features.filter(f => f.cat === cat.id).length
    }))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">Business Hub</h1>
        <p className="text-gray-500 mt-1">50 features across every pillar of the business, all linked together</p>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{filteredFeatures.length}</p>
          <p className="text-sm text-gray-500">features</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">7</p>
          <p className="text-sm text-gray-500">categories</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">12</p>
          <p className="text-sm text-gray-500">platforms</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{viewedFeatures.size}</p>
          <p className="text-sm text-gray-500">explored</p>
        </div>
      </div>

      {/* Filter Pills */}
      <div className="flex flex-wrap gap-2 justify-center">
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
            activeFilter === 'all'
              ? 'bg-green-600 text-white'
              : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
          }`}
        >
          All 50
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveFilter(cat.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeFilter === cat.id
                ? 'text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
            }`}
            style={activeFilter === cat.id ? { backgroundColor: cat.color } : {}}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Feature Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredFeatures.map(feature => {
          const cat = catMap[feature.cat]
          return (
            <div
              key={feature.n}
              onClick={() => openFeature(feature)}
              className="bg-white rounded-xl border border-gray-200 p-4 cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all"
              style={{ borderLeft: `3px solid ${cat.color}` }}
            >
              <div className="flex items-start gap-3 mb-2">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
                  style={{ backgroundColor: cat.bg }}
                >
                  {feature.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">
                    #{String(feature.n).padStart(2, '0')}
                  </p>
                  <p className="font-medium text-gray-900 leading-tight">{feature.name}</p>
                </div>
              </div>
              <p className="text-sm text-gray-500 mb-3">{feature.desc}</p>
              <span
                className="inline-block text-xs font-medium px-2 py-1 rounded-full"
                style={{ backgroundColor: cat.bg, color: cat.text }}
              >
                {cat.label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Modal */}
      {selectedFeature && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedFeature(null)}
        >
          <div
            className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 relative"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedFeature(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl"
            >
              x
            </button>

            <div className="flex items-center gap-4 mb-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                style={{ backgroundColor: catMap[selectedFeature.cat].bg }}
              >
                {selectedFeature.icon}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{selectedFeature.name}</h3>
                <p className="text-sm text-gray-500">
                  #{String(selectedFeature.n).padStart(2, '0')} · {catMap[selectedFeature.cat].label}
                </p>
              </div>
            </div>

            <p className="text-gray-600 leading-relaxed mb-4">{selectedFeature.detail}</p>

            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Connects to:</p>
              <div className="flex flex-wrap gap-2">
                {selectedFeature.links.map(link => (
                  <span
                    key={link}
                    className="px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded-full"
                  >
                    → {link}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Category Summary */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Categories Overview</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {getCatStats().map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveFilter(cat.id)}
              className="p-3 rounded-lg text-center hover:scale-105 transition-transform"
              style={{ backgroundColor: cat.bg }}
            >
              <p className="text-2xl mb-1">{cat.icon}</p>
              <p className="text-xs font-medium" style={{ color: cat.text }}>{cat.count} features</p>
              <p className="text-xs mt-1" style={{ color: cat.text, opacity: 0.7 }}>{cat.label}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
