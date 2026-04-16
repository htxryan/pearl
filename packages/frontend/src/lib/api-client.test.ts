import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClientError, fetchHealth, fetchIssues } from "./api-client";

describe("api-client", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should fetch issues with correct URL", async () => {
    const mockData = [{ id: "test-1", title: "Test Issue" }];
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    } as Response);

    const result = await fetchIssues();

    expect(fetch).toHaveBeenCalledWith(
      "/api/issues",
      expect.objectContaining({
        headers: {},
      }),
    );
    expect(result).toEqual(mockData);
  });

  it("should append query params when provided", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    } as Response);

    const params = new URLSearchParams({ status: "open", priority: "1" });
    await fetchIssues(params);

    expect(fetch).toHaveBeenCalledWith("/api/issues?status=open&priority=1", expect.any(Object));
  });

  it("should throw ApiClientError on non-OK response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 404,
      json: () =>
        Promise.resolve({
          code: "NOT_FOUND",
          message: "Issue not found",
          retryable: false,
        }),
    } as Response);

    await expect(fetchHealth()).rejects.toThrow(ApiClientError);
  });

  it("should handle network errors gracefully", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(fetchHealth()).rejects.toThrow("Failed to fetch");
  });
});
