import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useEmbeddedModeDetection } from "./use-embedded-mode";

const mockFetchHealth = vi.fn();
vi.mock("@/lib/api-client", () => ({
  fetchHealth: (...args: unknown[]) => mockFetchHealth(...args),
}));

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: 0 } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("useEmbeddedModeDetection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (window as unknown as Record<string, unknown>).__PEARL_TEST_SUPPRESS_MIGRATION_MODAL__;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns isEmbedded=false and showModal=false when dolt_mode is server", async () => {
    mockFetchHealth.mockResolvedValue({
      status: "healthy",
      dolt_server: "running",
      dolt_mode: "server",
      uptime_seconds: 100,
      version: "1.0.0",
    });

    const { result } = renderHook(() => useEmbeddedModeDetection(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isEmbedded).toBe(false);
    expect(result.current.showModal).toBe(false);
  });

  it("returns isEmbedded=true and showModal=true when dolt_mode is embedded", async () => {
    mockFetchHealth.mockResolvedValue({
      status: "degraded",
      dolt_server: "stopped",
      dolt_mode: "embedded",
      uptime_seconds: 0,
      version: "1.0.0",
    });

    const { result } = renderHook(() => useEmbeddedModeDetection(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isEmbedded).toBe(true));
    expect(result.current.showModal).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });

  it("locks showModal=true once embedded mode is detected, even if health query later errors", async () => {
    mockFetchHealth.mockResolvedValueOnce({
      status: "degraded",
      dolt_server: "stopped",
      dolt_mode: "embedded",
      uptime_seconds: 0,
      version: "1.0.0",
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: 0 } },
    });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useEmbeddedModeDetection(), { wrapper });

    await waitFor(() => expect(result.current.isEmbedded).toBe(true));
    expect(result.current.showModal).toBe(true);

    mockFetchHealth.mockRejectedValueOnce(new Error("network error"));
    await act(async () => {
      await queryClient.invalidateQueries({ queryKey: ["health"] });
    });

    expect(result.current.isEmbedded).toBe(true);
    expect(result.current.showModal).toBe(true);
  });

  it("respects __PEARL_TEST_SUPPRESS_MIGRATION_MODAL__", async () => {
    (window as unknown as Record<string, unknown>).__PEARL_TEST_SUPPRESS_MIGRATION_MODAL__ = true;

    mockFetchHealth.mockResolvedValue({
      status: "degraded",
      dolt_server: "stopped",
      dolt_mode: "embedded",
      uptime_seconds: 0,
      version: "1.0.0",
    });

    const { result } = renderHook(() => useEmbeddedModeDetection(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isEmbedded).toBe(true));
    expect(result.current.showModal).toBe(false);
  });
});
