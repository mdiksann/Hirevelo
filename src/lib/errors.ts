export class AppError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly httpStatus: number,
  ) {
    super(message);
    this.name = new.target.name;
  }
}
export class ValidationError extends AppError {
  constructor(message = "Please check your input.") {
    super(message, "VALIDATION_ERROR", 400);
  }
}
export class NotFoundError extends AppError {
  constructor(message = "This item could not be found.") {
    super(message, "NOT_FOUND", 404);
  }
}
export class ForbiddenError extends AppError {
  constructor(message = "You do not have access to this item.") {
    super(message, "FORBIDDEN", 403);
  }
}
export class ConflictError extends AppError {
  constructor(message = "This item already exists.") {
    super(message, "CONFLICT", 409);
  }
}
export class StorageError extends AppError {
  constructor(message = "The file could not be stored. Please try again.") {
    super(message, "STORAGE_ERROR", 500);
  }
}
