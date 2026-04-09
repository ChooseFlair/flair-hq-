import { useState } from 'react'
import Head from 'next/head'
import Layout from '../components/Layout'
import Overview from '../components/Overview'
import TaskManager from '../components/TaskManager'
import Finance from '../components/Finance'
import Forecast from '../components/Forecast'
import Orders from '../components/Orders'
import Products from '../components/Products'
import Marketing from '../components/Marketing'
import Researcher from '../components/Researcher'

export default function Home() {
  const [activeTab, setActiveTab] = useState('overview')
  const [activeSubTab, setActiveSubTab] = useState(null)

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <Overview />
      case 'tasks':
        return <TaskManager />
      case 'finance':
        return <Finance activeSubTab={activeSubTab} setActiveSubTab={setActiveSubTab} />
      case 'forecast':
        return <Forecast />
      case 'orders':
        return <Orders activeSubTab={activeSubTab} setActiveSubTab={setActiveSubTab} />
      case 'products':
        return <Products activeSubTab={activeSubTab} setActiveSubTab={setActiveSubTab} />
      case 'marketing':
        return <Marketing activeSubTab={activeSubTab} setActiveSubTab={setActiveSubTab} />
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

      <Layout
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeSubTab={activeSubTab}
        setActiveSubTab={setActiveSubTab}
      >
        {renderContent()}
      </Layout>
    </>
  )
}
