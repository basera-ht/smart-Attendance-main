import '../styles/globals.css'
import ReduxProvider from '../components/ReduxProvider'
import Head from 'next/head'

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>Corporate Smart Attendance System</title>
        <meta name="description" content="Modern attendance management system for corporations" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <ReduxProvider>
        <Component {...pageProps} />
      </ReduxProvider>
    </>
  )
}
