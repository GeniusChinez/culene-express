import { Options as RateLimitingOptions } from "express-rate-limit";

export type CustomRateLimitingOptions = {
  type: "custom";
  requests: number;
  per: {
    unit: "seconds" | "minutes" | "hours";
    amount: number;
  };
};

export type RateLimitingConfig =
  | Partial<RateLimitingOptions>
  | CustomRateLimitingOptions;

export function getRateLimitingOptions(config: RateLimitingConfig) {
  if ("type" in config && config.type === "custom") {
    return {
      windowMs:
        config.per.unit === "seconds"
          ? config.per.amount * 1000
          : config.per.unit === "minutes"
            ? config.per.amount * 60 * 1000
            : config.per.amount * 60 * 60 * 1000, // default to per hour
      max: config.requests, // Limit each IP to these requests per `window`
      standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
      legacyHeaders: false,
      handler: (_req, res, _next, options) => {
        res.status(429).json({
          message:
            "You have exceeded the number of allowed requests. Please wait and try again later.",
          rateLimitResetTime: new Date(
            Date.now() + options.windowMs,
          ).toISOString(), // Optional: the reset time
        });
      },
    } as Partial<RateLimitingOptions>;
  }
  return config as RateLimitingOptions;
}
