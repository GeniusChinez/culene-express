import { createApp } from "./app";
import { createLogger } from "./logs";
import { route } from "./route";
export type { Logger } from "./logs";
import { isCustomError, CustomError } from "./custom-error";

export { route, createApp, createLogger, isCustomError, CustomError };

export default {
  route,
  createApp,
  createLogger,
  isCustomError,
  CustomError,
};
