import type { ApiError, ApiErrorCode } from "@pearl/shared";

export class AppError extends Error {
  readonly code: ApiErrorCode;
  readonly statusCode: number;
  readonly retryable: boolean;

  constructor(
    code: ApiErrorCode,
    message: string,
    statusCode: number,
    retryable = false
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.retryable = retryable;
  }

  toApiError(): ApiError {
    return {
      code: this.code,
      message: this.message,
      retryable: this.retryable,
    };
  }
}

export function doltUnavailableError(detail?: string): AppError {
  return new AppError(
    "DOLT_UNAVAILABLE",
    detail || "Dolt SQL server is not available",
    503,
    true
  );
}

export function databaseLockedError(): AppError {
  return new AppError(
    "DATABASE_LOCKED",
    "Database is locked by another process",
    423,
    true
  );
}

export function cliError(message: string): AppError {
  return new AppError("CLI_ERROR", message, 500, false);
}

export function validationError(message: string): AppError {
  return new AppError("VALIDATION_ERROR", message, 400, false);
}

export function notFoundError(entity: string, id: string): AppError {
  // Truncate id to prevent reflected content in logs/downstream systems
  const safeId = id.length > 100 ? id.slice(0, 100) + "…" : id;
  return new AppError(
    "NOT_FOUND",
    `${entity} '${safeId}' not found`,
    404,
    false
  );
}

export function internalError(message: string): AppError {
  return new AppError("INTERNAL_ERROR", message, 500, false);
}
