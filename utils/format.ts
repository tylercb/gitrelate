import type { DataWindow } from "@/types/github";

const formatMonth = (date: string): string =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

/**
 * Describes the span of time the dataset covers, for use mid-sentence.
 * @param {DataWindow} dataWindow - The first and last day covered.
 * @returns {string} For example "between Jan 2023 and Jul 2026".
 */
export const formatDateRange = (dataWindow: DataWindow): string =>
  `between ${formatMonth(dataWindow.start)} and ${formatMonth(dataWindow.end)}`;

/**
 * Formats a fraction as a percentage with one decimal place.
 * @param {number | null} share - A fraction between 0 and 1, or null if unknown.
 * @returns {string} For example "10.7%", or an empty string if unknown.
 */
export const formatShare = (share: number | null): string => {
  if (share === null) return "";

  const percent = share * 100;
  return percent < 0.1 ? "<0.1%" : `${percent.toFixed(1)}%`;
};

/**
 * Returns the host of a URL if it is safe to link to.
 * Repository homepages are free text, so anything other than a web address is rejected.
 * @param {string | null} url - The address to check.
 * @returns {string | null} The host name, or null if the address should not be linked.
 */
export const linkableHost = (url: string | null): string | null => {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return null;
    }
    return parsed.host;
  } catch {
    return null;
  }
};
