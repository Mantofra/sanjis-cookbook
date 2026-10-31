export class AppError extends Error {
  public status: number;
  public details: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.details = details;
  }
}
