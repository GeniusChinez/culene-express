import { createApp } from "./app";
import { createLogger } from "./logs";
import { route } from "./route";
export type { Logger } from "./logs";

export { route, createApp, createLogger };

export default {
  route,
  createApp,
  createLogger,
};
