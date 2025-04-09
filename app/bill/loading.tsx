export default function Loading() {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 text-gray-800">
      <div className="max-w-[1440px] mx-auto w-full p-4 md:p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="h-6 w-32 bg-gray-200 rounded animate-pulse mb-4"></div>
          <div className="h-8 w-64 bg-gray-200 rounded animate-pulse"></div>
        </div>

        {/* Main content skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Bill display skeleton */}
          <div className="lg:col-span-6 xl:col-span-5">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="h-16 bg-gradient-to-r from-emerald-600/50 to-emerald-700/50"></div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="h-6 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse"></div>
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-4 bg-gray-200 rounded animate-pulse"></div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Analytics skeleton */}
          <div className="lg:col-span-6 xl:col-span-7 space-y-6">
            {/* Chart skeleton */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <div className="h-6 bg-gray-200 rounded w-48 animate-pulse mb-4"></div>
              <div className="h-64 bg-gray-100 rounded animate-pulse"></div>
            </div>

            {/* Stats grid skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2].map((i) => (
                <div key={i} className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                  <div className="h-6 bg-gray-200 rounded w-32 animate-pulse mb-4"></div>
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                    <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
