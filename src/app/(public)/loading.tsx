export default function Loading() {
  return (
    <div className="bg-[#f5f3f0]">
      {/* Hero section skeleton */}
      <section className="relative px-4 sm:px-6 pt-12 pb-16 sm:pt-20 sm:pb-24">
        <div className="absolute inset-0 bg-gradient-to-br from-[#f5e6df] via-[#fdf8f6] to-[#f0e4d8] -z-10" />
        <div className="max-w-7xl mx-auto animate-pulse">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div>
              <div className="h-4 w-40 bg-[#e7e5e4] rounded mb-4" />
              <div className="space-y-3 mb-5">
                <div className="h-12 w-full max-w-md bg-[#e7e5e4] rounded-lg" />
                <div className="h-12 w-3/4 max-w-sm bg-[#e7e5e4] rounded-lg" />
              </div>
              <div className="h-4 w-64 bg-[#e7e5e4] rounded mb-8" />
              <div className="h-12 w-full max-w-lg bg-[#e7e5e4] rounded-full" />
            </div>
            <div className="hidden lg:block">
              <div className="w-full max-w-xl aspect-square bg-[#e7e5e4] rounded-xl mx-auto" />
            </div>
          </div>
        </div>
      </section>

      {/* Venue cards grid skeleton */}
      <section className="px-4 sm:px-6 py-12 sm:py-16">
        <div className="animate-pulse">
          <div className="flex items-end justify-between mb-8">
            <div className="h-4 w-32 bg-[#e7e5e4] rounded" />
            <div className="h-4 w-24 bg-[#e7e5e4] rounded" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-xl overflow-hidden">
                <div className="aspect-[4/3] bg-[#e7e5e4]" />
                <div className="p-4 space-y-3">
                  <div className="h-5 w-3/4 bg-[#e7e5e4] rounded" />
                  <div className="h-4 w-1/2 bg-[#e7e5e4] rounded" />
                  <div className="flex gap-4">
                    <div className="h-4 w-20 bg-[#e7e5e4] rounded" />
                    <div className="h-4 w-20 bg-[#e7e5e4] rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories skeleton */}
      <section className="border-t border-[#e7e5e4] bg-[#faf5f2]">
        <div className="px-4 sm:px-6 py-12 sm:py-16 animate-pulse">
          <div className="flex items-end justify-between mb-8">
            <div className="h-4 w-24 bg-[#e7e5e4] rounded" />
            <div className="h-4 w-32 bg-[#e7e5e4] rounded" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="aspect-[4/3] bg-[#e7e5e4] rounded-lg" />
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
