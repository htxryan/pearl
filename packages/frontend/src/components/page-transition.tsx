import { useLocation } from "react-router";
import { useRef, useState, useEffect, type ReactNode } from "react";

interface PageTransitionProps {
  children: ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  const location = useLocation();
  const [displayedChildren, setDisplayedChildren] = useState(children);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const prevPathRef = useRef(location.pathname);
  const childrenRef = useRef(children);
  childrenRef.current = children;

  useEffect(() => {
    if (location.pathname === prevPathRef.current) {
      return;
    }

    prevPathRef.current = location.pathname;
    setIsTransitioning(true);

    // Short fade-out, then swap content and fade-in
    const timer = setTimeout(() => {
      setDisplayedChildren(childrenRef.current);
      setIsTransitioning(false);
    }, 100);

    return () => clearTimeout(timer);
  }, [location.pathname]);

  return (
    <div
      className={`page-transition ${isTransitioning ? "page-transition-exit" : "page-transition-enter"}`}
      style={{ height: "100%", width: "100%" }}
    >
      {isTransitioning ? displayedChildren : children}
    </div>
  );
}
