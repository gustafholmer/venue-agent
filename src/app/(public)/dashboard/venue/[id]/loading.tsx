export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto animate-pulse">
      {/* Header with status badge */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="h-4 w-56 bg-[#e7e5e4] rounded" />
          <div className="flex items-center gap-3">
            <div className="h-9 w-24 bg-[#e7e5e4] rounded-lg" />
            <div className="h-7 w-20 bg-[#e7e5e4] rounded-full" />
          </div>
        </div>
      </div>

      {/* Photo management section */}
      <div className="bg-white border border-[#e7e5e4] rounded-xl p-6 mb-6">
        <div className="h-6 w-20 bg-[#e7e5e4] rounded mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="aspect-[4/3] bg-[#e7e5e4] rounded-lg" />
          ))}
        </div>
      </div>

      {/* Edit form section */}
      <div className="bg-white border border-[#e7e5e4] rounded-xl p-6">
        <div className="space-y-8">
          {/* Basic Info */}
          <div>
            <div className="h-6 w-52 bg-[#e7e5e4] rounded mb-4" />
            <div className="space-y-4">
              <div className="h-10 bg-[#e7e5e4] rounded" />
              <div className="h-24 bg-[#e7e5e4] rounded" />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-10 bg-[#e7e5e4] rounded-lg" />
                ))}
              </div>
            </div>
          </div>

          {/* Location */}
          <div>
            <div className="h-6 w-16 bg-[#e7e5e4] rounded mb-4" />
            <div className="space-y-4">
              <div className="h-10 bg-[#e7e5e4] rounded" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="h-10 bg-[#e7e5e4] rounded" />
                <div className="h-10 bg-[#e7e5e4] rounded" />
              </div>
            </div>
          </div>

          {/* Capacity */}
          <div>
            <div className="h-6 w-24 bg-[#e7e5e4] rounded mb-4" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-10 bg-[#e7e5e4] rounded" />
              ))}
            </div>
          </div>

          {/* Pricing */}
          <div>
            <div className="h-6 w-20 bg-[#e7e5e4] rounded mb-4" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-10 bg-[#e7e5e4] rounded" />
              ))}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-[#e7e5e4]">
          <div className="h-10 w-28 bg-[#e7e5e4] rounded-lg" />
          <div className="h-10 w-36 bg-[#e7e5e4] rounded-lg" />
        </div>
      </div>
    </div>
  )
}
