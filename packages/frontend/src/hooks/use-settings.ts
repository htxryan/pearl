import type { MutationResponse, Settings } from "@pearl/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "@/lib/api-client";

export const settingsKeys = {
  all: ["settings"] as const,
};

export function useSettings() {
  return useQuery<Settings>({
    queryKey: settingsKeys.all,
    queryFn: api.fetchSettings,
    staleTime: 60_000,
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation<MutationResponse<Settings>, Error, Settings>({
    mutationFn: (data: Settings) => api.updateSettings(data),
    onSuccess: (response) => {
      if (response.data) {
        queryClient.setQueryData(settingsKeys.all, response.data);
      }
    },
  });
}
