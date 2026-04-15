import { describe, it, expect } from "vitest";
import {
  AppError,
  doltUnavailableError,
  databaseLockedError,
  cliError,
  validationError,
  notFoundError,
  internalError,
} from "./errors.js";

// ─── AppError core behavior ──────────────────────────

describe("AppError integration", () => {
  it("extends Error with correct name", () => {
    const err = new AppError("CLI_ERROR", "test", 500, false);
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("AppError");
  });

  it("exposes code, statusCode, retryable, and message", () => {
    const err = new AppError("DOLT_UNAVAILABLE", "server down", 503, true);
    expect(err.code).toBe("DOLT_UNAVAILABLE");
    expect(err.statusCode).toBe(503);
    expect(err.retryable).toBe(true);
    expect(err.message).toBe("server down");
  });

  it("serializes to ApiError shape via toApiError()", () => {
    const err = new AppError("DATABASE_LOCKED", "locked", 423, true);
    const apiError = err.toApiError();
    expect(apiError).toEqual({
      code: "DATABASE_LOCKED",
      message: "locked",
      retryable: true,
    });
    // apiError should NOT include statusCode (that's HTTP-level, not payload)
    expect(apiError).not.toHaveProperty("statusCode");
    expect(apiError).not.toHaveProperty("status");
  });

  it("defaults retryable to false when not specified", () => {
    const err = new AppError("INTERNAL_ERROR", "oops", 500);
    expect(err.retryable).toBe(false);
  });

  it("has a proper stack trace", () => {
    const err = new AppError("CLI_ERROR", "test", 500, false);
    expect(err.stack).toBeDefined();
    expect(err.stack).toContain("AppError");
  });
});

// ─── Error Factory Functions ─────────────────────────

describe("Error factory functions", () => {
  describe("doltUnavailableError", () => {
    it("produces correct code, status, and retryable=true", () => {
      const err = doltUnavailableError();
      expect(err.code).toBe("DOLT_UNAVAILABLE");
      expect(err.statusCode).toBe(503);
      expect(err.retryable).toBe(true);
      expect(err).toBeInstanceOf(AppError);
    });

    it("uses default message when none provided", () => {
      const err = doltUnavailableError();
      expect(err.message).toBe("Dolt SQL server is not available");
    });

    it("uses custom message when provided", () => {
      const err = doltUnavailableError("Connection timed out");
      expect(err.message).toBe("Connection timed out");
    });

    it("serializes correctly for API response", () => {
      const err = doltUnavailableError("Custom msg");
      expect(err.toApiError()).toEqual({
        code: "DOLT_UNAVAILABLE",
        message: "Custom msg",
        retryable: true,
      });
    });
  });

  describe("databaseLockedError", () => {
    it("produces correct code, status, and retryable=true", () => {
      const err = databaseLockedError();
      expect(err.code).toBe("DATABASE_LOCKED");
      expect(err.statusCode).toBe(423);
      expect(err.retryable).toBe(true);
      expect(err).toBeInstanceOf(AppError);
    });

    it("uses default message", () => {
      const err = databaseLockedError();
      expect(err.message).toBe("Database is locked by another process");
    });

    it("serializes correctly for API response", () => {
      const err = databaseLockedError();
      expect(err.toApiError()).toEqual({
        code: "DATABASE_LOCKED",
        message: "Database is locked by another process",
        retryable: true,
      });
    });
  });

  describe("cliError", () => {
    it("produces correct code, status, and retryable=false", () => {
      const err = cliError("bd command failed with exit code 1");
      expect(err.code).toBe("CLI_ERROR");
      expect(err.statusCode).toBe(500);
      expect(err.retryable).toBe(false);
      expect(err).toBeInstanceOf(AppError);
    });

    it("preserves the provided message", () => {
      const err = cliError("something broke");
      expect(err.message).toBe("something broke");
    });

    it("serializes correctly for API response", () => {
      const err = cliError("parse failed");
      expect(err.toApiError()).toEqual({
        code: "CLI_ERROR",
        message: "parse failed",
        retryable: false,
      });
    });
  });

  describe("validationError", () => {
    it("produces correct code, status, and retryable=false", () => {
      const err = validationError("title is required");
      expect(err.code).toBe("VALIDATION_ERROR");
      expect(err.statusCode).toBe(400);
      expect(err.retryable).toBe(false);
      expect(err).toBeInstanceOf(AppError);
    });

    it("preserves the provided message", () => {
      const err = validationError("priority must be 0-4");
      expect(err.message).toBe("priority must be 0-4");
    });

    it("serializes correctly for API response", () => {
      const err = validationError("bad input");
      expect(err.toApiError()).toEqual({
        code: "VALIDATION_ERROR",
        message: "bad input",
        retryable: false,
      });
    });
  });

  describe("notFoundError", () => {
    it("produces correct code, status, and retryable=false", () => {
      const err = notFoundError("Issue", "bd-123");
      expect(err.code).toBe("NOT_FOUND");
      expect(err.statusCode).toBe(404);
      expect(err.retryable).toBe(false);
      expect(err).toBeInstanceOf(AppError);
    });

    it("formats entity and id into message", () => {
      const err = notFoundError("Issue", "bd-123");
      expect(err.message).toBe("Issue 'bd-123' not found");
    });

    it("truncates long ids to prevent reflected content", () => {
      const longId = "x".repeat(200);
      const err = notFoundError("Issue", longId);
      expect(err.message).toContain("x".repeat(100));
      expect(err.message).toContain("…");
      // The message should be shorter than the original long id
      expect(err.message.length).toBeLessThan(200);
    });

    it("does not truncate short ids", () => {
      const err = notFoundError("Issue", "bd-42");
      expect(err.message).toBe("Issue 'bd-42' not found");
      expect(err.message).not.toContain("…");
    });

    it("serializes correctly for API response", () => {
      const err = notFoundError("Comment", "c-999");
      expect(err.toApiError()).toEqual({
        code: "NOT_FOUND",
        message: "Comment 'c-999' not found",
        retryable: false,
      });
    });
  });

  describe("internalError", () => {
    it("produces correct code, status, and retryable=false", () => {
      const err = internalError("unexpected failure");
      expect(err.code).toBe("INTERNAL_ERROR");
      expect(err.statusCode).toBe(500);
      expect(err.retryable).toBe(false);
      expect(err).toBeInstanceOf(AppError);
    });

    it("preserves the provided message", () => {
      const err = internalError("disk full");
      expect(err.message).toBe("disk full");
    });

    it("serializes correctly for API response", () => {
      const err = internalError("out of memory");
      expect(err.toApiError()).toEqual({
        code: "INTERNAL_ERROR",
        message: "out of memory",
        retryable: false,
      });
    });
  });
});

// ─── Cross-cutting: retryable categorization ─────────

describe("Retryable error categorization", () => {
  it("only DOLT_UNAVAILABLE and DATABASE_LOCKED are retryable", () => {
    const retryable = [doltUnavailableError(), databaseLockedError()];
    const nonRetryable = [
      cliError("x"),
      validationError("x"),
      notFoundError("X", "1"),
      internalError("x"),
    ];

    for (const err of retryable) {
      expect(err.retryable).toBe(true);
      expect(err.toApiError().retryable).toBe(true);
    }

    for (const err of nonRetryable) {
      expect(err.retryable).toBe(false);
      expect(err.toApiError().retryable).toBe(false);
    }
  });
});

// ─── Consistent serialization shape ──────────────────

describe("Consistent API error serialization", () => {
  it("all factory errors produce { code, message, retryable } with no extra fields", () => {
    const errors = [
      doltUnavailableError(),
      databaseLockedError(),
      cliError("test"),
      validationError("test"),
      notFoundError("Test", "1"),
      internalError("test"),
    ];

    for (const err of errors) {
      const apiError = err.toApiError();
      const keys = Object.keys(apiError).sort();
      expect(keys).toEqual(["code", "message", "retryable"]);
    }
  });
});
