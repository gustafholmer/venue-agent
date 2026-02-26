import Link from 'next/link'
import { TryffleLogo } from '@/components/illustrations/agent-mascot'
import { VenueBuildings } from '@/components/illustrations/venue-buildings'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#f5e6df] via-[#fdf8f6] to-[#f0e4d8]">
      {/* Header */}
      <header className="bg-gradient-to-r from-[#e8cec8] via-[#f0ddd6] to-[#e4d5cf] border-b border-[#d4bfb6]">
        <div className="px-4 sm:px-6">
          <div className="flex justify-between h-16 items-center">
            <Link href="/" className="flex items-center gap-2.5 group">
              <TryffleLogo variant="small" className="w-12 h-12 transition-transform duration-200 group-hover:scale-110" />
              <span className="text-2xl font-[family-name:var(--font-heading)] tracking-tight text-[#1a1a1a] group-hover:text-[#c45a3b] transition-colors">
                Tryffle
              </span>
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm font-medium px-4 py-1.5 rounded-full bg-[#c45a3b] text-white hover:bg-[#a84832] transition-colors shadow-sm"
            >
              Startsidan
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16">
        <VenueBuildings className="w-64 sm:w-80 opacity-30 mb-8" />
        <p className="text-7xl sm:text-8xl font-[family-name:var(--font-heading)] text-[#c45a3b] opacity-60 mb-4">
          404
        </p>
        <h1 className="font-[family-name:var(--font-heading)] text-2xl sm:text-3xl font-semibold text-[#1a1a1a] mb-3">
          Sidan hittades inte
        </h1>
        <p className="text-[#78716c] mb-8 text-center max-w-sm">
          Sidan du letar efter finns inte eller har flyttats.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium px-6 py-2.5 rounded-full bg-[#c45a3b] text-white hover:bg-[#a84832] transition-colors shadow-sm"
        >
          Gå till startsidan
        </Link>
      </main>

      {/* Footer */}
      <footer className="bg-[#2a1f1a]">
        <div className="px-4 sm:px-6 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <Link href="/" className="flex items-center gap-2 text-sm text-[#fef3c7]">
              <TryffleLogo variant="small" className="w-5 h-5" />
              Tryffle
            </Link>
            <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-[#a8977a]">
              <Link href="/venues" className="hover:text-[#fef3c7] transition-colors">
                Sök eventlokaler
              </Link>
              <Link href="/faq" className="hover:text-[#fef3c7] transition-colors">
                FAQ
              </Link>
              <Link href="/policy" className="hover:text-[#fef3c7] transition-colors">
                Villkor
              </Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  )
}
