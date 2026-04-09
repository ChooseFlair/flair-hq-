// PayPal transactions API
import { getTransactions, getBalance } from '../../../lib/paypal'

export default async function handler(req, res) {
  if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_SECRET) {
    return res.status(200).json({ needsAuth: true })
  }

  try {
    // Get last 31 days of transactions
    const endDate = new Date().toISOString()
    const startDate = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString()

    const [transactionsData, balanceData] = await Promise.all([
      getTransactions({ startDate, endDate, pageSize: 100 }),
      getBalance(),
    ])

    const transactions = transactionsData.transaction_details || []

    // Calculate summary stats
    let totalIncome = 0
    let totalFees = 0
    let transactionCount = 0

    const processedTransactions = transactions.map(tx => {
      const info = tx.transaction_info || {}
      const payer = tx.payer_info || {}
      const amount = parseFloat(info.transaction_amount?.value || 0)
      const fee = parseFloat(info.fee_amount?.value || 0)

      if (amount > 0) {
        totalIncome += amount
        transactionCount++
      }
      if (fee < 0) {
        totalFees += Math.abs(fee)
      }

      return {
        id: info.transaction_id,
        date: info.transaction_initiation_date,
        amount: amount,
        currency: info.transaction_amount?.currency_code || 'GBP',
        fee: fee,
        status: info.transaction_status,
        type: info.transaction_event_code,
        payerName: payer.payer_name?.alternate_full_name || payer.email_address || 'Unknown',
        payerEmail: payer.email_address,
        note: info.transaction_note,
      }
    })

    // Sort by date descending
    processedTransactions.sort((a, b) => new Date(b.date) - new Date(a.date))

    res.status(200).json({
      transactions: processedTransactions,
      summary: {
        totalIncome,
        totalFees,
        netIncome: totalIncome - totalFees,
        transactionCount,
        period: '31 days',
      },
      balance: balanceData?.balances?.[0] || null,
    })
  } catch (err) {
    console.error('PayPal API error:', err)
    res.status(500).json({ error: err.message })
  }
}
