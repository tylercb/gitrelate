import { useEffect } from "react";

/**
 * Sets the browser tab title while the calling component is rendered.
 * @param {string} title - The document title to apply.
 */
export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = title;
  }, [title]);
}
