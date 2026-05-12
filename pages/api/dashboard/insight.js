export const config = { maxDuration: 30 }

export default async function handler(req, res) {
  const host = req.headers['x-forwarded-host'] || req.headers.host
  const proto = req.headers['x-forwarded-proto'] || 'https'
  const base = `${proto}://${host}`

  const [pnl, inv, cash] = await Promise.all([
    fetch(`${base}/api/pnl-live?range=30d&compare=true`).then(r => r.json()).catch(() => null),
    fetch(`${base}/api/dashboard/inventory`).then(r => r.json()).catch(() => null),
    fetch(`${base}/api/dashboard/cash`).then(r => r.json()).catch(() => null),
  ])

  const insights = []

  // Stockouts / critical stock
  if (inv?.summary) {
    if (inv.summary.out > 0) {
      insights.push({ tone: 'rose', priority: 100, text: `${inv.summary.out} SKU${inv.summary.out === 1 ? ' is' : 's are'} out of stock — Shopify orders will reject those soon.` })
    } else if (inv.summary.critical > 0) {
      insights.push({ tone: 'amber', priority: 80, text: `${inv.summary.critical} SKU${inv.summary.critical === 1 ? ' has' : 's have'} less than 7 days of stock left. Reorder soon.` })
    } else if (inv.summary.low > 0) {
      insights.push({ tone: 'amber', priority: 40, text: `${inv.summary.low} SKU${inv.summary.low === 1 ? ' is' : 's are'} running low (under 21 days of cover).` })
    }
  }

  // Cash runway
  if (cash?.connected && cash.runwayMonths != null) {
    if (cash.runwayMonths < 1) {
      insights.push({ tone: 'rose', priority: 95, text: `Runway is under 1 month at current burn (£${cash.totalGBP}). Cut spending or pump revenue.` })
    } else if (cash.runwayMonths < 3) {
      insights.push({ tone: 'amber', priority: 70, text: `Runway is ${cash.runwayMonths.toFixed(1)} months. Worth keeping an eye on cash.` })
    } else if (cash.runwayMonths > 12) {
      insights.push({ tone: 'emerald', priority: 10, text: `Solid runway — ${cash.runwayMonths.toFixed(1)} months at current burn. Could push harder on growth.` })
    }
  }

  // ROAS / EBITDA signals
  if (pnl?.totals?.kpis) {
    const roas = pnl.totals.kpis.eroas
    const ebitda = pnl.totals.profit?.ebitda
    if (roas != null && roas < 1) {
      insights.push({ tone: 'rose', priority: 85, text: `30-day ROAS is ${roas.toFixed(2)}x — ads are losing money. Pause underperformers.` })
    } else if (roas != null && roas > 3) {
      insights.push({ tone: 'emerald', priority: 15, text: `ROAS is ${roas.toFixed(2)}x — ads are flying. Scale wins.` })
    }
    if (ebitda != null && ebitda < 0) {
      insights.push({ tone: 'rose', priority: 75, text: `EBITDA is £${ebitda.toFixed(0)} for the last 30 days. Costs are above contribution.` })
    }
  }

  // Period-over-period revenue
  if (pnl?.totals?.revenue && pnl?.comparisons?.prevPeriod?.totals?.revenue) {
    const curr = pnl.totals.revenue.totalRevenue
    const prev = pnl.comparisons.prevPeriod.totals.revenue.totalRevenue
    if (prev > 0) {
      const change = ((curr - prev) / prev) * 100
      if (change > 25) {
        insights.push({ tone: 'emerald', priority: 20, text: `Revenue up ${change.toFixed(0)}% vs previous 30 days. Whatever you're doing — keep doing it.` })
      } else if (change < -25) {
        insights.push({ tone: 'rose', priority: 65, text: `Revenue down ${Math.abs(change).toFixed(0)}% vs previous 30 days. Worth a look.` })
      }
    }
  }

  // Pick highest-priority insight
  insights.sort((a, b) => b.priority - a.priority)
  const top = insights[0] || { tone: 'slate', priority: 0, text: 'Nothing urgent to flag right now. Carry on.' }

  res.status(200).json({
    insight: top,
    totalSignals: insights.length,
    generatedAt: new Date().toISOString(),
  })
}
