// AI Task Suggestions API - Uses Claude to suggest new tasks for Flair

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { existingTasks, completedTasks } = req.body

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(200).json({
      suggestions: getStaticSuggestions(existingTasks),
      source: 'static'
    })
  }

  try {
    const prompt = `You are an AI assistant helping Flair, a UK-based D2C wellness brand that sells nicotine-free inhalers and aromatherapy products. They're scaling from side-hustle to full business.

Current active tasks (don't suggest duplicates):
${existingTasks?.slice(0, 10).map(t => `- ${t}`).join('\n') || 'None'}

Recently completed:
${completedTasks?.slice(0, 5).map(t => `- ${t}`).join('\n') || 'None'}

Suggest 3-4 NEW strategic tasks that would help Flair grow. Focus on:
- Marketing (Meta ads, email, organic social, influencers)
- Product development (bundles, subscriptions, new SKUs)
- Operations (finance, legal, processes)
- Customer retention (loyalty, reviews, referrals)

Return ONLY valid JSON in this exact format, no other text:
{
  "suggestions": [
    {
      "title": "Task title here",
      "description": "Brief description of what to do",
      "tags": ["marketing"],
      "priority": "high"
    }
  ]
}

Valid tags: finance, marketing, orders, products, urgent, ideas, operations
Valid priorities: high, medium, low`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 800,
        messages: [{ role: 'user', content: prompt }]
      })
    })

    if (!response.ok) {
      throw new Error('Claude API request failed')
    }

    const result = await response.json()
    const content = result.content?.[0]?.text || ''

    // Parse JSON from response
    try {
      const parsed = JSON.parse(content)
      return res.status(200).json({
        suggestions: parsed.suggestions || [],
        source: 'claude'
      })
    } catch (parseErr) {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        return res.status(200).json({
          suggestions: parsed.suggestions || [],
          source: 'claude'
        })
      }
      throw new Error('Failed to parse AI response')
    }
  } catch (err) {
    console.error('AI Suggestions error:', err)
    return res.status(200).json({
      suggestions: getStaticSuggestions(existingTasks),
      source: 'static',
      fallback: true
    })
  }
}

function getStaticSuggestions(existingTasks = []) {
  const allSuggestions = [
    {
      title: 'Set up abandoned cart email flow in Klaviyo',
      description: 'Create a 3-email sequence for cart abandoners with escalating urgency and a final discount offer.',
      tags: ['marketing'],
      priority: 'high'
    },
    {
      title: 'Create UGC content brief for micro-influencers',
      description: 'Write a template brief for influencer collaborations including key messaging, dos/donts, and content requirements.',
      tags: ['marketing', 'ideas'],
      priority: 'medium'
    },
    {
      title: 'Analyse Meta Ads creative performance',
      description: 'Review last 30 days of ad creatives, identify top performers by ROAS, and plan next creative tests.',
      tags: ['marketing'],
      priority: 'high'
    },
    {
      title: 'Set up Shopify subscription app for refills',
      description: 'Install Recharge or Seal Subscriptions, configure 15% subscribe-and-save discount on refill products.',
      tags: ['products', 'operations'],
      priority: 'high'
    },
    {
      title: 'Create starter bundle product',
      description: 'Design an inhaler + 3 refill packs bundle at a slight discount to increase AOV for new customers.',
      tags: ['products'],
      priority: 'medium'
    },
    {
      title: 'Set up monthly P&L review process',
      description: 'Create a simple spreadsheet tracking revenue, COGS, ad spend, and net margin. Review on 1st of each month.',
      tags: ['finance', 'operations'],
      priority: 'medium'
    },
    {
      title: 'Research TikTok Spark Ads',
      description: 'Investigate boosting organic TikTok content as ads. Low-cost way to test TikTok as acquisition channel.',
      tags: ['marketing', 'ideas'],
      priority: 'low'
    },
    {
      title: 'Collect and organize customer testimonials',
      description: 'Reach out to repeat customers for video/text reviews. Create a testimonials bank for ads and website.',
      tags: ['marketing'],
      priority: 'medium'
    },
    {
      title: 'Audit website for conversion rate improvements',
      description: 'Review product pages, checkout flow, and mobile experience. Identify quick wins to improve conversion.',
      tags: ['marketing', 'operations'],
      priority: 'medium'
    },
    {
      title: 'Plan seasonal product launch',
      description: 'Consider limited edition seasonal scent (summer citrus, winter spice) to create urgency and PR opportunity.',
      tags: ['products', 'ideas'],
      priority: 'low'
    }
  ]

  // Filter out tasks that are similar to existing ones
  const existingLower = existingTasks.map(t => t.toLowerCase())
  return allSuggestions
    .filter(s => !existingLower.some(e =>
      e.includes(s.title.toLowerCase().slice(0, 20)) ||
      s.title.toLowerCase().includes(e.slice(0, 20))
    ))
    .slice(0, 4)
}
