import { useEffect, useRef } from "react";
import { useLocation } from "react-router";

const routeLabels: Record<string, string> = {
  "/list": "List View",
  "/board": "Board View",
  "/graph": "Graph View",
};

/**
 * Announces route changes to screen readers and manages focus.
 * On navigation, focuses the main content area and announces the page title.
 */
export function useRouteAnnouncer() {
  const location = useLocation();
  const announcerRef = useRef<HTMLDivElement | null>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Skip announcement on initial render
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Determine page label
    let label = routeLabels[location.pathname];
    if (!label && location.pathname.startsWith("/issues/")) {
      label = "Issue Detail";
    }
    if (!label) {
      label = "Page";
    }

    // Announce to screen readers
    if (announcerRef.current) {
      announcerRef.current.textContent = `Navigated to ${label}`;
    }

    // Move focus to main content
    const main = document.getElementById("main-content");
    if (main) {
      main.focus({ preventScroll: false });
    }
  }, [location.pathname]);

  return announcerRef;
}
