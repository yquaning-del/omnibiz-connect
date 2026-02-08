// Shared input validation helpers for edge functions

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

/**
 * Validates that required fields are present and non-empty in the request body.
 */
export function validateRequired(
  body: Record<string, unknown>,
  fields: string[]
): void {
  const missing = fields.filter(
    (f) => body[f] === undefined || body[f] === null || body[f] === ""
  );
  if (missing.length > 0) {
    throw new ValidationError(
      `Missing required fields: ${missing.join(", ")}`
    );
  }
}

/**
 * Validates that a value is a valid UUID v4.
 */
export function validateUUID(value: unknown, fieldName: string): string {
  if (typeof value !== "string") {
    throw new ValidationError(`${fieldName} must be a string`);
  }
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(value)) {
    throw new ValidationError(`${fieldName} must be a valid UUID`);
  }
  return value;
}

/**
 * Validates that a value is one of the allowed enum values.
 */
export function validateEnum<T extends string>(
  value: unknown,
  allowed: T[],
  fieldName: string
): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new ValidationError(
      `${fieldName} must be one of: ${allowed.join(", ")}`
    );
  }
  return value as T;
}

/**
 * Validates that a string is a valid email address.
 */
export function validateEmail(value: unknown, fieldName: string): string {
  if (typeof value !== "string") {
    throw new ValidationError(`${fieldName} must be a string`);
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value)) {
    throw new ValidationError(`${fieldName} must be a valid email address`);
  }
  return value;
}

/**
 * Validates that a value is a positive number.
 */
export function validatePositiveNumber(
  value: unknown,
  fieldName: string
): number {
  const num = Number(value);
  if (isNaN(num) || num <= 0) {
    throw new ValidationError(`${fieldName} must be a positive number`);
  }
  return num;
}

/**
 * Sanitizes a string to prevent injection (trims and limits length).
 */
export function sanitizeString(
  value: unknown,
  fieldName: string,
  maxLength: number = 10000
): string {
  if (typeof value !== "string") {
    throw new ValidationError(`${fieldName} must be a string`);
  }
  return value.trim().slice(0, maxLength);
}
