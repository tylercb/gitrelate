import { Skeleton } from "@/app/components/Skeleton"

export default function Loading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Skeleton className="h-12 w-3/4 mx-auto mb-6" />
      <div className="overflow-x-auto shadow-md rounded-lg max-w-screen-lg mx-auto">
        <div className="w-full">
          <div className="bg-gray-50 dark:bg-gray-700 px-6 py-3">
            <div className="grid grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-6 w-full" />
              ))}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="border-b border-gray-200 dark:border-gray-700 px-6 py-4">
                <div className="grid grid-cols-4 gap-4">
                  {[...Array(4)].map((_, j) => (
                    <Skeleton key={j} className="h-6 w-full" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
