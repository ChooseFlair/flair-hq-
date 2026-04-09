import { useState, useEffect, useMemo } from 'react'
import { getProducts, getAllOrders } from '../lib/supabase'
import {
  Package,
  TrendingUp,
  Calculator,
  CheckCircle,
  XCircle,
  AlertTriangle,
  DollarSign,
  Percent,
  Target,
  Zap,
  RefreshCw,
  PlusCircle,
  Trash2,
  Edit3,
  Save,
  X,
} from 'lucide-react'
import TaskWidget from './TaskWidget'
import AlibabaCalculator from './AlibabaCalculator'

export default function Products() {
  const [products, setProducts] = useState([])
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('catalog')

  // COGS data stored locally
  const [productCosts, setProductCosts] = useState({})
  const [editingCost, setEditingCost] = useState(null)
  const [tempCost, setTempCost] = useState('')

  // Flair business data (fetched from APIs)
  const [businessData, setBusinessData] = useState({
    metaCAC: null,
    paypalFeeRate: 0.029,
    paypalFixedFee: 0.30,
    avgConversionRate: null,
    avgAOV: null,
    loading: true
  })

  // Product potential calculator state
  const [potentialProducts, setPotentialProducts] = useState([
    {
      id: 1,
      name: '',
      unitCost: '',
      sellingPrice: '',
      shippingCost: '',
      packagingCost: '',
      platformFee: '2.9',
      marketingAllocation: '30',
    }
  ])

  // Load COGS from localStorage on mount
  useEffect(() => {
    const savedCosts = localStorage.getItem('flair-product-costs')
    if (savedCosts) {
      setProductCosts(JSON.parse(savedCosts))
    }
  }, [])

  // Save COGS to localStorage when it changes
  useEffect(() => {
    if (Object.keys(productCosts).length > 0) {
      localStorage.setItem('flair-product-costs', JSON.stringify(productCosts))
    }
  }, [productCosts])

  useEffect(() => {
    loadData()
    loadBusinessData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [productsData, ordersData] = await Promise.all([
        getProducts(),
        getAllOrders()
      ])
      setProducts(productsData || [])
      setOrders(ordersData || [])
    } catch (err) {
      console.error('Error loading products:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadBusinessData = async () => {
    try {
      const metaRes = await fetch('/api/meta/overview').catch(() => null)
      const metaData = metaRes ? await metaRes.json() : null

      const paypalRes = await fetch('/api/paypal/transactions').catch(() => null)
      const paypalData = paypalRes ? await paypalRes.json() : null

      let metaCAC = null
      if (metaData?.summary) {
        const spend = metaData.summary.spend || 0
        const purchases = metaData.summary.purchases || 0
        if (purchases > 0) {
          metaCAC = spend / purchases
        }
      }

      const ordersData = await getAllOrders()
      let avgAOV = null
      if (ordersData && ordersData.length > 0) {
        const totalRevenue = ordersData.reduce((sum, o) => sum + parseFloat(o.total_price || 0), 0)
        avgAOV = totalRevenue / ordersData.length
      }

      let actualPaypalFeeRate = 0.029
      if (paypalData?.transactions) {
        const txs = paypalData.transactions.filter(t => t.amount > 0)
        const totalRevenue = txs.reduce((sum, t) => sum + t.amount, 0)
        const totalFees = txs.reduce((sum, t) => sum + Math.abs(t.fee || 0), 0)
        if (totalRevenue > 0) {
          actualPaypalFeeRate = totalFees / totalRevenue
        }
      }

      setBusinessData({
        metaCAC,
        paypalFeeRate: actualPaypalFeeRate,
        paypalFixedFee: 0.30,
        avgConversionRate: metaData?.summary?.conversionRate || null,
        avgAOV,
        loading: false
      })
    } catch (err) {
      console.error('Error loading business data:', err)
      setBusinessData(prev => ({ ...prev, loading: false }))
    }
  }

  const formatCurrency = (value) => `£${parseFloat(value || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  // Product catalog with default COGS estimates
  const productCatalog = [
    { sku: 'FLAIR-WNT-IN', name: 'Walnut Inhaler', price: 29.99, category: 'Inhalers', defaultCost: 8.50 },
    { sku: 'FLAIR-OAK-IN', name: 'Oak Inhaler', price: 29.99, category: 'Inhalers', defaultCost: 8.50 },
    { sku: 'FLAIR-SM-3PK', name: 'Spearmint 3-Pack', price: 4.99, category: 'Refills', defaultCost: 1.20 },
    { sku: 'FLAIR-CM-3PK', name: 'Crisp Mint 3-Pack', price: 4.99, category: 'Refills', defaultCost: 1.20 },
    { sku: 'FLAIR-RA-3PK', name: 'Raspberry 3-Pack', price: 4.99, category: 'Refills', defaultCost: 1.20 },
    { sku: 'FLAIR-BL-3PK', name: 'Blueberry 3-Pack', price: 4.99, category: 'Refills', defaultCost: 1.20 },
    { sku: 'FLAIR-CO-3PK', name: 'Coffee 3-Pack', price: 4.99, category: 'Refills', defaultCost: 1.20 },
    { sku: 'FLAIR-MA-3PK', name: 'Mango 3-Pack', price: 4.99, category: 'Refills', defaultCost: 1.20 },
    { sku: 'FLAIR-ST-3PK', name: 'Strawberry 3-Pack', price: 4.99, category: 'Refills', defaultCost: 1.20 },
    { sku: 'FLAIR-RB-3PK', name: '3 Rubber Tips', price: 4.99, category: 'Accessories', defaultCost: 0.80 },
  ]

  // Get cost for a product (from saved or default)
  const getCost = (sku) => {
    return productCosts[sku] !== undefined ? productCosts[sku] : productCatalog.find(p => p.sku === sku)?.defaultCost || 0
  }

  // Calculate margin for a product
  const getMargin = (sku) => {
    const product = productCatalog.find(p => p.sku === sku)
    if (!product) return null
    const cost = getCost(sku)
    const profit = product.price - cost
    const margin = (profit / product.price) * 100
    return { profit, margin, cost }
  }

  // Save cost for a product
  const saveCost = (sku) => {
    const cost = parseFloat(tempCost)
    if (!isNaN(cost) && cost >= 0) {
      setProductCosts(prev => ({ ...prev, [sku]: cost }))
    }
    setEditingCost(null)
    setTempCost('')
  }

  // Start editing a cost
  const startEditCost = (sku) => {
    setEditingCost(sku)
    setTempCost(getCost(sku).toString())
  }

  // Calculate totals
  const catalogStats = useMemo(() => {
    let totalCOGS = 0
    let totalRevenue = 0
    let totalProfit = 0

    productCatalog.forEach(p => {
      const cost = getCost(p.sku)
      totalCOGS += cost
      totalRevenue += p.price
      totalProfit += (p.price - cost)
    })

    const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0

    return { totalCOGS, totalRevenue, totalProfit, avgMargin }
  }, [productCosts])

  // Profitability calculator functions
  const calculateProfitability = (product) => {
    const unitCost = parseFloat(product.unitCost) || 0
    const sellingPrice = parseFloat(product.sellingPrice) || 0
    const shippingCost = parseFloat(product.shippingCost) || 0
    const packagingCost = parseFloat(product.packagingCost) || 0
    const platformFeeRate = (parseFloat(product.platformFee) || 0) / 100
    const marketingAllocationRate = (parseFloat(product.marketingAllocation) || 0) / 100

    if (sellingPrice === 0) return null

    const platformFee = sellingPrice * platformFeeRate
    const paypalFee = (sellingPrice * businessData.paypalFeeRate) + businessData.paypalFixedFee
    const totalVariableCosts = unitCost + shippingCost + packagingCost + platformFee + paypalFee

    const grossProfit = sellingPrice - totalVariableCosts
    const grossMargin = (grossProfit / sellingPrice) * 100

    const marketingCost = businessData.metaCAC || (sellingPrice * marketingAllocationRate)
    const netProfit = grossProfit - marketingCost
    const netMargin = (netProfit / sellingPrice) * 100

    let verdict = 'unprofitable'
    let verdictColor = 'red'
    if (netMargin >= 20) {
      verdict = 'highly-profitable'
      verdictColor = 'green'
    } else if (netMargin >= 10) {
      verdict = 'profitable'
      verdictColor = 'green'
    } else if (netMargin >= 0) {
      verdict = 'marginal'
      verdictColor = 'yellow'
    }

    return {
      sellingPrice, unitCost, shippingCost, packagingCost, platformFee, paypalFee,
      totalVariableCosts, grossProfit, grossMargin, marketingCost, netProfit, netMargin,
      verdict, verdictColor,
      costBreakdown: [
        { name: 'Unit Cost', value: unitCost },
        { name: 'Shipping', value: shippingCost },
        { name: 'Packaging', value: packagingCost },
        { name: 'Platform Fee', value: platformFee },
        { name: 'Payment Fee', value: paypalFee },
        { name: 'Marketing/CAC', value: marketingCost },
      ]
    }
  }

  const updatePotentialProduct = (id, field, value) => {
    setPotentialProducts(prev => prev.map(p =>
      p.id === id ? { ...p, [field]: value } : p
    ))
  }

  const addPotentialProduct = () => {
    setPotentialProducts(prev => [...prev, {
      id: Date.now(),
      name: '',
      unitCost: '',
      sellingPrice: '',
      shippingCost: '',
      packagingCost: '',
      platformFee: '2.9',
      marketingAllocation: '30',
    }])
  }

  const removePotentialProduct = (id) => {
    setPotentialProducts(prev => prev.filter(p => p.id !== id))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-500 mt-1">Catalog, COGS, and profitability analysis.</p>
        </div>
        <button
          onClick={() => { loadData(); loadBusinessData() }}
          className="p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Task Widget */}
      <TaskWidget filterTag="products" title="Product Tasks" />

      {/* Flair Business Data Banner */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-5 h-5 text-green-600" />
          <h3 className="font-semibold text-green-800">Flair Live Business Metrics</h3>
          {businessData.loading && <RefreshCw className="w-4 h-4 text-green-600 animate-spin" />}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-green-600">Meta Ads CAC</p>
            <p className="text-lg font-bold text-green-800">
              {businessData.metaCAC ? formatCurrency(businessData.metaCAC) : 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-xs text-green-600">Avg Order Value</p>
            <p className="text-lg font-bold text-green-800">
              {businessData.avgAOV ? formatCurrency(businessData.avgAOV) : 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-xs text-green-600">Payment Fee Rate</p>
            <p className="text-lg font-bold text-green-800">
              {(businessData.paypalFeeRate * 100).toFixed(1)}% + £0.30
            </p>
          </div>
          <div>
            <p className="text-xs text-green-600">Avg Gross Margin</p>
            <p className="text-lg font-bold text-green-800">
              {catalogStats.avgMargin.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { id: 'catalog', label: 'Product Catalog & COGS', icon: Package },
          { id: 'potential', label: 'Profitability Calculator', icon: Calculator },
          { id: 'alibaba', label: 'Alibaba Calculator', icon: DollarSign },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-green-100 text-green-700'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Catalog & COGS Tab */}
      {activeTab === 'catalog' && (
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Total Products</p>
              <p className="text-xl font-bold text-gray-900">{productCatalog.length}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Total COGS</p>
              <p className="text-xl font-bold text-red-600">{formatCurrency(catalogStats.totalCOGS)}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Total Revenue (at price)</p>
              <p className="text-xl font-bold text-green-600">{formatCurrency(catalogStats.totalRevenue)}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Avg Gross Margin</p>
              <p className="text-xl font-bold text-purple-600">{catalogStats.avgMargin.toFixed(1)}%</p>
            </div>
          </div>

          {/* COGS Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="font-semibold text-gray-900">Product COGS & Margins</h3>
              <p className="text-sm text-gray-500 mt-1">Click the edit icon to update cost prices. Changes are saved automatically.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Selling Price</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">COGS</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Gross Profit</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {productCatalog.map((product) => {
                    const marginData = getMargin(product.sku)
                    const isEditing = editingCost === product.sku

                    return (
                      <tr key={product.sku} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <span className="font-medium text-gray-900">{product.name}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-500 font-mono">{product.sku}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            product.category === 'Inhalers' ? 'bg-green-100 text-green-800' :
                            product.category === 'Refills' ? 'bg-blue-100 text-blue-800' :
                            'bg-purple-100 text-purple-800'
                          }`}>
                            {product.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="font-medium text-gray-900">{formatCurrency(product.price)}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {isEditing ? (
                            <div className="flex items-center justify-end gap-2">
                              <span className="text-gray-400">£</span>
                              <input
                                type="number"
                                step="0.01"
                                value={tempCost}
                                onChange={(e) => setTempCost(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveCost(product.sku)
                                  if (e.key === 'Escape') { setEditingCost(null); setTempCost('') }
                                }}
                                className="w-20 px-2 py-1 border border-gray-300 rounded text-right text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                                autoFocus
                              />
                              <button
                                onClick={() => saveCost(product.sku)}
                                className="p-1 text-green-600 hover:text-green-800"
                              >
                                <Save className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => { setEditingCost(null); setTempCost('') }}
                                className="p-1 text-gray-400 hover:text-gray-600"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-2">
                              <span className="font-medium text-red-600">{formatCurrency(marginData?.cost || 0)}</span>
                              <button
                                onClick={() => startEditCost(product.sku)}
                                className="p-1 text-gray-400 hover:text-gray-600"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="font-medium text-green-600">{formatCurrency(marginData?.profit || 0)}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={`font-bold ${
                            (marginData?.margin || 0) >= 60 ? 'text-green-600' :
                            (marginData?.margin || 0) >= 40 ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {marginData?.margin?.toFixed(1) || 0}%
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Inhalers */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-green-50">
                <h3 className="font-semibold text-green-800">Inhalers</h3>
                <p className="text-sm text-green-600">Premium wooden inhalers</p>
              </div>
              <div className="p-4 space-y-3">
                {productCatalog.filter(p => p.category === 'Inhalers').map(product => {
                  const marginData = getMargin(product.sku)
                  return (
                    <div key={product.sku} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium text-gray-900">{product.name}</p>
                        <span className="font-bold text-gray-900">{formatCurrency(product.price)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">COGS: {formatCurrency(marginData?.cost)}</span>
                        <span className={`font-medium ${marginData?.margin >= 60 ? 'text-green-600' : 'text-yellow-600'}`}>
                          {marginData?.margin?.toFixed(0)}% margin
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Refills */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-blue-50">
                <h3 className="font-semibold text-blue-800">Refill Packs</h3>
                <p className="text-sm text-blue-600">Aromatic refill cartridges</p>
              </div>
              <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
                {productCatalog.filter(p => p.category === 'Refills').map(product => {
                  const marginData = getMargin(product.sku)
                  return (
                    <div key={product.sku} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium text-gray-900">{product.name}</p>
                        <span className="font-bold text-gray-900">{formatCurrency(product.price)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">COGS: {formatCurrency(marginData?.cost)}</span>
                        <span className={`font-medium ${marginData?.margin >= 60 ? 'text-green-600' : 'text-yellow-600'}`}>
                          {marginData?.margin?.toFixed(0)}% margin
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Accessories */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-purple-50">
                <h3 className="font-semibold text-purple-800">Accessories</h3>
                <p className="text-sm text-purple-600">Add-ons and extras</p>
              </div>
              <div className="p-4 space-y-3">
                {productCatalog.filter(p => p.category === 'Accessories').map(product => {
                  const marginData = getMargin(product.sku)
                  return (
                    <div key={product.sku} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium text-gray-900">{product.name}</p>
                        <span className="font-bold text-gray-900">{formatCurrency(product.price)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">COGS: {formatCurrency(marginData?.cost)}</span>
                        <span className={`font-medium ${marginData?.margin >= 60 ? 'text-green-600' : 'text-yellow-600'}`}>
                          {marginData?.margin?.toFixed(0)}% margin
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Margin Tips */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <h4 className="font-medium text-amber-800 mb-2">Margin Guidelines</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-amber-700">60%+ margin = Excellent</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span className="text-amber-700">40-60% margin = Good</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-amber-700">&lt;40% margin = Review pricing</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Potential / Profitability Calculator Tab */}
      {activeTab === 'potential' && (
        <div className="space-y-6">
          {/* Info Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Target className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-800">Product Profitability Calculator</h3>
                <p className="text-sm text-blue-600 mt-1">
                  Enter unit economics for any product idea. We'll automatically factor in Flair's current CAC, payment fees, and give you a clear profitable/not profitable verdict.
                </p>
              </div>
            </div>
          </div>

          {/* Product Cards */}
          {potentialProducts.map((product, index) => {
            const profitability = calculateProfitability(product)

            return (
              <div key={product.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">
                    {product.name || `Product ${index + 1}`}
                  </h3>
                  {potentialProducts.length > 1 && (
                    <button
                      onClick={() => removePotentialProduct(product.id)}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Input Section */}
                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-700 flex items-center gap-2">
                        <Calculator className="w-4 h-4" />
                        Unit Economics
                      </h4>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Product Name</label>
                          <input
                            type="text"
                            value={product.name}
                            onChange={(e) => updatePotentialProduct(product.id, 'name', e.target.value)}
                            placeholder="e.g., New Bundle"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Selling Price (£)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={product.sellingPrice}
                            onChange={(e) => updatePotentialProduct(product.id, 'sellingPrice', e.target.value)}
                            placeholder="29.99"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Unit Cost / COGS (£)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={product.unitCost}
                            onChange={(e) => updatePotentialProduct(product.id, 'unitCost', e.target.value)}
                            placeholder="5.00"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Shipping Cost (£)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={product.shippingCost}
                            onChange={(e) => updatePotentialProduct(product.id, 'shippingCost', e.target.value)}
                            placeholder="3.50"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Packaging Cost (£)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={product.packagingCost}
                            onChange={(e) => updatePotentialProduct(product.id, 'packagingCost', e.target.value)}
                            placeholder="1.00"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Platform Fee (%)</label>
                          <input
                            type="number"
                            step="0.1"
                            value={product.platformFee}
                            onChange={(e) => updatePotentialProduct(product.id, 'platformFee', e.target.value)}
                            placeholder="2.9"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm"
                          />
                        </div>
                      </div>

                      {!businessData.metaCAC && (
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Marketing Allocation (% of price)</label>
                          <input
                            type="number"
                            step="1"
                            value={product.marketingAllocation}
                            onChange={(e) => updatePotentialProduct(product.id, 'marketingAllocation', e.target.value)}
                            placeholder="30"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm"
                          />
                          <p className="text-xs text-gray-400 mt-1">Used when CAC data isn't available</p>
                        </div>
                      )}
                    </div>

                    {/* Results Section */}
                    <div className="space-y-4">
                      {profitability ? (
                        <>
                          {/* Verdict */}
                          <div className={`p-4 rounded-xl ${
                            profitability.verdict === 'highly-profitable' ? 'bg-green-100 border-2 border-green-500' :
                            profitability.verdict === 'profitable' ? 'bg-green-50 border border-green-300' :
                            profitability.verdict === 'marginal' ? 'bg-yellow-50 border border-yellow-300' :
                            'bg-red-50 border border-red-300'
                          }`}>
                            <div className="flex items-center gap-3">
                              {profitability.verdict === 'highly-profitable' || profitability.verdict === 'profitable' ? (
                                <CheckCircle className="w-8 h-8 text-green-600" />
                              ) : profitability.verdict === 'marginal' ? (
                                <AlertTriangle className="w-8 h-8 text-yellow-600" />
                              ) : (
                                <XCircle className="w-8 h-8 text-red-600" />
                              )}
                              <div>
                                <p className={`font-bold text-lg capitalize ${
                                  profitability.verdict.includes('profitable') ? 'text-green-800' :
                                  profitability.verdict === 'marginal' ? 'text-yellow-800' : 'text-red-800'
                                }`}>
                                  {profitability.verdict.replace('-', ' ')}
                                </p>
                                <p className={`text-sm ${
                                  profitability.verdict.includes('profitable') ? 'text-green-600' :
                                  profitability.verdict === 'marginal' ? 'text-yellow-600' : 'text-red-600'
                                }`}>
                                  Net margin: {profitability.netMargin.toFixed(1)}%
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Key Metrics */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-gray-50 rounded-lg p-3">
                              <p className="text-xs text-gray-500">Gross Profit</p>
                              <p className="text-lg font-bold text-gray-900">{formatCurrency(profitability.grossProfit)}</p>
                              <p className="text-xs text-gray-400">{profitability.grossMargin.toFixed(1)}% margin</p>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3">
                              <p className="text-xs text-gray-500">Net Profit</p>
                              <p className={`text-lg font-bold ${profitability.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrency(profitability.netProfit)}
                              </p>
                              <p className="text-xs text-gray-400">After marketing</p>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3">
                              <p className="text-xs text-gray-500">Total Costs</p>
                              <p className="text-lg font-bold text-gray-900">{formatCurrency(profitability.totalVariableCosts + profitability.marketingCost)}</p>
                              <p className="text-xs text-gray-400">All-in per unit</p>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3">
                              <p className="text-xs text-gray-500">CAC/Marketing</p>
                              <p className="text-lg font-bold text-orange-600">{formatCurrency(profitability.marketingCost)}</p>
                              <p className="text-xs text-gray-400">{businessData.metaCAC ? 'From Meta data' : 'Estimated'}</p>
                            </div>
                          </div>

                          {/* Cost Breakdown */}
                          <div className="bg-gray-50 rounded-lg p-4">
                            <h5 className="text-sm font-medium text-gray-700 mb-3">Cost Breakdown</h5>
                            <div className="space-y-2">
                              {profitability.costBreakdown.map((cost, i) => (
                                <div key={i} className="flex justify-between text-sm">
                                  <span className="text-gray-600">{cost.name}</span>
                                  <span className="font-medium text-gray-900">{formatCurrency(cost.value)}</span>
                                </div>
                              ))}
                              <div className="border-t border-gray-300 pt-2 mt-2 flex justify-between text-sm font-bold">
                                <span className="text-gray-800">Total Costs</span>
                                <span className="text-gray-900">{formatCurrency(profitability.totalVariableCosts + profitability.marketingCost)}</span>
                              </div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="h-full flex items-center justify-center text-gray-400 bg-gray-50 rounded-xl p-8">
                          <div className="text-center">
                            <Calculator className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p>Enter product details to see profitability analysis</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}

          {/* Add Product Button */}
          <button
            onClick={addPotentialProduct}
            className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-green-500 hover:text-green-600 transition-colors flex items-center justify-center gap-2"
          >
            <PlusCircle className="w-5 h-5" />
            Add Another Product to Compare
          </button>

          {/* Tips */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <h4 className="font-medium text-amber-800 mb-2">Profitability Tips</h4>
            <ul className="space-y-1 text-sm text-amber-700">
              <li>• Aim for 20%+ net margin for healthy profitability</li>
              <li>• 10-20% is viable but leaves little room for error</li>
              <li>• Below 10% is risky - consider raising prices or cutting costs</li>
              <li>• Bundles typically have better margins than single items</li>
            </ul>
          </div>
        </div>
      )}

      {/* Alibaba Calculator Tab */}
      {activeTab === 'alibaba' && (
        <AlibabaCalculator />
      )}
    </div>
  )
}
