import * as React from "react";

/** Below the md breakpoint (768px) tables reflow into stacked rows. */
export const NARROW_MD = "(max-width: 767px)";
/** Below the sm breakpoint (640px). */
export const NARROW_SM = "(max-width: 639px)";

/** Live media-query match; false during server rendering. */
export function useMediaQuery(query: string): boolean {
  return React.useSyncExternalStore(
    (onChange) => { const list = window.matchMedia(query); list.addEventListener("change", onChange); return () => list.removeEventListener("change", onChange); },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
