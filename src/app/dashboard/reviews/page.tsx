export default function ReviewsPage() {
  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#111827]">Recensioner</h1>
        <p className="text-[#6b7280] mt-1">
          Se och svara på recensioner från dina gäster
        </p>
      </div>

      {/* Coming soon state */}
      <div className="bg-white border border-[#e5e7eb] rounded-xl p-12 text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-[#fef3c7] rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-[#d97706]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-[#111827] mb-2">
          Kommer snart
        </h3>
        <p className="text-[#6b7280] max-w-md mx-auto">
          Recensionsfunktionen är under utveckling. Snart kommer dina gäster kunna lämna
          omdömen efter genomförda event, och du kan svara på dem här.
        </p>
      </div>
    </div>
  )
}
