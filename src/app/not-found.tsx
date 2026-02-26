import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-8">
      <div className="max-w-md text-center">
        <div className="w-20 h-20 mb-8 mx-auto rounded-full bg-[#f5f3f0] flex items-center justify-center">
          <span className="text-3xl font-semibold text-[#78716c]">404</span>
        </div>
        <h1 className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-[#1a1a1a] mb-3">
          Sidan hittades inte
        </h1>
        <p className="text-[#78716c] mb-8">
          Sidan du letar efter finns inte eller har flyttats.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 bg-[#1a1a1a] text-white hover:bg-[#333] focus-visible:ring-[#1a1a1a] h-10 px-5 text-sm"
        >
          Gå till startsidan
        </Link>
      </div>
    </div>
  )
}
