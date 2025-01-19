import { createApp } from "./app";
import { createLogger } from "./logs";
import { route } from "./route";
import { isCustomError, CustomError } from "./custom-error";

export type { Logger } from "./logs";

export { route, createApp, createLogger, isCustomError, CustomError };

export default {
  route,
  createApp,
  createLogger,
  isCustomError,
  CustomError,
};
