// One-time API to seed strategic tasks - call once then delete
// GET /api/seed-tasks

export default function handler(req, res) {
  const strategicTasks = [
    // PHASE 1: Foundation & Attribution
    {
      id: 'strat-01',
      title: 'Resolve cookie consent / Meta pixel attribution gap',
      description: `New chooseflair.com domain + Horizon theme — consent blocking pixel fire on ~40–60% of sessions. Fixing this is worth more than any new campaign spend.

Action items:
• Implement Cookiebot or CookieYes with Shopify GTM wrapper
• Set Meta pixel to fire on consent grant (not page load) via GTM
• Enable Meta's Advanced Matching — pass email/phone hashed from checkout
• Turn on Conversions API (CAPI) server-side via Shopify native integration
• Verify event match quality score in Events Manager — target 7+/10`,
      tags: ['marketing', 'urgent'],
      priority: 'high',
      dueDate: '',
      completed: false,
      archived: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'strat-02',
      title: 'Complete all Klaviyo email flows',
      description: `Abandoned basket (product-aware routing), welcome series, post-purchase refill reminders, win-back. These are free revenue — do before scaling ad spend.

Action items:
• Abandoned basket: trigger split by product (inhaler vs refills vs ear seeds)
• Welcome series: 3 emails — brand story, product education, social proof/UGC
• Post-purchase: refill reminder at day 20–25 (usage-based)
• Win-back: 60 / 90 day lapsed with escalating discount
• Browse abandonment: fire on /products/ page exit`,
      tags: ['marketing', 'urgent'],
      priority: 'high',
      dueDate: '',
      completed: false,
      archived: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'strat-03',
      title: 'Set up Klaviyo SMS for refill reminders',
      description: `RECOMMENDATION: SMS open rates are 98% vs ~25% email. For a wellness brand with a repeat-purchase product (refills), a 1-message refill reminder SMS at day 22 will outperform most campaigns. Klaviyo SMS is already in your stack — low lift, high return.`,
      tags: ['marketing', 'ideas'],
      priority: 'medium',
      dueDate: '',
      completed: false,
      archived: false,
      createdAt: new Date().toISOString(),
    },

    // PHASE 2: Paid Acquisition
    {
      id: 'strat-04',
      title: 'Consolidate retargeting ad set (Andromeda principle)',
      description: `One retargeting ad set with all warm audiences pooled. Keep it consolidated, rotate creatives not audiences.

Action items:
• Keep: website visitors 180d + video views + page engagers in single ad set
• Test: dynamic product ads (DPA) retargeting — feeds from Shopify catalogue
• Frequency cap: 3x per week to avoid burnout on small warm audience
• Rotate 3 creative concepts every 2 weeks — testimonial, benefit, offer`,
      tags: ['marketing'],
      priority: 'high',
      dueDate: '',
      completed: false,
      archived: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'strat-05',
      title: 'Test cold CBO with 3 distinct creative angles',
      description: `Each angle should make a different emotional promise — don't run variations of the same message.

Creative angles to test:
• Angle A: Quit/reduce smoking — "nicotine-free, oral fixation solved"
• Angle B: Wellness aesthetic — "something beautiful you reach for instead"
• Angle C: Anxiety/stress — "something to do with your hands, no chemicals"
• Test formats: UGC-style video vs clean product shot vs talking head
• Run each for 7 days minimum before killing`,
      tags: ['marketing'],
      priority: 'high',
      dueDate: '',
      completed: false,
      archived: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'strat-06',
      title: 'Add TikTok Ads as second paid channel (Q3 2026)',
      description: `RECOMMENDATION: Wellness, smoking alternatives, and breathwork niches perform disproportionately well on TikTok. CPMs are 3–5× cheaper than Meta. Start with $5/day Spark Ads boosting organic content before building a dedicated TikTok creative machine.`,
      tags: ['marketing', 'ideas'],
      priority: 'low',
      dueDate: '',
      completed: false,
      archived: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'strat-07',
      title: 'Build subscription / bundle offer as core acquisition product',
      description: `RECOMMENDATION: Your inhaler + refills model is naturally subscriptive. A "Starter Kit + 3-month refill bundle" reduces upfront friction and locks in LTV. Meta ads to a bundle offer typically outperform single-SKU ads in CAC by 20–35% because the perceived value is higher.`,
      tags: ['products', 'marketing', 'ideas'],
      priority: 'high',
      dueDate: '',
      completed: false,
      archived: false,
      createdAt: new Date().toISOString(),
    },

    // PHASE 3: Content & Community
    {
      id: 'strat-08',
      title: 'Establish content pillars — post 4-5x/week on IG + TikTok',
      description: `Organic is the brand moat that lowers CAC over time. Pick 3 content pillars and post consistently.

Content pillars:
• Pillar 1: Education — "what's in your inhaler", oral fixation science
• Pillar 2: Lifestyle — aesthetic, calm, ritual content. Show the vibe
• Pillar 3: Community / transformation — customer stories, before/after
• Reuse: repurpose every TikTok as Instagram Reel
• Batch-shoot content once per fortnight — 2 hours = 2 weeks of posts`,
      tags: ['marketing'],
      priority: 'medium',
      dueDate: '',
      completed: false,
      archived: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'strat-09',
      title: 'Launch micro-influencer seeding programme (10-15 creators)',
      description: `RECOMMENDATION: Nano/micro influencers (5k–50k followers) in wellness, quit-smoking, and anxiety niches typically convert 3–8× better than macro. Send free product in exchange for 1 post + story. Cost: ~£200 in product. Potential: hundreds of warm-audience conversions and Spark Ad-ready video content.`,
      tags: ['marketing', 'ideas'],
      priority: 'medium',
      dueDate: '',
      completed: false,
      archived: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'strat-10',
      title: 'Build SEO content targeting quit-smoking / wellness searches',
      description: `Long-term free acquisition. Target "nicotine free inhaler", "oral fixation help quitting smoking", "ear seeds for anxiety".

Action items:
• Write 1 blog post per week — 800–1200 words, target 1 keyword each
• Priority keywords: "nicotine free inhaler UK", "how to quit vaping", "ear seeds NADA protocol"
• Add FAQ schema to product pages — gets rich snippets
• Internal linking: blog → product page for every relevant mention
• Timeline: 6–9 months to meaningful organic traffic`,
      tags: ['marketing'],
      priority: 'low',
      dueDate: '',
      completed: false,
      archived: false,
      createdAt: new Date().toISOString(),
    },

    // PHASE 4: Product & LTV
    {
      id: 'strat-11',
      title: 'Launch Shopify subscription (refills on repeat)',
      description: `Recurring revenue transforms the business. Refills are the perfect subscription product.

Action items:
• App: Recharge or Seal Subscriptions — both integrate with Shopify natively
• Offer: "Subscribe & Save 15%" on refills
• Show monthly vs one-time cost on PDP
• Post-purchase upsell: after inhaler purchase, offer refill subscription
• Subscription customers get dedicated Klaviyo segment for VIP flows`,
      tags: ['products'],
      priority: 'high',
      dueDate: '',
      completed: false,
      archived: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'strat-12',
      title: 'Expand product range — rubber tips, new scents, travel kit',
      description: `Prioritise by margin and perceived value — accessories are high margin, low shipping weight.

Timeline:
• Q2: Rubber tips — low cost, extends product life
• Q2: New scent refills (seasonal) — creates urgency
• Q3: Travel kit (inhaler + 2 refills + pouch) — gifting
• Q4: Ear seeds — expands into acupressure/wellness
• Bundle rule: every new product should be bundleable with core inhaler`,
      tags: ['products'],
      priority: 'medium',
      dueDate: '',
      completed: false,
      archived: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'strat-13',
      title: 'Launch loyalty / points programme (Smile.io)',
      description: `RECOMMENDATION: A points programme for a repeat-purchase product creates a "balance" that psychologically locks in the next purchase. Even at 5% of orders as points, it lifts repeat purchase rate significantly. Integrate with Klaviyo so points balance shows in emails — "You're 50 points from a free refill".`,
      tags: ['products', 'ideas'],
      priority: 'medium',
      dueDate: '',
      completed: false,
      archived: false,
      createdAt: new Date().toISOString(),
    },

    // PHASE 5: Brand & Positioning
    {
      id: 'strat-14',
      title: 'Define and own a specific brand positioning',
      description: `The wellness space is saturated. Flair needs to own a specific emotional territory.

Action items:
• Pick one: quit-smoking aid OR lifestyle wellness tool
• Recommendation: lead with lifestyle, convert with quit-smoking — wider funnel
• Create a brand manifesto page on site
• Name the ritual: "Your Flair Moment"
• Review all copy for coherence — does every touchpoint say the same thing?`,
      tags: ['marketing'],
      priority: 'medium',
      dueDate: '',
      completed: false,
      archived: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'strat-15',
      title: 'Get 1-2 PR placements in quit-smoking / wellness media',
      description: `RECOMMENDATION: A single mention in Healthline, Cosmopolitan, or quit-smoking blog does two things: (1) drives direct referral traffic, (2) gives you "As seen in" trust badge. Pitch angle: "nicotine-free alternative designed around habit replacement, not willpower." Use HARO (free) or one-off PR outreach.`,
      tags: ['marketing', 'ideas'],
      priority: 'low',
      dueDate: '',
      completed: false,
      archived: false,
      createdAt: new Date().toISOString(),
    },

    // PHASE 6: Operations & Business
    {
      id: 'strat-16',
      title: 'Set up Xero Grow with Shopify integration + monthly P&L review',
      description: `At scale, not knowing your real margins by product is dangerous. Know your COGS, ad spend %, and net margin weekly.

Action items:
• Xero Grow: connect Shopify → Xero for automated sales reconciliation
• Track separately: ad spend (Meta), COGS, Shopify fees, Klaviyo, fulfilment
• Build simple dashboard: revenue / ad spend / net margin per month
• Understand blended CAC and LTV:CAC ratio before scaling past £2k/mo ad spend
• Confirm salary + dividends structure with accountant`,
      tags: ['finance'],
      priority: 'high',
      dueDate: '',
      completed: false,
      archived: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'strat-17',
      title: 'Set monthly revenue target to replace GAP income',
      description: `Work backwards from your income replacement goal.

Action items:
• Calculate take-home equivalent from Flair after tax (salary + dividends)
• Work backwards: if AOV = £35 and margin = 55%, you need X orders/month
• Set 3 milestones: £1k/mo, £3k/mo, £5k/mo
• At £3k/mo revenue — consider part-time transition
• Build 3-month cash buffer before employment changes`,
      tags: ['finance'],
      priority: 'medium',
      dueDate: '',
      completed: false,
      archived: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'strat-18',
      title: 'Build referral programme (Give £5, Get £5)',
      description: `RECOMMENDATION: Quit-smoking and wellness products have natural word-of-mouth potential. Use ReferralCandy or Shopify native. Frame it as sharing the ritual, not a discount scheme — keeps the brand premium. Cost: ~£200 in product. Potential: free acquisition channel.`,
      tags: ['marketing', 'ideas'],
      priority: 'medium',
      dueDate: '',
      completed: false,
      archived: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'strat-19',
      title: 'File UK trademark for "Flair" in Classes 5 and 44',
      description: `RECOMMENDATION: As the brand grows, the name becomes the asset. Class 5 covers nicotine-free products and wellness supplements; Class 44 covers health/wellness services. A UK trademark costs ~£170 and takes ~4 months. Do this before scaling significantly — Companies House registration alone doesn't protect the brand name.`,
      tags: ['operations', 'urgent'],
      priority: 'high',
      dueDate: '',
      completed: false,
      archived: false,
      createdAt: new Date().toISOString(),
    },
  ]

  // Return the tasks as JSON - client will merge with localStorage
  res.status(200).json({
    tasks: strategicTasks,
    count: strategicTasks.length,
    instruction: 'Call /api/merge-tasks to add these to your Task Manager, or copy the tasks array to localStorage manually.'
  })
}
