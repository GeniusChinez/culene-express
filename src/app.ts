/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import express, { Express } from "express";
import rateLimit, { Options as RateLimitingOptions } from "express-rate-limit";
import helmet from "helmet";
import userAgent from "express-useragent";
import swaggerUi from "swagger-ui-express";

import bodyParser from "body-parser";
import fileUpload from "express-fileupload";
import cors from "cors";
import notFoundHandler from "./not-found";
import { route } from "./route";

import { createLogger } from "./logs";

export interface AppConfig {
  useHelmet?: boolean;
  rateLimiting?: {
    numberOfProxies?: number;
  } & (
    | Partial<RateLimitingOptions>
    | {
        type: "custom";
        requests: number;
        per: {
          unit: "seconds" | "minutes" | "hours";
          amount: number;
        };
      }
  );
  tempFileDir?: string;
  routes: ReturnType<typeof route>[];

  // docs stuff
  title: string;
  version?: string;
  description?: string;
  contact?: {
    name: string;
    url?: string;
    email: string;
  };
  servers?: {
    url: string;
    description: string;
  }[];
  tags?: Record<
    string,
    {
      description?: string;
      prefix: string;
    }
  >;

  logger?: ReturnType<typeof createLogger>;
}

export async function createApp(config: AppConfig): Promise<{
  app: Express;
  start: (
    port?: number,
    config?: {
      onStart?: () => void;
      onStop?: () => void;
    },
  ) => void;
}> {
  const log = config.logger || createLogger();
  log.sources.push("CreateApp");

  const app = log.process("Creating Express app", () => {
    return express();
  });

  // normal stuff
  log.process("Setting up body-parser", () => {
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));
  });

  log.process("Setting up CORS", () => {
    app.use(cors());
  });

  // setup rate limiting
  if (config.rateLimiting) {
    log.info("Rate-Limiting options are provided");
    const options = config.rateLimiting;

    log.process("Setting up rate-limiting using express-rate-limiter", () => {
      const limiter = rateLimit(
        (() => {
          const options = config.rateLimiting!;
          if ("type" in options && options.type === "custom") {
            return {
              windowMs:
                options.per.unit === "seconds"
                  ? options.per.amount * 1000
                  : options.per.unit === "minutes"
                    ? options.per.amount * 60 * 1000
                    : options.per.amount * 60 * 60 * 1000, // default to per hour
              max: options.requests, // Limit each IP to these requests per `window`
              standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
              legacyHeaders: false, // Disable the `X-RateLimit-*` headers
            } as Partial<RateLimitingOptions>;
          }
          return config.rateLimiting as RateLimitingOptions;
        })(),
      );

      if (options.numberOfProxies) {
        log.info(
          `Number of proxies specified. Setting app to trust ${options.numberOfProxies} proxies`,
        );
        app.set("trust proxy", options.numberOfProxies);
      }

      log.info(`Using the limiter`);
      app.use(limiter);
    });
  } else {
    log.warning("No Rate-Limiting options provided");
  }

  /**
   * Helmet helps you secure your Express apps by setting various HTTP headers.
   * It's not a silver bullet, but it can help!
   *
   * Checkout [https://www.npmjs.com/package/helmet] for more.
   */
  if (config.useHelmet !== false) {
    log.process("Setting up Helmet", () => {
      app.use(helmet());
    });
  } else {
    log.warning(
      "Config prevented the use of helmet. Helmet helps you secure your Express apps by setting various HTTP headers",
    );
  }

  // for detecting user-agent
  log.process("Setting up express-user-agent", () => {
    app.use(userAgent.express());
  });

  // for files
  log.process("Setting up express-fileupload", () => {
    app.use(
      fileUpload({
        limits: { fileSize: 20 * 1024 * 1024 },
        tempFileDir: config.tempFileDir || "/tmp/",
      }),
    );
  });

  //attach documentation
  const openApiSpec = log.process("Creating Base OpenAPI specification", () => {
    return {
      openapi: "3.1.0", // The version should be directly at the root
      info: {
        title: config.title,
        version: config.version || "1.0.0",
        description: config.description || "Comprehensive API documentation",
        ...(config.contact
          ? {
              contact: config.contact,
            }
          : {}),
      },
      ...(config.servers
        ? {
            servers: config.servers,
          }
        : {}),
      paths: {} as any, // Dynamically populate this with endpoint configurations
      tags: config.tags
        ? Object.entries(config.tags).map(([name, details]) => ({
            name,
            description: details.description,
          }))
        : [],
    };
  });

  log.process(
    "Attaching routes to the app (and populating base API Spec)",
    () => {
      config.routes.forEach((route) => {
        log.info(`Handling '${route.config.path}'`);
        route.attachTo(app);

        log.process(`Adding ${route.config.path} to base API Spec`, () => {
          const { path, methods, spec } = route.getOpenApiSpec();
          methods.forEach((method) => {
            if (!openApiSpec.paths[path]) {
              openApiSpec.paths[path] = {};
            }
            openApiSpec.paths[path][method] = {
              ...spec,
              tags: config.tags
                ? Object.entries(config.tags)
                    .filter(([key, details]) => {
                      return path.startsWith(details.prefix);
                    })
                    .map((entry) => entry[0])
                : [],
            };
          });
        });
      });
    },
  );

  log.process(
    `Attaching API documentation to app on the '/docs' endpoint`,
    () => {
      app.use(
        "/docs",
        swaggerUi.serve,
        swaggerUi.setup(openApiSpec, {
          swaggerOptions: {
            defaultModelsExpandDepth: -1, // Prevent models from expanding
            defaultTagsExpandDepth: 0, // Collapse all tag sections by default
            docExpansion: "none", // Collapse all sections by default
            filter: true,
          },
          customSiteTitle: config.title,
        }),
      );
    },
  );

  // other stuff
  const start = (
    port?: number,
    config?: {
      onStart?: () => void;
      onStop?: () => void;
    },
  ) => {
    log.sources.push("StartApp");
    const usePort = port || 5050;

    log.process("Adding NotFoundHandler", () => {
      app.use(notFoundHandler);
    });

    log.info(`Using port ${usePort}`);
    log.process("Running app", () => {
      app.listen(port || 5050, () => {
        log.info(`App listening to port ${port || 5050}`);
        config?.onStart?.();
      });

      log.process("Adding onAppClose event handler", () => {
        app.on("close", () => {
          log.info("App is shutting down");
          log.sources.pop();
          config?.onStart?.();
          config?.onStop?.();
        });
      });
    });
  };

  log.sources.pop();
  return {
    start,
    app,
  };
}
