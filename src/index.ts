import { createApp } from "./app";
import { createLogger } from "./logs";
import { route } from "./route";
export type { Logger } from "./logs";
export type { CustomError } from "./custom-error";
import { isCustomError } from "./custom-error";

export { route, createApp, createLogger, isCustomError };

export default {
  route,
  createApp,
  createLogger,
  isCustomError,
};
