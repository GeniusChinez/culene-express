/* eslint-disable @typescript-eslint/no-explicit-any */
type ResponseConfig = {
  status: number;
  message: string;
  data?: any;
};

export class CustomError {
  constructor(config: { status: number; message: string; data?: any }) {
    this.status = config.status;
    this.message = config.message;
    this.data = config.data;
  }
  status: number;
  message: string;
  data?: any;
}

export function isCustomError(e: unknown) {
  return e instanceof CustomError;
}

export class HttpNotFoundError extends CustomError {
  constructor(config?: Partial<Pick<ResponseConfig, "data" | "message">>) {
    super({
      message: config?.message || "Resource not found",
      data: config?.data,
      status: 404,
    });
  }
}

export class HttpBadRequestError extends CustomError {
  constructor(config?: Partial<Pick<ResponseConfig, "data" | "message">>) {
    super({
      message: config?.message || "Bad request",
      data: config?.data,
      status: 400,
    });
  }
}

export class HttpUnauthorizedError extends CustomError {
  constructor(config?: Partial<Pick<ResponseConfig, "data" | "message">>) {
    super({
      message: config?.message || "Unauthorized",
      data: config?.data,
      status: 401,
    });
  }
}

export class HttpForbiddenError extends CustomError {
  constructor(config?: Partial<Pick<ResponseConfig, "data" | "message">>) {
    super({
      message: config?.message || "Forbidden",
      data: config?.data,
      status: 403,
    });
  }
}

export class HttpConflictError extends CustomError {
  constructor(config?: Partial<Pick<ResponseConfig, "data" | "message">>) {
    super({
      message: config?.message || "Conflict",
      data: config?.data,
      status: 409,
    });
  }
}

export class HttpInternalServerError extends CustomError {
  constructor(config?: Partial<Pick<ResponseConfig, "data" | "message">>) {
    super({
      message: config?.message || "Internal server error",
      data: config?.data,
      status: 500,
    });
  }
}

export class HttpUnprocessableEntityError extends CustomError {
  constructor(config?: Partial<Pick<ResponseConfig, "data" | "message">>) {
    super({
      message: config?.message || "Unprocessable entity",
      data: config?.data,
      status: 422,
    });
  }
}

export class HttpTooManyRequestsError extends CustomError {
  constructor(config?: Partial<Pick<ResponseConfig, "data" | "message">>) {
    super({
      message: config?.message || "Too many requests",
      data: config?.data,
      status: 429,
    });
  }
}

export class HttpServiceUnavailableError extends CustomError {
  constructor(config?: Partial<Pick<ResponseConfig, "data" | "message">>) {
    super({
      message: config?.message || "Service unavailable",
      data: config?.data,
      status: 503,
    });
  }
}
