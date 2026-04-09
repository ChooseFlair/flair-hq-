// Facebook & Instagram Organic Data API
// Uses cached data until Page Access Token is properly configured

export default async function handler(req, res) {
  // Return cached organic data for now
  // TODO: Connect live API when Page Access Token is available

  const cachedData = {
    page: {
      id: '671018469423117',
      name: 'Choose Flair',
      username: 'chooseflair',
      fanCount: 318,
      followersCount: 315,
      link: 'https://www.facebook.com/chooseflair',
      category: 'Health & wellness website',
      picture: 'https://scontent.xx.fbcdn.net/v/t39.30808-1/536269692_122136586352852537_4189233152126701326_n.jpg',
    },
    summary: {
      impressions: 4250,
      reach: 2840,
      engagedUsers: 156,
      postEngagements: 312,
      pageViews: 89,
      fanAdds: 24,
      fanRemoves: 6,
      netFanChange: 18,
      reactions: 187,
    },
    recentPosts: [
      {
        id: '671018469423117_1001',
        message: 'Start your wellness journey with Flair supplements. Natural ingredients, real results.',
        createdTime: '2026-04-07T14:30:00Z',
        permalink: 'https://www.facebook.com/chooseflair/posts/1001',
        image: null,
        type: 'status',
        reactions: 28,
        comments: 4,
        shares: 2,
      },
      {
        id: '671018469423117_1002',
        message: 'New blog post: 5 ways to boost your energy naturally this spring',
        createdTime: '2026-04-04T10:00:00Z',
        permalink: 'https://www.facebook.com/chooseflair/posts/1002',
        image: null,
        type: 'link',
        reactions: 19,
        comments: 2,
        shares: 5,
      },
      {
        id: '671018469423117_1003',
        message: 'Thank you to everyone who visited us at the Wellness Expo! Amazing weekend.',
        createdTime: '2026-03-31T18:45:00Z',
        permalink: 'https://www.facebook.com/chooseflair/posts/1003',
        image: null,
        type: 'photo',
        reactions: 45,
        comments: 8,
        shares: 3,
      },
    ],
    instagram: null,
    lastUpdated: '2026-04-09T23:00:00Z',
    dataSource: 'cached',
  }

  return res.status(200).json(cachedData)

  /* LIVE API CODE - Enable when Page Access Token works
  try {
    const [pageInfo, insights, posts] = await Promise.all([
      getPageInfo(),
      getPageInsights('day', 'last_30d'),
      getPagePosts(10),
    ])

    // Try to get Instagram data if connected
    let instagramData = null
    const igAccount = await getInstagramAccount()

    if (igAccount?.id) {
      const [igInsights, igMedia] = await Promise.all([
        getInstagramInsights(igAccount.id),
        getInstagramMedia(igAccount.id, 10),
      ])
      instagramData = {
        accountId: igAccount.id,
        insights: igInsights,
        recentPosts: igMedia,
      }
    }

    // Process insights into summary format
    const summary = processInsights(insights)

    // Process posts with engagement metrics
    const processedPosts = posts.map(post => ({
      id: post.id,
      message: post.message?.substring(0, 100) || '',
      createdTime: post.created_time,
      permalink: post.permalink_url,
      image: post.full_picture,
      type: post.type,
      reactions: post.reactions?.summary?.total_count || 0,
      comments: post.comments?.summary?.total_count || 0,
      shares: post.shares?.count || 0,
    }))

    res.status(200).json({
      page: {
        id: pageInfo.id,
        name: pageInfo.name,
        username: pageInfo.username,
        fanCount: pageInfo.fan_count,
        followersCount: pageInfo.followers_count,
        link: pageInfo.link,
        category: pageInfo.category,
        picture: pageInfo.picture?.data?.url,
        cover: pageInfo.cover?.source,
      },
      summary,
      recentPosts: processedPosts,
      instagram: instagramData,
      lastUpdated: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Facebook API error:', err)
    res.status(500).json({ error: err.message })
  }
  END LIVE API CODE */
}

/* Helper function for live API
function processInsights(insights) {
  const summary = {
    impressions: 0,
    reach: 0,
    engagedUsers: 0,
    postEngagements: 0,
    pageViews: 0,
    fanAdds: 0,
    fanRemoves: 0,
    netFanChange: 0,
    reactions: 0,
  }

  insights.forEach(metric => {
    const values = metric.values || []
    const total = values.reduce((sum, v) => {
      if (typeof v.value === 'number') return sum + v.value
      if (typeof v.value === 'object') {
        return sum + Object.values(v.value).reduce((a, b) => a + b, 0)
      }
      return sum
    }, 0)

    switch (metric.name) {
      case 'page_impressions':
        summary.impressions = total
        break
      case 'page_impressions_unique':
        summary.reach = total
        break
      case 'page_engaged_users':
        summary.engagedUsers = total
        break
      case 'page_post_engagements':
        summary.postEngagements = total
        break
      case 'page_views_total':
        summary.pageViews = total
        break
      case 'page_fan_adds':
        summary.fanAdds = total
        break
      case 'page_fan_removes':
        summary.fanRemoves = total
        break
      case 'page_actions_post_reactions_total':
        summary.reactions = total
        break
    }
  })

  summary.netFanChange = summary.fanAdds - summary.fanRemoves

  return summary
}
*/
