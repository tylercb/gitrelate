import { useEffect, useState } from "react";
import { Skeleton } from "@/app/components/Skeleton";

// Most searches finish before this, so the message only appears for slow ones
const SLOW_AFTER_SECONDS = 3;

// Loading skeleton for the repo table, with a way out when the search drags on
export default function RepoTableLoading({
  onCancel,
}: {
  onCancel?: () => void;
}) {
  const [seconds, setSeconds] = useState<number>(0);

  useEffect(() => {
    const timer = setInterval(() => setSeconds((prev) => prev + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <>
      {seconds >= SLOW_AFTER_SECONDS && (
        <p className="text-center text-sm text-gray-600 dark:text-gray-400 mb-4">
          Still searching after {seconds} seconds. Repos with many stargazers
          can take up to 30.
          {onCancel && (
            <>
              {" "}
              <button
                type="button"
                onClick={onCancel}
                className="underline text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
              >
                Cancel
              </button>
            </>
          )}
        </p>
      )}
      <div className="overflow-x-auto shadow-md rounded-lg max-w-screen-lg mx-auto">
        <div className="w-full">
          <div className="bg-gray-50 dark:bg-gray-700 px-6 py-3">
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton
                  key={i}
                  className={`h-6 w-full ${i > 2 ? "hidden sm:block" : ""}`}
                />
              ))}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800">
            {[...Array(10)].map((_, i) => (
              <div
                key={i}
                className="border-b border-gray-200 dark:border-gray-700 px-6 py-4"
              >
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-4">
                  {[...Array(5)].map((_, j) => (
                    <Skeleton
                      key={j}
                      className={`h-6 w-full ${j > 2 ? "hidden sm:block" : ""}`}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
