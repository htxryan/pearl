import { useCallback } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router";
import { loadFilterParams } from "./use-filter-sync";

const VIEW_PATHS = new Set(["/list", "/board", "/graph"]);

/**
 * Returns a navigate function that carries current URL search params
 * when navigating between view paths (list/board/graph).
 * When on a non-view path (e.g., detail view), falls back to saved
 * filter params from localStorage.
 * For non-view paths (settings), navigates normally.
 */
export function useViewNavigate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();

  return useCallback(
    (path: string) => {
      if (VIEW_PATHS.has(path)) {
        let search = searchParams.toString();
        if (!search && !VIEW_PATHS.has(location.pathname)) {
          search = loadFilterParams() ?? "";
        }
        navigate(search ? `${path}?${search}` : path);
      } else {
        navigate(path);
      }
    },
    [navigate, searchParams, location.pathname],
  );
}
