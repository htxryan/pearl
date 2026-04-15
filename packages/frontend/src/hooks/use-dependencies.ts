import { useQuery, useIsMutating } from "@tanstack/react-query";
import type { Dependency } from "@pearl/shared";
import * as api from "@/lib/api-client";
import { dependencyKeys } from "./use-issues";

// ─── All Dependencies Hook ────────────────────────────
export function useAllDependencies() {
  const pendingMutations = useIsMutating({ mutationKey: ["dependencies"] });

  return useQuery<Dependency[]>({
    queryKey: dependencyKeys.all,
    queryFn: () => api.fetchAllDependencies(),
    // Suppress polling while mutations are pending
    refetchInterval: pendingMutations > 0 ? false : 2000,
  });
}
