import { useState, useEffect } from 'react'
import { getProducts, getAllOrders } from '../lib/supabase'
import TaskWidget from './TaskWidget'

export default function Products() {
  const [products, setProducts] = useState([])
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
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

    loadData()
  }, [])

  const formatCurrency = (value) => `£${parseFloat(value || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  // Calculate product performance (placeholder - would need line item data for accuracy)
  const productStats = {
    totalProducts: products.length,
    totalRevenue: orders.reduce((sum, o) => sum + parseFloat(o.total_price || 0), 0),
  }

  // Flair product lineup (static for now, could come from products table)
  const productCatalog = [
    {
      name: 'Walnut Inhaler',
      sku: 'FLAIR-WNT-IN',
      price: 29.99,
      category: 'Inhalers',
      status: 'active',
      image: '/walnut.jpg'
    },
    {
      name: 'Oak Inhaler',
      sku: 'FLAIR-OAK-IN',
      price: 29.99,
      category: 'Inhalers',
      status: 'active',
      image: '/oak.jpg'
    },
    {
      name: 'Spearmint 3-Pack',
      sku: 'FLAIR-SM-3PK',
      price: 4.99,
      category: 'Refills',
      status: 'active',
      image: '/spearmint.jpg'
    },
    {
      name: 'Crisp Mint 3-Pack',
      sku: 'FLAIR-CM-3PK',
      price: 4.99,
      category: 'Refills',
      status: 'active',
      image: '/crispmint.jpg'
    },
    {
      name: 'Raspberry 3-Pack',
      sku: 'FLAIR-RA-3PK',
      price: 4.99,
      category: 'Refills',
      status: 'active',
      image: '/raspberry.jpg'
    },
    {
      name: 'Blueberry 3-Pack',
      sku: 'FLAIR-BL-3PK',
      price: 4.99,
      category: 'Refills',
      status: 'active',
      image: '/blueberry.jpg'
    },
    {
      name: 'Coffee 3-Pack',
      sku: 'FLAIR-CO-3PK',
      price: 4.99,
      category: 'Refills',
      status: 'active',
      image: '/coffee.jpg'
    },
    {
      name: 'Mango 3-Pack',
      sku: 'FLAIR-MA-3PK',
      price: 4.99,
      category: 'Refills',
      status: 'active',
      image: '/mango.jpg'
    },
    {
      name: 'Strawberry 3-Pack',
      sku: 'FLAIR-ST-3PK',
      price: 4.99,
      category: 'Refills',
      status: 'active',
      image: '/strawberry.jpg'
    },
    {
      name: '3 Rubber Tips',
      sku: 'FLAIR-RB-3PK',
      price: 4.99,
      category: 'Accessories',
      status: 'active',
      image: '/tips.jpg'
    },
  ]

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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Products</h1>
        <p className="text-gray-500 mt-1">Your Flair product catalog and performance.</p>
      </div>

      {/* Task Widget */}
      <TaskWidget filterTag="products" title="Product Tasks" />

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Products</p>
          <p className="text-xl font-bold text-gray-900">{productCatalog.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Inhalers</p>
          <p className="text-xl font-bold text-green-600">2</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Refill Flavors</p>
          <p className="text-xl font-bold text-blue-600">7</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Accessories</p>
          <p className="text-xl font-bold text-purple-600">1</p>
        </div>
      </div>

      {/* Product Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Inhalers */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-green-50">
            <h3 className="font-semibold text-green-800">Inhalers</h3>
            <p className="text-sm text-green-600">Premium wooden inhalers</p>
          </div>
          <div className="p-4 space-y-3">
            {productCatalog.filter(p => p.category === 'Inhalers').map(product => (
              <div key={product.sku} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{product.name}</p>
                  <p className="text-xs text-gray-500">{product.sku}</p>
                </div>
                <span className="font-bold text-gray-900">{formatCurrency(product.price)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Refills */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-blue-50">
            <h3 className="font-semibold text-blue-800">Refill Packs</h3>
            <p className="text-sm text-blue-600">Aromatic refill cartridges</p>
          </div>
          <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
            {productCatalog.filter(p => p.category === 'Refills').map(product => (
              <div key={product.sku} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{product.name}</p>
                  <p className="text-xs text-gray-500">{product.sku}</p>
                </div>
                <span className="font-bold text-gray-900">{formatCurrency(product.price)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Accessories */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-purple-50">
            <h3 className="font-semibold text-purple-800">Accessories</h3>
            <p className="text-sm text-purple-600">Add-ons and extras</p>
          </div>
          <div className="p-4 space-y-3">
            {productCatalog.filter(p => p.category === 'Accessories').map(product => (
              <div key={product.sku} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{product.name}</p>
                  <p className="text-xs text-gray-500">{product.sku}</p>
                </div>
                <span className="font-bold text-gray-900">{formatCurrency(product.price)}</span>
              </div>
            ))}
          </div>

          {/* Upsell Opportunity */}
          <div className="p-4 border-t border-gray-200">
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-4 text-white">
              <p className="font-medium">Bundle Opportunity</p>
              <p className="text-sm text-purple-200 mt-1">Consider creating starter bundles: Inhaler + 3 refills</p>
            </div>
          </div>
        </div>
      </div>

      {/* Product Insights */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Product Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="font-medium text-gray-700">Pricing Strategy</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Inhaler Price</span>
                <span className="font-medium">£29.99</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Refill Pack Price</span>
                <span className="font-medium">£4.99</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Typical Bundle AOV</span>
                <span className="font-medium">~£50</span>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <h4 className="font-medium text-gray-700">Recommendations</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-green-500">•</span>
                <span>Consider subscription model for refills</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500">•</span>
                <span>Bundle discounts drive higher AOV</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500">•</span>
                <span>Track which flavors sell best together</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
