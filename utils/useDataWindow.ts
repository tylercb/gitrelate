import { useEffect, useState } from "react";
import type { DataWindow } from "@/types/github";
import { getDataWindowClient } from "@/lib/repos.client";

/**
 * Loads the span of time the star data covers.
 * @returns {DataWindow | null} The span, or null while it is loading or if it could not be loaded.
 */
export function useDataWindow(): DataWindow | null {
  const [dataWindow, setDataWindow] = useState<DataWindow | null>(null);

  useEffect(() => {
    let ignore = false;

    // Pages work without the date range, so a failure here is not shown
    getDataWindowClient()
      .then((window) => {
        if (!ignore) setDataWindow(window);
      })
      .catch((err) => {
        console.error("Error fetching data window:", err);
      });

    return () => {
      ignore = true;
    };
  }, []);

  return dataWindow;
}
