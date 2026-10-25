export class AppError extends Error {
  constructor(
    public code: string,
    public status = 400,
  ) {
    super(code);
  }
}
export function check(value: unknown, code: string, status = 400): asserts value {
  if (!value) throw new AppError(code, status);
}
