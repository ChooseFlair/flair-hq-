import { useState } from 'react'
import Head from 'next/head'
import Layout from '../components/Layout'
import Overview from '../components/Overview'
import Orders from '../components/Orders'
import Products from '../components/Products'
import Marketing from '../components/Marketing'
import Researcher from '../components/Researcher'

export default function Home() {
  const [activeTab, setActiveTab] = useState('overview')

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <Overview />
      case 'orders':
        return <Orders />
      case 'products':
        return <Products />
      case 'marketing':
        return <Marketing />
      case 'researcher':
        return <Researcher />
      default:
        return <Overview />
    }
  }

  return (
    <>
      <Head>
        <title>Flair HQ - Business Dashboard</title>
        <meta name="description" content="Flair business dashboard - orders, products, and analytics" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
        {renderContent()}
      </Layout>
    </>
  )
}
