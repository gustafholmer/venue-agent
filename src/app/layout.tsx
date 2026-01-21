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

export const metadata: Metadata = {
  title: 'Venue Agent - Hitta den perfekta lokalen',
  description: 'Beskriv ditt event sa hittar vi matchande lokaler med tillgangliga datum.',
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
