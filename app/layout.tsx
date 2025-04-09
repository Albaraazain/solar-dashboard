import type { Metadata } from 'next'
import './globals.css'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL('https://energycove.vercel.app'),
  title: {
    default: 'EnergyCove - Solar Solutions for Pakistan',
    template: '%s | EnergyCove'
  },
  description: 'Analyze your electricity bill and discover how much you could save with solar energy solutions in Pakistan.',
  keywords: ['solar energy', 'pakistan', 'electricity bill', 'solar savings', 'renewable energy'],
  authors: [{ name: 'EnergyCove' }],
  creator: 'EnergyCove',
  publisher: 'EnergyCove',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://energycove.vercel.app',
    title: 'EnergyCove - Smart Solar Solutions',
    description: 'Transform your electricity costs with smart solar solutions. Get personalized analysis and quotes.',
    siteName: 'EnergyCove',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'EnergyCove - Solar Solutions',
    description: 'Smart solar solutions for Pakistan',
    images: ['/og-image.jpg'],
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' }
    ],
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>{children}</body>
    </html>
  )
}
