'use client'

export function ShareButton() {
  return (
    <button
      onClick={() => {
        if (navigator.share) {
          navigator.share({ title: document.title, url: window.location.href })
        } else {
          navigator.clipboard.writeText(window.location.href)
        }
      }}
      className="flex items-center gap-1.5 text-sm font-medium text-[#1a1a1a] hover:bg-[#f5f3f0] rounded-lg px-3 py-2 transition-colors underline underline-offset-2 decoration-transparent hover:decoration-current"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
      </svg>
      Dela
    </button>
  )
}
