import { useState, useEffect, useMemo } from 'react'
import { getProducts, getAllOrders } from '../lib/supabase'
import {
  Package,
  TrendingUp,
  TrendingDown,
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
  BarChart3,
  ShoppingBag,
  Award,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import TaskWidget from './TaskWidget'
import AlibabaCalculator from './AlibabaCalculator'

export default function Products() {
  const [products, setProducts] = useState([])
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('analytics')

  // Sales analytics data
  const [salesData, setSalesData] = useState({ products: [], source: 'loading' })
  const [salesLoading, setSalesLoading] = useState(true)

  // COGS data stored locally
  const [productCosts, setProductCosts] = useState({})
  const [editingCost, setEditingCost] = useState(null)
  const [tempCost, setTempCost] = useState('')

  // Stock levels (editable)
  const [stockLevels, setStockLevels] = useState({})
  const [editingStock, setEditingStock] = useState(null)
  const [tempStock, setTempStock] = useState('')

  // Flair business data
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
      id: 1, name: '', unitCost: '', sellingPrice: '', shippingCost: '',
      packagingCost: '', platformFee: '2.9', marketingAllocation: '30',
    }
  ])

  // Load from localStorage on mount
  useEffect(() => {
    const savedCosts = localStorage.getItem('flair-product-costs')
    const savedStock = localStorage.getItem('flair-stock-levels')
    if (savedCosts) setProductCosts(JSON.parse(savedCosts))
    if (savedStock) setStockLevels(JSON.parse(savedStock))
  }, [])

  // Save to localStorage when changes
  useEffect(() => {
    if (Object.keys(productCosts).length > 0) {
      localStorage.setItem('flair-product-costs', JSON.stringify(productCosts))
    }
  }, [productCosts])

  useEffect(() => {
    if (Object.keys(stockLevels).length > 0) {
      localStorage.setItem('flair-stock-levels', JSON.stringify(stockLevels))
    }
  }, [stockLevels])

  useEffect(() => {
    loadData()
    loadBusinessData()
    loadSalesData()
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

  const loadSalesData = async () => {
    setSalesLoading(true)
    try {
      const res = await fetch('/api/products/analytics')
      const data = await res.json()
      setSalesData(data)
    } catch (err) {
      console.error('Error loading sales data:', err)
    } finally {
      setSalesLoading(false)
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
        if (purchases > 0) metaCAC = spend / purchases
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
        if (totalRevenue > 0) actualPaypalFeeRate = totalFees / totalRevenue
      }

      setBusinessData({
        metaCAC, paypalFeeRate: actualPaypalFeeRate, paypalFixedFee: 0.30,
        avgConversionRate: metaData?.summary?.conversionRate || null, avgAOV, loading: false
      })
    } catch (err) {
      console.error('Error loading business data:', err)
      setBusinessData(prev => ({ ...prev, loading: false }))
    }
  }

  const formatCurrency = (value) => `£${parseFloat(value || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  // Product catalog with default COGS and stock
  const productCatalog = [
    { sku: 'FLAIR-WNT-IN', name: 'Walnut Inhaler', price: 29.99, category: 'Inhalers', defaultCost: 8.50, defaultStock: 50 },
    { sku: 'FLAIR-OAK-IN', name: 'Oak Inhaler', price: 29.99, category: 'Inhalers', defaultCost: 8.50, defaultStock: 50 },
    { sku: 'FLAIR-SM-3PK', name: 'Spearmint 3-Pack', price: 4.99, category: 'Refills', defaultCost: 1.20, defaultStock: 200 },
    { sku: 'FLAIR-CM-3PK', name: 'Crisp Mint 3-Pack', price: 4.99, category: 'Refills', defaultCost: 1.20, defaultStock: 200 },
    { sku: 'FLAIR-RA-3PK', name: 'Raspberry 3-Pack', price: 4.99, category: 'Refills', defaultCost: 1.20, defaultStock: 150 },
    { sku: 'FLAIR-BL-3PK', name: 'Blueberry 3-Pack', price: 4.99, category: 'Refills', defaultCost: 1.20, defaultStock: 150 },
    { sku: 'FLAIR-CO-3PK', name: 'Coffee 3-Pack', price: 4.99, category: 'Refills', defaultCost: 1.20, defaultStock: 100 },
    { sku: 'FLAIR-MA-3PK', name: 'Mango 3-Pack', price: 4.99, category: 'Refills', defaultCost: 1.20, defaultStock: 100 },
    { sku: 'FLAIR-ST-3PK', name: 'Strawberry 3-Pack', price: 4.99, category: 'Refills', defaultCost: 1.20, defaultStock: 120 },
    { sku: 'FLAIR-RB-3PK', name: '3 Rubber Tips', price: 4.99, category: 'Accessories', defaultCost: 0.80, defaultStock: 100 },
  ]

  const getCost = (sku) => productCosts[sku] ?? productCatalog.find(p => p.sku === sku)?.defaultCost ?? 0
  const getStock = (sku) => stockLevels[sku] ?? productCatalog.find(p => p.sku === sku)?.defaultStock ?? 0

  const getMargin = (sku) => {
    const product = productCatalog.find(p => p.sku === sku)
    if (!product) return null
    const cost = getCost(sku)
    const profit = product.price - cost
    const margin = (profit / product.price) * 100
    return { profit, margin, cost }
  }

  // Calculate sell-through rate
  const getSellThrough = (sku) => {
    const sold = salesData.products?.find(p => p.sku === sku)?.unitsSold || 0
    const stock = getStock(sku)
    const totalInventory = sold + stock
    if (totalInventory === 0) return 0
    return (sold / totalInventory) * 100
  }

  const saveCost = (sku) => {
    const cost = parseFloat(tempCost)
    if (!isNaN(cost) && cost >= 0) setProductCosts(prev => ({ ...prev, [sku]: cost }))
    setEditingCost(null)
    setTempCost('')
  }

  const saveStock = (sku) => {
    const stock = parseInt(tempStock)
    if (!isNaN(stock) && stock >= 0) setStockLevels(prev => ({ ...prev, [sku]: stock }))
    setEditingStock(null)
    setTempStock('')
  }

  // Sales analytics calculations
  const salesAnalytics = useMemo(() => {
    const products = salesData.products || []
    const totalRevenue = products.reduce((sum, p) => sum + (p.revenue || 0), 0)
    const totalUnits = products.reduce((sum, p) => sum + (p.unitsSold || 0), 0)
    const topSeller = products.length > 0 ? products[0] : null
    const avgUnitsPerProduct = products.length > 0 ? totalUnits / products.length : 0

    // Category breakdown
    const categoryRevenue = {}
    products.forEach(p => {
      const cat = p.category || productCatalog.find(c => c.sku === p.sku)?.category || 'Other'
      if (!categoryRevenue[cat]) categoryRevenue[cat] = 0
      categoryRevenue[cat] += p.revenue || 0
    })

    return { totalRevenue, totalUnits, topSeller, avgUnitsPerProduct, categoryRevenue }
  }, [salesData])

  // Chart data
  const revenueChartData = useMemo(() => {
    return (salesData.products || []).slice(0, 10).map(p => ({
      name: p.name?.replace(' 3-Pack', '').replace(' Inhaler', '') || p.sku,
      revenue: p.revenue || 0,
      units: p.unitsSold || 0,
    }))
  }, [salesData])

  const categoryChartData = useMemo(() => {
    const cats = { Inhalers: 0, Refills: 0, Accessories: 0 }
    ;(salesData.products || []).forEach(p => {
      const cat = p.category || productCatalog.find(c => c.sku === p.sku)?.category || 'Other'
      if (cats[cat] !== undefined) cats[cat] += p.revenue || 0
    })
    return Object.entries(cats).map(([name, value]) => ({ name, value })).filter(c => c.value > 0)
  }, [salesData])

  const COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899', '#14B8A6']

  // Profitability calculator
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
    if (netMargin >= 20) verdict = 'highly-profitable'
    else if (netMargin >= 10) verdict = 'profitable'
    else if (netMargin >= 0) verdict = 'marginal'

    return {
      sellingPrice, unitCost, grossProfit, grossMargin, marketingCost, netProfit, netMargin, verdict,
      totalVariableCosts,
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
    setPotentialProducts(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p))
  }

  const addPotentialProduct = () => {
    setPotentialProducts(prev => [...prev, {
      id: Date.now(), name: '', unitCost: '', sellingPrice: '', shippingCost: '',
      packagingCost: '', platformFee: '2.9', marketingAllocation: '30',
    }])
  }

  const removePotentialProduct = (id) => {
    setPotentialProducts(prev => prev.filter(p => p.id !== id))
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
          <p className="text-sm font-medium text-gray-900">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.name === 'Revenue' ? formatCurrency(entry.value) : entry.value}
            </p>
          ))}
        </div>
      )
    }
    return null
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
          <p className="text-gray-500 mt-1">Sales analytics, COGS, and profitability.</p>
        </div>
        <button
          onClick={() => { loadData(); loadBusinessData(); loadSalesData() }}
          className="p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Task Widget */}
      <TaskWidget filterTag="products" title="Product Tasks" />

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { id: 'analytics', label: 'Sales Analytics', icon: BarChart3 },
          { id: 'catalog', label: 'Catalog & COGS', icon: Package },
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

      {/* Sales Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-green-500" />
                <p className="text-sm text-gray-500">Total Revenue</p>
              </div>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(salesAnalytics.totalRevenue)}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <ShoppingBag className="w-4 h-4 text-blue-500" />
                <p className="text-sm text-gray-500">Units Sold</p>
              </div>
              <p className="text-2xl font-bold text-blue-600">{salesAnalytics.totalUnits}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Award className="w-4 h-4 text-yellow-500" />
                <p className="text-sm text-gray-500">Best Seller</p>
              </div>
              <p className="text-lg font-bold text-gray-900 truncate">{salesAnalytics.topSeller?.name || '-'}</p>
              <p className="text-xs text-gray-500">{salesAnalytics.topSeller?.unitsSold || 0} units</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-4 h-4 text-purple-500" />
                <p className="text-sm text-gray-500">Avg Units/Product</p>
              </div>
              <p className="text-2xl font-bold text-purple-600">{salesAnalytics.avgUnitsPerProduct.toFixed(0)}</p>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue by Product */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Revenue by Product</h3>
              <div className="h-64">
                {salesLoading ? (
                  <div className="h-full flex items-center justify-center">
                    <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenueChartData} layout="vertical" margin={{ left: 80, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis type="number" tickFormatter={(v) => `£${v}`} tick={{ fontSize: 11, fill: '#6B7280' }} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#6B7280' }} width={75} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="revenue" name="Revenue" fill="#10B981" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Revenue by Category */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Revenue by Category</h3>
              <div className="h-64">
                {salesLoading ? (
                  <div className="h-full flex items-center justify-center">
                    <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
                  </div>
                ) : categoryChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {categoryChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-400">No data</div>
                )}
              </div>
            </div>
          </div>

          {/* Best Sellers Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="font-semibold text-gray-900">Product Performance</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Units Sold</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Revenue</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Avg Price</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Stock</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Sell-Through</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {(salesData.products || []).map((product, idx) => {
                    const sellThrough = getSellThrough(product.sku)
                    const stock = getStock(product.sku)
                    const isEditing = editingStock === product.sku

                    return (
                      <tr key={product.sku || idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                            idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                            idx === 1 ? 'bg-gray-200 text-gray-700' :
                            idx === 2 ? 'bg-orange-100 text-orange-700' :
                            'bg-gray-100 text-gray-500'
                          }`}>
                            {idx + 1}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-medium text-gray-900">{product.name}</p>
                          <p className="text-xs text-gray-500">{product.sku}</p>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="font-bold text-blue-600">{product.unitsSold}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="font-bold text-green-600">{formatCurrency(product.revenue)}</span>
                        </td>
                        <td className="px-6 py-4 text-right text-gray-600">
                          {formatCurrency(product.avgPrice || product.revenue / product.unitsSold)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {isEditing ? (
                            <div className="flex items-center justify-end gap-1">
                              <input
                                type="number"
                                value={tempStock}
                                onChange={(e) => setTempStock(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveStock(product.sku)
                                  if (e.key === 'Escape') { setEditingStock(null); setTempStock('') }
                                }}
                                className="w-16 px-2 py-1 border border-gray-300 rounded text-right text-sm"
                                autoFocus
                              />
                              <button onClick={() => saveStock(product.sku)} className="p-1 text-green-600">
                                <Save className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-1">
                              <span className={`font-medium ${stock < 20 ? 'text-red-600' : stock < 50 ? 'text-yellow-600' : 'text-gray-900'}`}>
                                {stock}
                              </span>
                              <button
                                onClick={() => { setEditingStock(product.sku); setTempStock(stock.toString()) }}
                                className="p-1 text-gray-400 hover:text-gray-600"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  sellThrough >= 70 ? 'bg-green-500' :
                                  sellThrough >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${Math.min(100, sellThrough)}%` }}
                              />
                            </div>
                            <span className={`text-sm font-medium ${
                              sellThrough >= 70 ? 'text-green-600' :
                              sellThrough >= 40 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {sellThrough.toFixed(0)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sell-Through Guide */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <h4 className="font-medium text-blue-800 mb-2">Sell-Through Rate Guide</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-blue-700">70%+ = Excellent (reorder soon)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span className="text-blue-700">40-70% = Good (monitor)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-blue-700">&lt;40% = Slow mover (promote)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Catalog & COGS Tab */}
      {activeTab === 'catalog' && (
        <div className="space-y-6">
          {/* COGS Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="font-semibold text-gray-900">Product COGS & Margins</h3>
              <p className="text-sm text-gray-500 mt-1">Click edit to update costs. Changes saved automatically.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Price</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">COGS</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Profit</th>
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
                          <p className="font-medium text-gray-900">{product.name}</p>
                          <p className="text-xs text-gray-500">{product.sku}</p>
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
                        <td className="px-6 py-4 text-right font-medium">{formatCurrency(product.price)}</td>
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
                                className="w-20 px-2 py-1 border border-gray-300 rounded text-right text-sm"
                                autoFocus
                              />
                              <button onClick={() => saveCost(product.sku)} className="p-1 text-green-600">
                                <Save className="w-4 h-4" />
                              </button>
                              <button onClick={() => { setEditingCost(null); setTempCost('') }} className="p-1 text-gray-400">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-2">
                              <span className="font-medium text-red-600">{formatCurrency(marginData?.cost)}</span>
                              <button
                                onClick={() => { setEditingCost(product.sku); setTempCost(getCost(product.sku).toString()) }}
                                className="p-1 text-gray-400 hover:text-gray-600"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right font-medium text-green-600">
                          {formatCurrency(marginData?.profit)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={`font-bold ${
                            (marginData?.margin || 0) >= 60 ? 'text-green-600' :
                            (marginData?.margin || 0) >= 40 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {marginData?.margin?.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Profitability Calculator Tab */}
      {activeTab === 'potential' && (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Target className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-800">Product Profitability Calculator</h3>
                <p className="text-sm text-blue-600 mt-1">
                  Enter unit economics to see if a product is profitable with your current CAC and fees.
                </p>
              </div>
            </div>
          </div>

          {potentialProducts.map((product, index) => {
            const profitability = calculateProfitability(product)
            return (
              <div key={product.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between">
                  <h3 className="font-semibold text-gray-900">{product.name || `Product ${index + 1}`}</h3>
                  {potentialProducts.length > 1 && (
                    <button onClick={() => removePotentialProduct(product.id)} className="text-gray-400 hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Product Name</label>
                        <input type="text" value={product.name} onChange={(e) => updatePotentialProduct(product.id, 'name', e.target.value)} placeholder="e.g., New Bundle" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Selling Price (£)</label>
                        <input type="number" step="0.01" value={product.sellingPrice} onChange={(e) => updatePotentialProduct(product.id, 'sellingPrice', e.target.value)} placeholder="29.99" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Unit Cost (£)</label>
                        <input type="number" step="0.01" value={product.unitCost} onChange={(e) => updatePotentialProduct(product.id, 'unitCost', e.target.value)} placeholder="5.00" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Shipping (£)</label>
                        <input type="number" step="0.01" value={product.shippingCost} onChange={(e) => updatePotentialProduct(product.id, 'shippingCost', e.target.value)} placeholder="3.50" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Packaging (£)</label>
                        <input type="number" step="0.01" value={product.packagingCost} onChange={(e) => updatePotentialProduct(product.id, 'packagingCost', e.target.value)} placeholder="1.00" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Platform Fee (%)</label>
                        <input type="number" step="0.1" value={product.platformFee} onChange={(e) => updatePotentialProduct(product.id, 'platformFee', e.target.value)} placeholder="2.9" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                      </div>
                    </div>
                  </div>
                  <div>
                    {profitability ? (
                      <div className="space-y-4">
                        <div className={`p-4 rounded-xl ${
                          profitability.verdict === 'highly-profitable' ? 'bg-green-100 border-2 border-green-500' :
                          profitability.verdict === 'profitable' ? 'bg-green-50 border border-green-300' :
                          profitability.verdict === 'marginal' ? 'bg-yellow-50 border border-yellow-300' :
                          'bg-red-50 border border-red-300'
                        }`}>
                          <div className="flex items-center gap-3">
                            {profitability.verdict.includes('profitable') ? <CheckCircle className="w-8 h-8 text-green-600" /> :
                             profitability.verdict === 'marginal' ? <AlertTriangle className="w-8 h-8 text-yellow-600" /> :
                             <XCircle className="w-8 h-8 text-red-600" />}
                            <div>
                              <p className="font-bold text-lg capitalize">{profitability.verdict.replace('-', ' ')}</p>
                              <p className="text-sm">Net margin: {profitability.netMargin.toFixed(1)}%</p>
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-xs text-gray-500">Gross Profit</p>
                            <p className="text-lg font-bold">{formatCurrency(profitability.grossProfit)}</p>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-xs text-gray-500">Net Profit</p>
                            <p className={`text-lg font-bold ${profitability.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrency(profitability.netProfit)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center text-gray-400 bg-gray-50 rounded-xl p-8">
                        <div className="text-center">
                          <Calculator className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <p>Enter details to see analysis</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
          <button onClick={addPotentialProduct} className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-green-500 hover:text-green-600 flex items-center justify-center gap-2">
            <PlusCircle className="w-5 h-5" /> Add Another Product
          </button>
        </div>
      )}

      {/* Alibaba Calculator Tab */}
      {activeTab === 'alibaba' && <AlibabaCalculator />}
    </div>
  )
}
