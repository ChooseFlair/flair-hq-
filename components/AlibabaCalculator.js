import { useState, useEffect } from 'react'
import {
  Plus,
  Trash2,
  Copy,
  Check,
  Package,
  Calculator,
  Send,
  ExternalLink,
  DollarSign,
  Truck,
  X,
  Save,
  FileText,
} from 'lucide-react'

const DEFAULT_ITEMS = [
  { id: '1', name: 'Walnut Inhaler Body', quantity: 1000, unitCost: 1.20, moq: 500, supplier: '' },
  { id: '2', name: 'Oak Inhaler Body', quantity: 1000, unitCost: 1.20, moq: 500, supplier: '' },
  { id: '3', name: 'Spearmint Refill Pods', quantity: 5000, unitCost: 0.15, moq: 1000, supplier: '' },
  { id: '4', name: 'Rubber Tips (Black)', quantity: 3000, unitCost: 0.05, moq: 1000, supplier: '' },
]

export default function AlibabaCalculator() {
  const [items, setItems] = useState([])
  const [shippingMethod, setShippingMethod] = useState('sea')
  const [shippingCost, setShippingCost] = useState(350)
  const [exchangeRate, setExchangeRate] = useState(0.11) // USD to GBP approx
  const [showDraftModal, setShowDraftModal] = useState(false)
  const [copied, setCopied] = useState(false)
  const [savedDrafts, setSavedDrafts] = useState([])
  const [companyName, setCompanyName] = useState('Flair')
  const [contactName, setContactName] = useState('')

  // Load saved data
  useEffect(() => {
    const saved = localStorage.getItem('alibaba_calculator')
    if (saved) {
      const data = JSON.parse(saved)
      setItems(data.items || DEFAULT_ITEMS)
      setShippingCost(data.shippingCost || 350)
      setExchangeRate(data.exchangeRate || 0.11)
      setCompanyName(data.companyName || 'Flair')
      setContactName(data.contactName || '')
    } else {
      setItems(DEFAULT_ITEMS)
    }

    const drafts = localStorage.getItem('alibaba_drafts')
    if (drafts) {
      setSavedDrafts(JSON.parse(drafts))
    }
  }, [])

  // Save data
  useEffect(() => {
    localStorage.setItem('alibaba_calculator', JSON.stringify({
      items,
      shippingCost,
      exchangeRate,
      companyName,
      contactName,
    }))
  }, [items, shippingCost, exchangeRate, companyName, contactName])

  const addItem = () => {
    setItems([...items, {
      id: Date.now().toString(),
      name: '',
      quantity: 1000,
      unitCost: 0,
      moq: 500,
      supplier: '',
    }])
  }

  const updateItem = (id, field, value) => {
    setItems(items.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ))
  }

  const removeItem = (id) => {
    setItems(items.filter(item => item.id !== id))
  }

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0)
  }

  const calculateTotal = () => {
    return calculateSubtotal() + shippingCost
  }

  const calculateTotalGBP = () => {
    return calculateTotal() * exchangeRate
  }

  const calculateUnitCostWithShipping = (item) => {
    const totalUnits = items.reduce((sum, i) => sum + i.quantity, 0)
    const shippingPerUnit = totalUnits > 0 ? shippingCost / totalUnits : 0
    return item.unitCost + shippingPerUnit
  }

  const formatUSD = (value) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const formatGBP = (value) => `£${value.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const generateDraftMessage = () => {
    const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

    let message = `Subject: Quotation Request - ${companyName} Order Inquiry\n\n`
    message += `Dear Supplier,\n\n`
    message += `I hope this message finds you well. My name is ${contactName || '[Your Name]'} from ${companyName}, a wellness brand based in the UK.\n\n`
    message += `We are interested in placing an order for the following items and would like to request a quotation:\n\n`
    message += `─────────────────────────────────────\n`
    message += `ORDER DETAILS\n`
    message += `─────────────────────────────────────\n\n`

    items.forEach((item, index) => {
      message += `${index + 1}. ${item.name || 'Product ' + (index + 1)}\n`
      message += `   • Quantity: ${item.quantity.toLocaleString()} units\n`
      message += `   • Target Unit Price: ${formatUSD(item.unitCost)}\n`
      if (item.moq) message += `   • MOQ Noted: ${item.moq.toLocaleString()} units\n`
      message += `\n`
    })

    message += `─────────────────────────────────────\n`
    message += `SHIPPING REQUIREMENTS\n`
    message += `─────────────────────────────────────\n\n`
    message += `• Destination: United Kingdom\n`
    message += `• Preferred Shipping: ${shippingMethod === 'sea' ? 'Sea Freight (DDP)' : shippingMethod === 'air' ? 'Air Freight' : 'Express (DHL/FedEx)'}\n`
    message += `• Estimated Shipping Budget: ${formatUSD(shippingCost)}\n\n`

    message += `─────────────────────────────────────\n`
    message += `BUDGET SUMMARY\n`
    message += `─────────────────────────────────────\n\n`
    message += `• Product Subtotal: ${formatUSD(calculateSubtotal())}\n`
    message += `• Shipping Estimate: ${formatUSD(shippingCost)}\n`
    message += `• Total Budget: ${formatUSD(calculateTotal())} (≈ ${formatGBP(calculateTotalGBP())})\n\n`

    message += `─────────────────────────────────────\n`
    message += `QUESTIONS\n`
    message += `─────────────────────────────────────\n\n`
    message += `1. Can you confirm availability and lead time for these items?\n`
    message += `2. Are there any volume discounts for larger quantities?\n`
    message += `3. Can you provide samples before bulk order?\n`
    message += `4. What payment terms do you offer?\n`
    message += `5. Do you have any certifications (CE, FDA, etc.)?\n\n`

    message += `We are looking to establish a long-term partnership with reliable suppliers. Please let us know your best prices and terms.\n\n`
    message += `Looking forward to your response.\n\n`
    message += `Best regards,\n`
    message += `${contactName || '[Your Name]'}\n`
    message += `${companyName}\n`
    message += `United Kingdom\n`

    return message
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generateDraftMessage())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const saveDraft = () => {
    const draft = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      items: [...items],
      shippingCost,
      total: calculateTotal(),
      message: generateDraftMessage(),
    }
    const newDrafts = [draft, ...savedDrafts].slice(0, 10) // Keep last 10
    setSavedDrafts(newDrafts)
    localStorage.setItem('alibaba_drafts', JSON.stringify(newDrafts))
  }

  const loadDraft = (draft) => {
    setItems(draft.items)
    setShippingCost(draft.shippingCost)
  }

  const deleteDraft = (id) => {
    const newDrafts = savedDrafts.filter(d => d.id !== id)
    setSavedDrafts(newDrafts)
    localStorage.setItem('alibaba_drafts', JSON.stringify(newDrafts))
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-yellow-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Calculator className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Alibaba Order Calculator</h3>
              <p className="text-sm text-gray-500">Plan orders and generate supplier messages</p>
            </div>
          </div>
          <a
            href="https://www.alibaba.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium"
          >
            <ExternalLink className="w-4 h-4" />
            Open Alibaba
          </a>
        </div>
      </div>

      {/* Settings Row */}
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Company Name</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg w-32 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Contact Name</label>
            <input
              type="text"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="Your name"
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg w-32 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Shipping Method</label>
            <select
              value={shippingMethod}
              onChange={(e) => setShippingMethod(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="sea">Sea Freight (DDP)</option>
              <option value="air">Air Freight</option>
              <option value="express">Express (DHL/FedEx)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Shipping Cost ($)</label>
            <input
              type="number"
              value={shippingCost}
              onChange={(e) => setShippingCost(parseFloat(e.target.value) || 0)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg w-28 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">USD → GBP Rate</label>
            <input
              type="number"
              step="0.01"
              value={exchangeRate}
              onChange={(e) => setExchangeRate(parseFloat(e.target.value) || 0)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg w-24 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit $ (USD)</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">MOQ</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subtotal</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit w/ Ship</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-6 py-3">
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                    placeholder="Product name"
                    className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                    className="w-20 px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <span className="text-gray-400">$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={item.unitCost}
                      onChange={(e) => updateItem(item.id, 'unitCost', parseFloat(e.target.value) || 0)}
                      className="w-16 px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    value={item.moq}
                    onChange={(e) => updateItem(item.id, 'moq', parseInt(e.target.value) || 0)}
                    className="w-16 px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </td>
                <td className="px-4 py-3 font-medium text-gray-900">
                  {formatUSD(item.quantity * item.unitCost)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {formatUSD(calculateUnitCostWithShipping(item))}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => removeItem(item.id)}
                    className="p-1 text-gray-400 hover:text-red-500 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Item */}
      <div className="px-6 py-3 border-t border-gray-100">
        <button
          onClick={addItem}
          className="flex items-center gap-2 text-sm text-orange-600 hover:text-orange-700 font-medium"
        >
          <Plus className="w-4 h-4" />
          Add Item
        </button>
      </div>

      {/* Totals */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-6">
            <div>
              <p className="text-xs text-gray-500">Product Subtotal</p>
              <p className="text-lg font-semibold text-gray-900">{formatUSD(calculateSubtotal())}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">+ Shipping</p>
              <p className="text-lg font-semibold text-gray-900">{formatUSD(shippingCost)}</p>
            </div>
            <div className="pl-6 border-l border-gray-300">
              <p className="text-xs text-gray-500">Total (USD)</p>
              <p className="text-xl font-bold text-orange-600">{formatUSD(calculateTotal())}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Total (GBP)</p>
              <p className="text-xl font-bold text-green-600">{formatGBP(calculateTotalGBP())}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={saveDraft}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <Save className="w-4 h-4" />
              Save Draft
            </button>
            <button
              onClick={() => setShowDraftModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-orange-500 rounded-lg hover:bg-orange-600"
            >
              <Send className="w-4 h-4" />
              Generate Message
            </button>
          </div>
        </div>
      </div>

      {/* Saved Drafts */}
      {savedDrafts.length > 0 && (
        <div className="px-6 py-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Saved Drafts
          </h4>
          <div className="flex flex-wrap gap-2">
            {savedDrafts.map((draft) => (
              <div
                key={draft.id}
                className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg text-sm"
              >
                <span className="text-gray-600">
                  {new Date(draft.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </span>
                <span className="text-gray-400">|</span>
                <span className="font-medium">{formatUSD(draft.total)}</span>
                <button
                  onClick={() => loadDraft(draft)}
                  className="text-orange-600 hover:text-orange-700"
                >
                  Load
                </button>
                <button
                  onClick={() => deleteDraft(draft.id)}
                  className="text-gray-400 hover:text-red-500"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Draft Message Modal */}
      {showDraftModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Supplier Message Draft</h2>
              <button
                onClick={() => setShowDraftModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono bg-gray-50 p-4 rounded-lg">
                {generateDraftMessage()}
              </pre>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-gray-200">
              <button
                onClick={() => setShowDraftModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Close
              </button>
              <button
                onClick={copyToClipboard}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy to Clipboard'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
