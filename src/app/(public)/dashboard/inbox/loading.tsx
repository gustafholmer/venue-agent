export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto animate-pulse">
      {/* Header with filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="h-8 w-24 bg-[#e7e5e4] rounded-lg" />
        <div className="flex gap-1 bg-[#f5f5f4] rounded-lg p-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 w-24 bg-[#e7e5e4] rounded-md" />
          ))}
        </div>
      </div>

      {/* Message list */}
      <div className="bg-white border border-[#e7e5e4] rounded-xl overflow-hidden">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="flex items-start gap-4 px-4 sm:px-6 py-4 border-b border-[#e7e5e4] last:border-b-0"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-5 w-20 bg-[#e7e5e4] rounded-full" />
                <div className="h-5 w-16 bg-[#e7e5e4] rounded-full" />
              </div>
              <div className="h-4 w-48 bg-[#e7e5e4] rounded mb-1" />
              <div className="h-3 w-64 bg-[#e7e5e4] rounded mb-2" />
              <div className="flex gap-3">
                <div className="h-3 w-20 bg-[#e7e5e4] rounded" />
                <div className="h-3 w-16 bg-[#e7e5e4] rounded" />
              </div>
            </div>
            <div className="h-3 w-12 bg-[#e7e5e4] rounded flex-shrink-0" />
          </div>
        ))}
      </div>
    </div>
  )
}
