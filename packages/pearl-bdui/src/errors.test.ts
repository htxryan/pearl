import { describe, expect, it } from "vitest";
import {
  AppError,
  cliError,
  databaseLockedError,
  doltUnavailableError,
  internalError,
  notFoundError,
  validationError,
} from "./errors.js";

describe("AppError", () => {
  it("creates errors with correct properties", () => {
    const err = new AppError("CLI_ERROR", "bd failed", 500, false);
    expect(err.code).toBe("CLI_ERROR");
    expect(err.message).toBe("bd failed");
    expect(err.statusCode).toBe(500);
    expect(err.retryable).toBe(false);
  });

  it("serializes to ApiError format", () => {
    const err = doltUnavailableError("Server down");
    const api = err.toApiError();
    expect(api).toEqual({
      code: "DOLT_UNAVAILABLE",
      message: "Server down",
      retryable: true,
    });
  });
});

describe("error factories", () => {
  it("doltUnavailableError", () => {
    const err = doltUnavailableError();
    expect(err.code).toBe("DOLT_UNAVAILABLE");
    expect(err.statusCode).toBe(503);
    expect(err.retryable).toBe(true);
  });

  it("databaseLockedError", () => {
    const err = databaseLockedError();
    expect(err.code).toBe("DATABASE_LOCKED");
    expect(err.statusCode).toBe(423);
    expect(err.retryable).toBe(true);
  });

  it("cliError", () => {
    const err = cliError("something broke");
    expect(err.code).toBe("CLI_ERROR");
    expect(err.statusCode).toBe(500);
  });

  it("validationError", () => {
    const err = validationError("bad input");
    expect(err.code).toBe("VALIDATION_ERROR");
    expect(err.statusCode).toBe(400);
  });

  it("notFoundError", () => {
    const err = notFoundError("Issue", "bd-123");
    expect(err.code).toBe("NOT_FOUND");
    expect(err.statusCode).toBe(404);
    expect(err.message).toContain("bd-123");
  });

  it("internalError", () => {
    const err = internalError("unexpected");
    expect(err.code).toBe("INTERNAL_ERROR");
    expect(err.statusCode).toBe(500);
  });
});
