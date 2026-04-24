// Meta Ads overview - cached data from Pipeboard
// This data is refreshed via Claude Code + Pipeboard integration

export default async function handler(req, res) {
  // Latest data fetched via Pipeboard on 2026-04-09
  // Time range: Last 30 days (2026-03-10 to 2026-04-08)

  const metaData = {
    account: {
      id: 'act_671266992185192',
      name: 'Flair',
      currency: 'GBP',
      totalSpent: 24677.82,
      balance: 550.41,
    },
    insights: {
      timeRange: {
        start: '2026-03-10',
        end: '2026-04-08',
      },
      spend: 1695.71,
      impressions: 122284,
      reach: 71716,
      clicks: 5550,
      uniqueClicks: 4018,
      ctr: 4.54,
      cpc: 0.31,
      cpm: 13.87,
      frequency: 1.71,
      purchases: 48,
      purchaseValue: 2403.31,
      roas: 1.42,
      cpa: 35.33,
      addToCart: 79,
      initiateCheckout: 85,
      landingPageViews: 1514,
      videoViews: 31654,
      pageEngagement: 34673,
      postEngagement: 34512,
      likes: 161,
      comments: 16,
    },
    campaigns: [
      {
        id: '23854382627600799',
        name: 'PAGE LIKES - BROAD',
        objective: 'OUTCOME_ENGAGEMENT',
        status: 'ACTIVE',
        dailyBudget: null,
        startTime: '2026-03-24',
      },
      {
        id: '23854121937690799',
        name: 'UK - RET - SALES',
        objective: 'OUTCOME_SALES',
        status: 'ACTIVE',
        dailyBudget: 15.00,
        startTime: '2026-03-17',
      },
      {
        id: '23848689474880799',
        name: 'UK - CBO - SALES',
        objective: 'OUTCOME_SALES',
        status: 'ACTIVE',
        dailyBudget: 45.00,
        startTime: '2025-07-28',
      },
      {
        id: '23850942325850799',
        name: 'OLD - CBO - TARGET CAC',
        objective: 'OUTCOME_SALES',
        status: 'PAUSED',
        dailyBudget: 35.00,
        startTime: '2025-10-28',
      },
      {
        id: '23850942277700799',
        name: 'OLD - CBO - CREATIVE TESTING',
        objective: 'OUTCOME_SALES',
        status: 'PAUSED',
        dailyBudget: 35.00,
        startTime: '2025-10-28',
      },
    ],
    lastUpdated: '2026-04-09T22:30:00Z',
  }

  res.status(200).json(metaData)
}
