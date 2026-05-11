import { supabase } from '../../../lib/supabase'
import { getTransactions } from '../../../lib/paypal'

export const config = { maxDuration: 30 }

export default async function handler(req, res) {
  if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_SECRET) {
    return res.status(200).json({
      name: 'PayPal',
      status: 'not_configured',
      message: 'Set PAYPAL_CLIENT_ID and PAYPAL_SECRET in Vercel env vars',
    })
  }

  try {
    const end = new Date()
    const start = new Date(end.getTime() - 30 * 86400000)
    const txns = await getTransactions({
      start_date: start.toISOString(),
      end_date: end.toISOString(),
      page_size: 100,
    })

    const list = txns?.transaction_details || []
    const inflow = list.reduce((s, t) => {
      const amt = parseFloat(t.transaction_info?.transaction_amount?.value || 0)
      return amt > 0 ? s + amt : s
    }, 0)

    await supabase.from('integrations').upsert({
      id: 'paypal_sync',
      provider: 'paypal',
      last_sync: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      meta: { transactions: list.length, inflow_30d: inflow },
    })

    res.status(200).json({
      name: 'PayPal',
      status: 'ok',
      transactions: list.length,
      inflow_30d: inflow,
    })
  } catch (e) {
    res.status(200).json({
      name: 'PayPal',
      status: 'error',
      message: e.message,
    })
  }
}
