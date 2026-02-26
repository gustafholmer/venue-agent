export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto animate-pulse">
      {/* Header */}
      <div className="mb-8">
        <div className="h-8 w-52 bg-[#e7e5e4] rounded-lg" />
        <div className="h-4 w-72 bg-[#e7e5e4] rounded mt-2" />
      </div>

      {/* Filter tabs */}
      <div className="bg-white border border-[#e7e5e4] rounded-xl mb-6">
        <div className="flex border-b border-[#e7e5e4] px-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="px-4 py-3">
              <div className="h-4 w-20 bg-[#e7e5e4] rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Inquiry cards */}
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white border border-[#e7e5e4] rounded-xl overflow-hidden">
            <div className="flex flex-col sm:flex-row">
              <div className="sm:w-48 h-32 sm:h-auto flex-shrink-0 bg-[#e7e5e4]" />
              <div className="flex-1 p-4 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="h-6 bg-[#e7e5e4] rounded w-44 mb-2" />
                    <div className="h-4 bg-[#e7e5e4] rounded w-36" />
                  </div>
                  <div className="h-6 bg-[#e7e5e4] rounded-full w-20" />
                </div>
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((j) => (
                    <div key={j}>
                      <div className="h-3 bg-[#e7e5e4] rounded w-14 mb-1" />
                      <div className="h-5 bg-[#e7e5e4] rounded w-20" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
