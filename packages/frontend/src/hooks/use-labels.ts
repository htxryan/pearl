import type { LabelWithCount, UpsertLabelRequest } from "@pearl/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "@/lib/api-client";

export const labelKeys = {
  all: ["labels"] as const,
};

export function useLabels() {
  return useQuery<LabelWithCount[]>({
    queryKey: labelKeys.all,
    queryFn: api.fetchLabels,
    staleTime: 30_000,
  });
}

export function useCreateLabel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpsertLabelRequest) => api.upsertLabel(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: labelKeys.all });
    },
  });
}
