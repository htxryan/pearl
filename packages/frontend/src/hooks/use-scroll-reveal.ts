import { useLayoutEffect, useRef, useState } from "react";

export function useScrollReveal<T extends HTMLElement>(
  threshold = 0.1,
): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  const [revealed, setRevealed] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || revealed) return;

    if (typeof IntersectionObserver === "undefined") {
      setRevealed(true);
      return;
    }

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) {
      setRevealed(true);
      return;
    }

    // Synchronously check if already in viewport to prevent opacity-0 flash
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
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
