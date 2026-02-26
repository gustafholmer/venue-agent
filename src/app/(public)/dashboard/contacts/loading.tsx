export default function Loading() {
  return (
    <div className="animate-pulse">
      {/* Header with export button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="h-8 w-28 bg-[#e7e5e4] rounded-lg" />
        <div className="h-10 w-36 bg-[#e7e5e4] rounded-lg" />
      </div>

      {/* Search bar */}
      <div className="mb-4">
        <div className="h-10 w-full bg-[#e7e5e4] rounded-lg" />
      </div>

      {/* Table */}
      <div className="bg-white border border-[#e7e5e4] rounded-xl overflow-hidden">
        {/* Table header */}
        <div className="hidden lg:flex items-center gap-4 px-6 py-3 border-b border-[#e7e5e4] bg-[#fafaf9]">
          <div className="h-3 w-16 bg-[#e7e5e4] rounded flex-1" />
          <div className="h-3 w-16 bg-[#e7e5e4] rounded w-24" />
          <div className="h-3 w-16 bg-[#e7e5e4] rounded w-20" />
          <div className="h-3 w-16 bg-[#e7e5e4] rounded w-20" />
          <div className="h-3 w-16 bg-[#e7e5e4] rounded w-24" />
          <div className="h-3 w-16 bg-[#e7e5e4] rounded w-24" />
        </div>

        {/* Table rows */}
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-6 py-4 border-b border-[#e7e5e4] last:border-b-0"
          >
            <div className="flex-1">
              <div className="h-4 bg-[#e7e5e4] rounded w-32 mb-2" />
              <div className="h-3 bg-[#e7e5e4] rounded w-44" />
            </div>
            <div className="h-3 bg-[#e7e5e4] rounded w-24 hidden lg:block" />
            <div className="h-3 bg-[#e7e5e4] rounded w-20 hidden lg:block" />
            <div className="h-3 bg-[#e7e5e4] rounded w-12 hidden lg:block" />
            <div className="h-3 bg-[#e7e5e4] rounded w-20 hidden lg:block" />
            <div className="h-3 bg-[#e7e5e4] rounded w-20" />
          </div>
        ))}
      </div>
    </div>
  )
}
