import Head from 'next/head'
import Jarvis from '../components/Jarvis'

export default function Home() {
  return (
    <>
      <Head>
        <title>Jarvis</title>
        <meta name="description" content="Jarvis - AI-powered business assistant" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Jarvis />
    </>
  )
}
