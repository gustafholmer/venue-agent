export default function PayoutsPage() {
  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-[#1a1a1a]">Utbetalningar</h1>
        <p className="text-[#78716c] mt-1">
          Hantera dina utbetalningar och se transaktionshistorik
        </p>
      </div>

      {/* Coming soon state */}
      <div className="bg-white border border-[#e7e5e4] rounded-xl p-12 text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-[#d1fae5] rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-[#059669]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-[#1a1a1a] mb-2">
          Kommer snart
        </h3>
        <p className="text-[#78716c] max-w-md mx-auto">
          Betalningsfunktionen är under utveckling. Snart kommer du kunna ta emot betalningar
          direkt via plattformen och se alla dina utbetalningar här.
        </p>
      </div>
    </div>
  )
}
