import { supabase } from '../../lib/supabase'

export default async function handler(req, res) {
  try {
    const { from, to } = req.query

    // Fetch all orders
    let orderQuery = supabase
      .from('orders')
      .select('total_price, subtotal_price, total_shipping, total_discount, financial_status, created_at')
      .not('created_at', 'is', null)

    if (from) orderQuery = orderQuery.gte('created_at', `${from}-01`)
    if (to) orderQuery = orderQuery.lte('created_at', `${to}-31T23:59:59`)

    const { data: orders, error: orderError } = await orderQuery
    if (orderError) throw orderError

    // Fetch ad spend overrides
    const { data: overrides } = await supabase
      .from('pnl_monthly_overrides')
      .select('*')
      .order('month')

    const overrideMap = {}
    ;(overrides || []).forEach(o => { overrideMap[o.month] = o })

    // Configurable rates (matching the spreadsheet)
    const rates = {
      cogs: 0.205,
      paymentProvider: 0.025,
      shippingFulfilment: 0.067,
    }

    // Group orders by month
    const monthlyData = {}
    ;(orders || []).forEach(order => {
      const month = order.created_at.substring(0, 7)
      if (!monthlyData[month]) {
        monthlyData[month] = {
          month,
          orders: 0,
          revenue: 0,
          subtotal: 0,
          shipping_income: 0,
          discounts: 0,
          refund_count: 0,
          refund_value: 0,
        }
      }
      const m = monthlyData[month]
      m.orders += 1
      m.revenue += parseFloat(order.total_price || 0)
      m.subtotal += parseFloat(order.subtotal_price || 0)
      m.shipping_income += parseFloat(order.total_shipping || 0)
      m.discounts += parseFloat(order.total_discount || 0)

      if (order.financial_status === 'refunded') {
        m.refund_count += 1
        m.refund_value += parseFloat(order.total_price || 0)
      }
    })

    // Build P&L for each month
    const months = Object.keys(monthlyData).sort()
    const pnl = months.map(month => {
      const m = monthlyData[month]
      const override = overrideMap[month] || {}

      const netSales = m.revenue - m.refund_value
      const returns = -m.refund_value
      const shippingCharges = m.shipping_income
      const totalRevenue = m.revenue

      const cogsRate = override.cogs_override != null ? override.cogs_override : rates.cogs
      const paymentProviders = totalRevenue * rates.paymentProvider
      const cogs = totalRevenue * (typeof cogsRate === 'number' && cogsRate < 1 ? cogsRate : rates.cogs)
      const shippingFulfilment = totalRevenue * rates.shippingFulfilment
      const salesExpenses = paymentProviders + cogs + shippingFulfilment

      const metaSpend = parseFloat(override.meta_spend || 0)
      const googleSpend = parseFloat(override.google_spend || 0)
      const marketingExpenses = metaSpend + googleSpend

      const contributionProfit = totalRevenue - salesExpenses - marketingExpenses
      const opex = parseFloat(override.opex || 0)
      const ebitda = contributionProfit - opex

      const aov = m.orders > 0 ? totalRevenue / m.orders : 0
      const totalAdSpend = marketingExpenses
      const ecpa = m.orders > 0 ? totalAdSpend / m.orders : 0
      const eroas = totalAdSpend > 0 ? totalRevenue / totalAdSpend : 0

      return {
        month,
        netSales: round(netSales),
        returns: round(returns),
        shippingCharges: round(shippingCharges),
        totalRevenue: round(totalRevenue),
        paymentProviders: round(paymentProviders),
        cogs: round(cogs),
        shippingFulfilment: round(shippingFulfilment),
        salesExpenses: round(salesExpenses),
        metaSpend: round(metaSpend),
        googleSpend: round(googleSpend),
        marketingExpenses: round(marketingExpenses),
        marketingPctRevenue: totalRevenue > 0 ? round((marketingExpenses / totalRevenue) * 100) : 0,
        contributionProfit: round(contributionProfit),
        opex: round(opex),
        ebitda: round(ebitda),
        ebitdaPct: totalRevenue > 0 ? round((ebitda / totalRevenue) * 100) : 0,
        orders: m.orders,
        aov: round(aov),
        ecpa: round(ecpa),
        eroas: round(eroas, 2),
        refundCount: m.refund_count,
      }
    })

    // Calculate totals
    const totals = pnl.reduce((acc, m) => {
      Object.keys(m).forEach(k => {
        if (k === 'month') return
        acc[k] = (acc[k] || 0) + m[k]
      })
      return acc
    }, {})
    totals.aov = totals.orders > 0 ? round(totals.totalRevenue / totals.orders) : 0
    totals.ecpa = totals.orders > 0 ? round(totals.marketingExpenses / totals.orders) : 0
    totals.eroas = totals.marketingExpenses > 0 ? round(totals.totalRevenue / totals.marketingExpenses, 2) : 0
    totals.ebitdaPct = totals.totalRevenue > 0 ? round((totals.ebitda / totals.totalRevenue) * 100) : 0
    totals.marketingPctRevenue = totals.totalRevenue > 0 ? round((totals.marketingExpenses / totals.totalRevenue) * 100) : 0

    res.json({ months: pnl, totals, rates })
  } catch (e) {
    console.error('PnL error:', e)
    res.status(500).json({ error: e.message || 'Failed to generate P&L' })
  }
}

function round(n, decimals = 2) {
  return Math.round(n * Math.pow(10, decimals)) / Math.pow(10, decimals)
}
