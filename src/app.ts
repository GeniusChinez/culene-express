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

export interface AppConfig {
  useHelmet?: boolean;
  rateLimiting?: {
    numberOfProxies?: number;
  } & Partial<RateLimitingOptions>;
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
  const app = express();

  // normal stuff
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(cors());

  // setup rate limiting
  if (config.rateLimiting) {
    const options = config.rateLimiting;
    const limiter = rateLimit(options);
    if (options.numberOfProxies) {
      app.set("trust proxy", options.numberOfProxies);
    }
    app.use(limiter);
  }

  /**
   * Helmet helps you secure your Express apps by setting various HTTP headers.
   * It's not a silver bullet, but it can help!
   *
   * Checkout [https://www.npmjs.com/package/helmet] for more.
   */
  if (config.useHelmet !== false) {
    app.use(helmet());
  }

  // for detecting user-agent
  app.use(userAgent.express());

  // for files
  app.use(
    fileUpload({
      limits: { fileSize: 20 * 1024 * 1024 },
      tempFileDir: config.tempFileDir || "/tmp/",
    }),
  );

  //attach documentation
  const openApiSpec = {
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
  config.routes.forEach((route) => {
    route.attachTo(app);
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
  app.use(
    "/docs",
    swaggerUi.serve,
    swaggerUi.setup(openApiSpec, {
      swaggerOptions: {
        defaultModelsExpandDepth: -1, // Prevent models from expanding
        defaultTagsExpandDepth: 0, // Collapse all tag sections by default
        docExpansion: "none", // Collapse all sections by default
      },
      customSiteTitle: config.title,
    }),
  );

  // other stuff
  const start = (
    port?: number,
    config?: {
      onStart?: () => void;
      onStop?: () => void;
    },
  ) => {
    app.use(notFoundHandler);
    app.listen(port || 5050, () => {
      console.info(`App listening to port ${port || 5050}`);
      config?.onStart?.();
    });

    app.on("close", () => {
      console.info(`App is shutting-down`);
      config?.onStart?.();
      config?.onStop?.();
    });
  };

  return {
    start,
    app,
  };
}
