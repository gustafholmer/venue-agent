export default function Loading() {
  return (
    <div className="animate-pulse">
      {/* Header with mark all read */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="h-8 w-36 bg-[#e7e5e4] rounded-lg mb-1" />
          <div className="h-4 w-28 bg-[#e7e5e4] rounded" />
        </div>
        <div className="h-9 w-36 bg-[#e7e5e4] rounded-lg" />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-8 w-24 bg-[#e7e5e4] rounded-full" />
        ))}
      </div>

      {/* Notification list */}
      <div className="bg-white border border-[#e7e5e4] rounded-xl overflow-hidden">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="flex items-start gap-3 px-4 sm:px-5 py-4 border-b border-[#e7e5e4] last:border-b-0"
          >
            <div className="w-9 h-9 bg-[#e7e5e4] rounded-full flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="h-4 w-56 bg-[#e7e5e4] rounded mb-2" />
              <div className="h-3 w-80 bg-[#e7e5e4] rounded mb-1" />
              <div className="h-3 w-20 bg-[#e7e5e4] rounded" />
            </div>
            <div className="h-2 w-2 bg-[#e7e5e4] rounded-full flex-shrink-0 mt-2" />
          </div>
        ))}
      </div>
    </div>
  )
}
