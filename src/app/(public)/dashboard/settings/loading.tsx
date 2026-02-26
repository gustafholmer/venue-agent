export default function Loading() {
  return (
    <div className="max-w-2xl mx-auto animate-pulse">
      {/* Header */}
      <div className="mb-8">
        <div className="h-8 w-36 bg-[#e7e5e4] rounded-lg mb-2" />
        <div className="h-5 w-64 bg-[#e7e5e4] rounded" />
      </div>

      {/* Profile form */}
      <div className="bg-white border border-[#e7e5e4] rounded-xl p-6 mb-6">
        <div className="h-6 w-40 bg-[#e7e5e4] rounded mb-4" />
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i}>
              <div className="h-4 w-24 bg-[#e7e5e4] rounded mb-1.5" />
              <div className="h-10 w-full bg-[#e7e5e4] rounded-lg" />
            </div>
          ))}
          <div className="pt-2">
            <div className="h-10 w-36 bg-[#e7e5e4] rounded-lg" />
          </div>
        </div>
      </div>

      {/* Notification preferences */}
      <div className="bg-white border border-[#e7e5e4] rounded-xl p-6 mb-6">
        <div className="h-6 w-28 bg-[#e7e5e4] rounded mb-4" />
        <div className="h-4 w-56 bg-[#e7e5e4] rounded mb-6" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-[#faf9f7] rounded-lg">
              <div>
                <div className="h-5 w-40 bg-[#e7e5e4] rounded mb-1" />
                <div className="h-4 w-56 bg-[#e7e5e4] rounded" />
              </div>
              <div className="h-5 w-5 bg-[#e7e5e4] rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Integrations */}
      <div className="bg-white border border-[#e7e5e4] rounded-xl p-6">
        <div className="h-6 w-32 bg-[#e7e5e4] rounded mb-1" />
        <div className="h-4 w-52 bg-[#e7e5e4] rounded mb-4" />
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-[#e7e5e4] rounded-lg" />
          <div>
            <div className="h-5 w-32 bg-[#e7e5e4] rounded mb-2" />
            <div className="h-4 w-64 bg-[#e7e5e4] rounded" />
          </div>
        </div>
      </div>
    </div>
  )
}
