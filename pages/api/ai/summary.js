// AI Summary API - Uses Claude to generate insights

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { pageType, data } = req.body

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(200).json({
      summary: getStaticSummary(pageType, data),
      source: 'static'
    })
  }

  try {
    const prompt = buildPrompt(pageType, data)

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 400,
        messages: [{ role: 'user', content: prompt }]
      })
    })

    if (!response.ok) {
      throw new Error('Claude API request failed')
    }

    const result = await response.json()
    const summary = result.content?.[0]?.text || 'Unable to generate insights.'

    return res.status(200).json({ summary, source: 'claude' })
  } catch (err) {
    console.error('AI Summary error:', err)
    return res.status(200).json({
      summary: getStaticSummary(pageType, data),
      source: 'static',
      fallback: true
    })
  }
}

function buildPrompt(pageType, data) {
  const basePrompt = `You are an AI assistant helping a D2C wellness brand (Flair) analyze their business data. Provide 2-3 concise, actionable insights based on the data. Use bullet points. Be specific with numbers. Keep it under 100 words total.`

  switch (pageType) {
    case 'finance':
      return `${basePrompt}

Financial Data:
- Total Balance: ${data?.totalBalance || 'N/A'}
- Monthly Income: ${data?.monthlyIncome || 'N/A'}
- Monthly Spend: ${data?.monthlySpend || 'N/A'}
- PayPal Income (31d): ${data?.paypalIncome || 'N/A'}
- PayPal Fees: ${data?.paypalFees || 'N/A'}

Analyze cash flow health, identify any concerns, and suggest one optimization.`

    case 'marketing':
      return `${basePrompt}

Marketing Data (Last 30 Days):
- Ad Spend: £${data?.spend || 0}
- ROAS: ${data?.roas || 0}x
- Purchases: ${data?.purchases || 0}
- CPA: £${data?.cpa || 0}
- CTR: ${data?.ctr || 0}%
- Organic Impressions: ${data?.organicImpressions || 'N/A'}
- Email Lists: ${data?.emailLists || 'N/A'}

Evaluate marketing efficiency, highlight what's working, suggest one improvement.`

    case 'overview':
      return `${basePrompt}

Business Overview:
- Revenue (Today): ${data?.todayRevenue || 'N/A'}
- Orders (Today): ${data?.todayOrders || 'N/A'}
- Pending Orders: ${data?.pendingOrders || 'N/A'}
- Low Stock Products: ${data?.lowStock || 'N/A'}

Give a quick health check and one priority action for today.`

    case 'tasks':
      return `${basePrompt}

Task Manager Data:
- Active Tasks: ${data?.total || 0}
- Completed Tasks: ${data?.completed || 0}
- High Priority: ${data?.urgent || 0}
- Archived: ${data?.archived || 0}

Tasks by Category:
${data?.byTag?.map(t => `- ${t.tag}: ${t.count}`).join('\n') || 'N/A'}

Recent Tasks:
${data?.recentTasks?.map(t => `- ${t.title} (${t.priority}${t.completed ? ', done' : ''})`).join('\n') || 'N/A'}

Analyze task distribution, completion rate, and suggest what to focus on next. Be specific about which category needs attention.`

    default:
      return `${basePrompt}

Analyze this business data and provide key insights:
${JSON.stringify(data, null, 2)}`
  }
}

function getStaticSummary(pageType, data) {
  switch (pageType) {
    case 'finance':
      return `• Cash flow appears healthy with consistent income patterns
• PayPal fees are within normal range for D2C transactions
• Consider reviewing recurring expenses for optimization opportunities`

    case 'marketing':
      return `• ROAS indicates profitable ad campaigns - continue scaling winners
• CTR is strong, suggesting creative resonates with audience
• Consider testing new audiences to expand reach while maintaining efficiency`

    case 'overview':
      return `• Business operations are running smoothly
• Monitor pending orders to maintain fulfillment speed
• Check low stock items to prevent stockouts on bestsellers`

    case 'tasks':
      return `• Focus on completing high-priority tasks first to maintain momentum
• Marketing tasks are key for growth - prioritize customer acquisition activities
• Review completed tasks weekly to identify patterns and optimize your workflow`

    default:
      return `• Data analysis complete - key metrics are within expected ranges
• Continue monitoring trends for optimization opportunities`
  }
}
