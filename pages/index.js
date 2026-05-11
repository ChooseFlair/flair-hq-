import Head from 'next/head'
import Jarvis from '../components/Jarvis'

export default function Home() {
  return (
    <>
      <Head>
        <title>Flair HQ - Jarvis</title>
        <meta name="description" content="Flair HQ - AI-powered business assistant" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Jarvis />
    </>
  )
}
