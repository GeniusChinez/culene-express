import { createApp } from "./app";
import { createLogger } from "./logs";
import { route } from "./route";
import {
  isCustomError,
  CustomError,
  HttpNotFoundError,
  HttpBadRequestError,
  HttpUnauthorizedError,
  HttpForbiddenError,
  HttpConflictError,
  HttpInternalServerError,
  HttpUnprocessableEntityError,
  HttpTooManyRequestsError,
  HttpServiceUnavailableError,
} from "./custom-error";

export type { Logger } from "./logs";

export {
  route,
  createApp,
  createLogger,
  isCustomError,
  CustomError,
  HttpNotFoundError,
  HttpBadRequestError,
  HttpUnauthorizedError,
  HttpForbiddenError,
  HttpConflictError,
  HttpInternalServerError,
  HttpUnprocessableEntityError,
  HttpTooManyRequestsError,
  HttpServiceUnavailableError,
};

export default {
  route,
  createApp,
  createLogger,
  isCustomError,
  CustomError,
  HttpNotFoundError,
  HttpBadRequestError,
  HttpUnauthorizedError,
  HttpForbiddenError,
  HttpConflictError,
  HttpInternalServerError,
  HttpUnprocessableEntityError,
  HttpTooManyRequestsError,
  HttpServiceUnavailableError,
};
