import { useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router";

const VIEW_PATHS = new Set(["/list", "/board", "/graph"]);

/**
 * Returns a navigate function that carries current URL search params
 * when navigating between view paths (list/board/graph).
 * For non-view paths (settings, detail), navigates normally.
 */
export function useViewNavigate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  return useCallback(
    (path: string) => {
      if (VIEW_PATHS.has(path)) {
        const search = searchParams.toString();
        navigate(search ? `${path}?${search}` : path);
      } else {
        navigate(path);
      }
    },
    [navigate, searchParams],
  );
}
