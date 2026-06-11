import { supabase } from '../../../lib/supabase'

const LOW_STOCK_THRESHOLD = 10

export default async function handler(req, res) {
  try {
    const today = new Date().toISOString().split('T')[0]
    const d1 = new Date(Date.now() - 1 * 86400000)
    const d7 = new Date(Date.now() - 7 * 86400000)
    const d30 = new Date(Date.now() - 30 * 86400000)

    const { data: orders } = await supabase
      .from('orders')
      .select('total_price, financial_status, fulfillment_status, created_at, email')
      .gte('created_at', d30.toISOString())
      .order('created_at', { ascending: false })

    const { data: products } = await supabase
      .from('products')
      .select('title, sku, price, inventory_quantity, status')

    const all = orders || []
    const last24 = all.filter(o => new Date(o.created_at) >= d1)
    const last7 = all.filter(o => new Date(o.created_at) >= d7)
    const refunds7 = last7.filter(o => o.financial_status === 'refunded')
    const unfulfilled = all.filter(o => o.fulfillment_status !== 'fulfilled' && o.financial_status === 'paid')

    const sum = arr => arr.reduce((s, o) => s + parseFloat(o.total_price || 0), 0)
    const lowStock = (products || []).filter(p => p.status === 'active' && p.inventory_quantity != null && p.inventory_quantity <= LOW_STOCK_THRESHOLD)

    const content = {
      date: today,
      last_24h: { orders: last24.length, revenue: sum(last24).toFixed(2) },
      last_7d: {
        orders: last7.length,
        revenue: sum(last7).toFixed(2),
        aov: last7.length ? (sum(last7) / last7.length).toFixed(2) : 0,
        refunds: refunds7.length,
        refund_value: sum(refunds7).toFixed(2),
      },
      last_30d: { orders: all.length, revenue: sum(all).toFixed(2) },
      unfulfilled_paid_orders: unfulfilled.length,
      low_stock: lowStock.map(p => ({ title: p.title, sku: p.sku, qty: p.inventory_quantity })),
      flags: [
        ...(refunds7.length >= 3 ? [`⚠️ ${refunds7.length} refunds in the last 7 days`] : []),
        ...(unfulfilled.length >= 5 ? [`⚠️ ${unfulfilled.length} paid orders awaiting fulfilment`] : []),
        ...(lowStock.length > 0 ? [`⚠️ ${lowStock.length} product(s) low on stock`] : []),
      ],
    }

    const markdown = [
      `# Flair Daily Report — ${today}`,
      ``,
      `## Last 24h`,
      `- Orders: ${content.last_24h.orders}`,
      `- Revenue: £${content.last_24h.revenue}`,
      ``,
      `## Last 7 days`,
      `- Orders: ${content.last_7d.orders} | Revenue: £${content.last_7d.revenue} | AOV: £${content.last_7d.aov}`,
      `- Refunds: ${content.last_7d.refunds} (£${content.last_7d.refund_value})`,
      ``,
      `## Operations`,
      `- Unfulfilled paid orders: ${content.unfulfilled_paid_orders}`,
      `- Low stock items: ${content.low_stock.length ? content.low_stock.map(p => `${p.title} (${p.qty} left)`).join(', ') : 'none'}`,
      ``,
      ...(content.flags.length ? [`## Flags`, ...content.flags.map(f => `- ${f}`)] : [`✅ No flags today`]),
    ].join('\n')

    // Upsert today's report (read-only action — auto-allowed per CLAUDE.md)
    await supabase.from('daily_reports').upsert(
      { report_date: today, content, markdown },
      { onConflict: 'report_date' }
    )

    res.json({ ok: true, report: content, markdown })
  } catch (e) {
    console.error('Daily report error:', e)
    res.status(500).json({ error: e.message })
  }
}
