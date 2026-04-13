import { useLocation } from "react-router";
import { useRef, useState, useEffect, type ReactNode } from "react";

/**
 * Route indices matching sidebar nav order.
 * Lower index → higher index = "forward" (slide left).
 * Higher index → lower index = "backward" (slide right).
 */
const ROUTE_INDEX: Record<string, number> = {
  "/list": 0,
  "/board": 1,
  "/graph": 2,
};

type Direction = "left" | "right" | "drill-in" | "drill-out" | "fade";

function getDirection(from: string, to: string): Direction {
  // Settings always fades
  if (to === "/settings" || from === "/settings") return "fade";

  const toIsDetail = to.startsWith("/issues/");
  const fromIsDetail = from.startsWith("/issues/");

  // Detail view "drill-down" from any nav view
  if (toIsDetail && !fromIsDetail) return "drill-in";
  // Leaving detail view back to nav
  if (fromIsDetail && !toIsDetail) return "drill-out";

  // Between main nav views — use index order
  const fromIdx = ROUTE_INDEX[from];
  const toIdx = ROUTE_INDEX[to];

  if (fromIdx !== undefined && toIdx !== undefined) {
    return toIdx > fromIdx ? "left" : "right";
  }

  return "fade";
}

/** Map direction + phase to CSS class names (defined in index.css). */
function getAnimationClass(
  direction: Direction,
  phase: "exiting" | "entering",
): string {
  if (direction === "fade") {
    return phase === "exiting" ? "page-exit-fade" : "page-enter-fade";
  }
  if (direction === "left") {
    return phase === "exiting" ? "page-exit-left" : "page-enter-from-right";
  }
  if (direction === "right") {
    return phase === "exiting" ? "page-exit-right" : "page-enter-from-left";
  }
  if (direction === "drill-in") {
    return phase === "exiting" ? "page-exit-fade" : "page-enter-drill";
  }
  if (direction === "drill-out") {
    return phase === "exiting" ? "page-exit-drill" : "page-enter-fade";
  }
  return "";
}

const EXIT_MS = 100;
const ENTER_MS = 200;

interface PageTransitionProps {
  children: ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  const location = useLocation();
  const [displayedChildren, setDisplayedChildren] = useState(children);
  const [phase, setPhase] = useState<"idle" | "exiting" | "entering">("idle");
  const [direction, setDirection] = useState<Direction>("fade");
  const prevPathRef = useRef(location.pathname);
  const childrenRef = useRef(children);
  childrenRef.current = children;

  // Detect route change → start exit animation
  useEffect(() => {
    if (location.pathname === prevPathRef.current) return;

    const dir = getDirection(prevPathRef.current, location.pathname);
    prevPathRef.current = location.pathname;
    setDirection(dir);
    setPhase("exiting");

    const timer = setTimeout(() => {
      setDisplayedChildren(childrenRef.current);
      setPhase("entering");
    }, EXIT_MS);

    return () => clearTimeout(timer);
  }, [location.pathname]);

  // Enter → idle after entrance animation completes
  useEffect(() => {
    if (phase !== "entering") return;
    const timer = setTimeout(() => setPhase("idle"), ENTER_MS);
    return () => clearTimeout(timer);
  }, [phase]);

  const className =
    phase === "idle" ? "page-idle" : getAnimationClass(direction, phase);

  return (
    <div className={className} style={{ height: "100%", width: "100%" }}>
      {phase === "exiting" ? displayedChildren : children}
    </div>
  );
}
