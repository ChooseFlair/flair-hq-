import { supabase } from '../../../lib/supabase'

export const config = { maxDuration: 30 }

export default async function handler(req, res) {
  const token = process.env.META_ACCESS_TOKEN || process.env.FACEBOOK_ACCESS_TOKEN
  const adAccount = process.env.META_AD_ACCOUNT_ID

  if (!token || !adAccount) {
    return res.status(200).json({
      name: 'Meta',
      status: 'not_configured',
      message: 'Set META_ACCESS_TOKEN and META_AD_ACCOUNT_ID in Vercel env vars',
    })
  }

  const accountId = adAccount.startsWith('act_') ? adAccount : `act_${adAccount}`
  const fields = 'spend,impressions,reach,clicks,unique_clicks,ctr,cpc,cpm,frequency,actions,action_values'
  const url = `https://graph.facebook.com/v21.0/${accountId}/insights?fields=${fields}&date_preset=last_30d&access_token=${encodeURIComponent(token)}`

  try {
    const r = await fetch(url)
    if (!r.ok) {
      const text = await r.text()
      return res.status(200).json({
        name: 'Meta',
        status: 'error',
        message: `Meta API ${r.status}: ${text.substring(0, 200)}`,
      })
    }
    const json = await r.json()
    const insight = json.data?.[0] || {}

    const purchaseAction = (insight.actions || []).find(a => a.action_type === 'purchase')
    const purchaseValue = (insight.action_values || []).find(a => a.action_type === 'purchase')

    const snapshot = {
      id: 'meta_30d',
      provider: 'meta',
      last_sync: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      meta: {
        spend: parseFloat(insight.spend || 0),
        impressions: parseInt(insight.impressions || 0),
        reach: parseInt(insight.reach || 0),
        clicks: parseInt(insight.clicks || 0),
        ctr: parseFloat(insight.ctr || 0),
        cpc: parseFloat(insight.cpc || 0),
        cpm: parseFloat(insight.cpm || 0),
        purchases: parseInt(purchaseAction?.value || 0),
        purchase_value: parseFloat(purchaseValue?.value || 0),
      },
    }

    await supabase.from('integrations').upsert(snapshot)

    return res.status(200).json({
      name: 'Meta',
      status: 'ok',
      spend: snapshot.meta.spend,
      purchases: snapshot.meta.purchases,
    })
  } catch (e) {
    return res.status(200).json({
      name: 'Meta',
      status: 'error',
      message: e.message,
    })
  }
}
