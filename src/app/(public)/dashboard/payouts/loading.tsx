export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto animate-pulse">
      {/* Header */}
      <div className="mb-8">
        <div className="h-8 w-48 bg-[#e7e5e4] rounded-lg mb-2" />
        <div className="h-5 w-72 bg-[#e7e5e4] rounded" />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white border border-[#e7e5e4] rounded-xl p-5">
            <div className="h-4 bg-[#e7e5e4] rounded w-24 mb-3" />
            <div className="h-7 bg-[#e7e5e4] rounded w-32" />
          </div>
        ))}
      </div>

      {/* History table */}
      <div className="bg-white border border-[#e7e5e4] rounded-xl overflow-hidden">
        {/* Tab filter */}
        <div className="border-b border-[#e7e5e4] px-5">
          <div className="flex gap-6 py-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-4 w-16 bg-[#e7e5e4] rounded" />
            ))}
          </div>
        </div>

        {/* Table rows */}
        <div className="p-5 space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="h-4 bg-[#e7e5e4] rounded w-24" />
              <div className="h-4 bg-[#e7e5e4] rounded w-32 flex-1" />
              <div className="h-4 bg-[#e7e5e4] rounded w-20" />
              <div className="h-4 bg-[#e7e5e4] rounded w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
