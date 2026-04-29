import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useHealth } from "./use-issues";

const mockFetchHealth = vi.fn();
vi.mock("@/lib/api-client", () => ({
  fetchHealth: (...args: unknown[]) => mockFetchHealth(...args),
}));

let queryClient: QueryClient;

function makeWrapper() {
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: 0 } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("useHealth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches health data", async () => {
    mockFetchHealth.mockResolvedValue({
      status: "degraded",
      dolt_server: "stopped",
      dolt_mode: "embedded",
      uptime_seconds: 0,
      version: "1.0.0",
    });

    const { result } = renderHook(() => useHealth(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.dolt_mode).toBe("embedded");
  });

  it("configures refetchInterval as a function that disables polling for embedded mode", async () => {
    mockFetchHealth.mockResolvedValue({
      status: "degraded",
      dolt_server: "stopped",
      dolt_mode: "embedded",
      uptime_seconds: 0,
      version: "1.0.0",
    });

    renderHook(() => useHealth(), { wrapper: makeWrapper() });

    await waitFor(() => {
      const queryState = queryClient.getQueryState(["health"]);
      return expect(queryState?.data).toBeDefined();
    });

    const observer = queryClient.getQueryCache().find({ queryKey: ["health"] });
    expect(observer).toBeDefined();

    // Access refetchInterval from the query observers (typed loosely since
    // QueryCache.find() returns narrower types than QueryObserverOptions)
    const queryOptions = observer?.options as Record<string, unknown> | undefined;
    const refetchInterval = queryOptions?.refetchInterval;
    expect(typeof refetchInterval).toBe("function");

    if (typeof refetchInterval === "function") {
      const fn = refetchInterval as (q: { state: { data: unknown } }) => number | false;
      expect(fn({ state: { data: { dolt_mode: "embedded" } } })).toBe(false);
      expect(fn({ state: { data: { dolt_mode: "server" } } })).toBe(15_000);
      expect(fn({ state: { data: undefined } })).toBe(15_000);
    }
  });
});
