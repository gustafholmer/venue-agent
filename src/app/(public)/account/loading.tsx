export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto animate-pulse">
      {/* Header */}
      <div className="mb-8">
        <div className="h-8 w-64 bg-[#e7e5e4] rounded-lg" />
        <div className="h-4 w-80 bg-[#e7e5e4] rounded mt-2" />
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white border border-[#e7e5e4] rounded-xl p-4">
            <div className="h-8 w-12 bg-[#e7e5e4] rounded mb-2" />
            <div className="h-4 w-24 bg-[#e7e5e4] rounded" />
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white border border-[#e7e5e4] rounded-xl p-6">
            <div className="w-10 h-10 bg-[#e7e5e4] rounded-lg mb-3" />
            <div className="h-5 w-28 bg-[#e7e5e4] rounded mb-2" />
            <div className="h-4 w-48 bg-[#e7e5e4] rounded" />
          </div>
        ))}
      </div>

      {/* Recent bookings */}
      <div className="bg-white border border-[#e7e5e4] rounded-xl overflow-hidden">
        <div className="p-6 border-b border-[#e7e5e4] flex items-center justify-between">
          <div className="h-6 w-40 bg-[#e7e5e4] rounded" />
          <div className="h-4 w-20 bg-[#e7e5e4] rounded" />
        </div>
        <div className="divide-y divide-[#e7e5e4]">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 p-4">
              <div className="w-16 h-16 flex-shrink-0 bg-[#e7e5e4] rounded-lg" />
              <div className="flex-1 min-w-0">
                <div className="h-5 w-40 bg-[#e7e5e4] rounded mb-2" />
                <div className="h-4 w-32 bg-[#e7e5e4] rounded" />
              </div>
              <div className="h-6 w-20 bg-[#e7e5e4] rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
