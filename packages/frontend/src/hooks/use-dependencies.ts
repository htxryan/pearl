import type { Dependency } from "@pearl/shared";
import { useIsMutating, useQuery } from "@tanstack/react-query";
import * as api from "@/lib/api-client";
import { dependencyKeys } from "./issue-keys";

// ─── All Dependencies Hook ────────────────────────────
export function useAllDependencies() {
  const pendingMutations = useIsMutating({ mutationKey: ["dependencies"] });

  return useQuery<Dependency[]>({
    queryKey: dependencyKeys.all,
    queryFn: () => api.fetchAllDependencies(),
    refetchInterval: pendingMutations > 0 ? false : 10_000,
  });
}
