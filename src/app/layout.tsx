import type { Metadata } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import './globals.css'
import { GoogleMapsProvider } from '@/components/maps'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  style: ['normal', 'italic']
})

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://venue-agent.se'

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'Tryffle - Hitta den perfekta lokalen',
    template: '%s | Tryffle',
  },
  description: 'Beskriv ditt event så hittar vi matchande lokaler med tillgängliga datum.',
  openGraph: {
    type: 'website',
    locale: 'sv_SE',
    siteName: 'Tryffle',
  },
  twitter: {
    card: 'summary_large_image',
  },
  robots: {
    index: true,
    follow: true,
    'max-snippet': -1,
    'max-image-preview': 'large',
    'max-video-preview': -1,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="sv">
      <body className={`${inter.variable} ${playfair.variable} font-sans`}>
        <GoogleMapsProvider>
          {children}
        </GoogleMapsProvider>
      </body>
    </html>
  )
}
