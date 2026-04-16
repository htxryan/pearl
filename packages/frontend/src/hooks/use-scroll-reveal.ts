import { useEffect, useRef, useState } from "react";

/**
 * Returns a ref and a boolean indicating whether the element has scrolled into view.
 * Uses IntersectionObserver for efficient scroll-triggered reveals.
 * Once revealed, stays revealed (one-shot animation).
 */
export function useScrollReveal<T extends HTMLElement>(
  threshold = 0.1,
): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || revealed) return;

    // Fallback: if IntersectionObserver unavailable (e.g. jsdom), reveal immediately
    if (typeof IntersectionObserver === "undefined") {
      setRevealed(true);
      return;
    }

    // Check prefers-reduced-motion — skip animation entirely
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) {
      setRevealed(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      { threshold },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, revealed]);

  return [ref, revealed];
}
