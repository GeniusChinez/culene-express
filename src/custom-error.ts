export class CustomError extends Error {}

export function isCustomError(e: unknown) {
  return e instanceof CustomError;
}
