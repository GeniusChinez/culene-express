/* eslint-disable @typescript-eslint/no-explicit-any */

import { z, ZodSchema, ZodType } from "zod";
import { HttpMethod } from "./methods";
import { Middleware } from "./middleware";
import {
  okResponse,
  reportBadRequestError,
  reportForbiddenError,
  reportServerError,
  reportUnauthorizedError,
} from "./response";
import { Request, Response, Router } from "express";
import { formatZodError } from "./validations";
import { getDeviceId } from "./device";
import { zodToJsonSchema } from "zod-to-json-schema";
import { generateHtmlFromOpenAPISpec } from "./route-html-spec";
import { createLogger } from "./logs";

// Define a utility type that ensures any Zod schema is compatible with ZodType
export type ZodCompatible<T> =
  T extends ZodSchema<any> ? T : ZodType<any, any, any>;

type GetResponseDataSchema<T> = T extends string
  ? never
  : T extends {
        description?: any;
        data: any;
        headers?: any;
      }
    ? T["data"] extends undefined
      ? never
      : z.infer<T["data"]>
    : never;

type GetResponseHeadersSchema<T> = T extends string
  ? never
  : T extends {
        description?: any;
        data?: any;
        headers: any;
      }
    ? T["headers"] extends undefined
      ? never
      : z.infer<T["headers"]>
    : never;

type GetDataEntry<Schema> =
  GetResponseDataSchema<Schema> extends never
    ? object
    : {
        data: GetResponseDataSchema<Schema>;
      };

type GetHeadersEntry<Schema> =
  GetResponseHeadersSchema<Schema> extends never
    ? object
    : {
        headers: GetResponseHeadersSchema<Schema>;
      };

type ResponseConfig<Schema> = keyof (GetDataEntry<Schema> &
  GetHeadersEntry<Schema>) extends never
  ? object
  : GetDataEntry<Schema> & GetHeadersEntry<Schema>;

type HasKeys<T> = keyof T extends never ? false : true;
type InferUserType<UserSpec> =
  HasKeys<UserSpec> extends true
    ? UserSpec extends {
        getCurrentUser: (request: Request) => Promise<infer UserT>;
        required: false;
      }
      ? UserT | undefined
      : UserSpec extends {
            getCurrentUser: (request: Request) => Promise<infer UserT>;
          }
        ? UserT
        : never
    : never;

type HandlerArgs<
  QuerySchema extends ZodCompatible<ZodSchema<any>>,
  ParamsSchema extends ZodCompatible<ZodSchema<any>>,
  BodySchema extends ZodCompatible<ZodSchema<any>>,
  HeadersSchema extends ZodCompatible<ZodSchema<any>>,
  Responses extends {
    [key: number]:
      | string
      | {
          description?: string;
          data?: any;
        };
  },
  UserSpec,
> = {
  request: Request;
  response: Response;
  logger: ReturnType<typeof createLogger>;
  query: z.infer<QuerySchema>;
  body: z.infer<BodySchema>;
  params: z.infer<ParamsSchema>;
  headers: z.infer<HeadersSchema>;
  respond: <ResponseStatus extends keyof Responses>(
    config: { status: ResponseStatus; message?: string } & ResponseConfig<
      Responses[ResponseStatus]
    >,
  ) => void;
  device: string;
  user: InferUserType<UserSpec>;
};

export interface RouteConfig<
  QuerySchema extends ZodCompatible<ZodSchema<any>>,
  ParamsSchema extends ZodCompatible<ZodSchema<any>>,
  BodySchema extends ZodCompatible<ZodSchema<any>>,
  HeadersSchema extends ZodCompatible<ZodSchema<any>>,
  Responses extends {
    [key: number]:
      | string
      | {
          description?: string;
          data?: ZodCompatible<ZodSchema<any>>;
          headers?: ZodCompatible<ZodSchema<any>>;
        };
  },
  UserSpec,
> {
  router?: Router;
  methods: HttpMethod[];
  path: string;
  description: string;
  middleware?: Array<Middleware>;
  user?: {
    [k in keyof UserSpec]: UserSpec[k];
  } & {
    authorize?: (user: InferUserType<UserSpec>) => boolean | Promise<boolean>;
  };
  input?: {
    query?: QuerySchema;
    params?: ParamsSchema;
    body?: BodySchema;
    headers?: HeadersSchema;
  };

  response: Responses;

  docs?: {
    query?: Record<
      keyof z.infer<QuerySchema>,
      { description: string; example?: any }
    >;
    params?: Record<
      keyof z.infer<ParamsSchema>,
      { description: string; example?: any }
    >;
    body?: Record<
      keyof z.infer<BodySchema>,
      { description: string; example?: any }
    >;
    headers?: Record<
      keyof z.infer<HeadersSchema>,
      { description: string; example?: any }
    >;
  };
}

export function route<
  QuerySchema extends ZodCompatible<ZodSchema<any>>,
  ParamsSchema extends ZodCompatible<ZodSchema<any>>,
  BodySchema extends ZodCompatible<ZodSchema<any>>,
  HeadersSchema extends ZodCompatible<ZodSchema<any>>,
  Responses extends {
    [key: number]:
      | string
      | {
          description?: string;
          data?: ZodCompatible<ZodSchema<any>>;
          headers?: ZodCompatible<ZodSchema<any>>;
        };
  },
  UserSpec extends {
    getCurrentUser: (request: Request) => Promise<any>;
    required?: boolean;
  },
>(
  config: RouteConfig<
    QuerySchema,
    ParamsSchema,
    BodySchema,
    HeadersSchema,
    Responses,
    UserSpec
  >,
  _handler: (
    args: HandlerArgs<
      QuerySchema,
      ParamsSchema,
      BodySchema,
      HeadersSchema,
      Responses,
      UserSpec
    >,
  ) => Promise<any>,
) {
  const handler = async (req: Request, res: Response) => {
    const logger = createLogger();
    logger.sources.push(`${req.ip} ${req.method.toUpperCase()} ${config.path}`);

    let query: any = undefined;
    let body: any = undefined;
    let params: any = undefined;
    let headers: any = undefined;

    const invalidInputMessage =
      400 in config.response
        ? typeof config.response[400] === "string"
          ? config.response[400]
          : typeof config.response[400] === "object" &&
              "description" in (config.response as any)[400]
            ? (config.response as any)[400].description
            : ""
        : undefined;

    if (config.input) {
      if (config.input.query) {
        const queryParams = config.input.query;

        const { error, data } = await logger.asyncProcess(
          "Validating query parameters",
          async () => {
            const result = await queryParams.safeParseAsync(req.query);
            if (!result.success) {
              return {
                error: result.error,
                data: undefined,
              };
            }
            return {
              error: undefined,
              data: result.data,
            };
          },
        );

        if (error) {
          logger.error(invalidInputMessage || "Invalid query parameters");
          logger.sources.pop();
          return reportBadRequestError({
            res,
            message: invalidInputMessage || "Invalid query parameters",
            data: formatZodError(error),
          });
        }

        query = data;
      }

      if (config.input.body) {
        const bodyParams = config.input.body;
        const { error, data } = await logger.asyncProcess(
          "Validating body",
          async () => {
            const result = await bodyParams.safeParseAsync(req.body);
            if (!result.success) {
              return {
                error: result.error,
                data: undefined,
              };
            }
            return {
              error: undefined,
              data: result.data,
            };
          },
        );

        if (error) {
          logger.error(invalidInputMessage || "Invalid body");
          logger.sources.pop();
          return reportBadRequestError({
            res,
            message: invalidInputMessage || "Invalid body",
            data: formatZodError(error),
          });
        }

        body = data;
      }

      if (config.input.params) {
        const pathParams = config.input.params;
        const { error, data } = await logger.asyncProcess(
          "Validating path params",
          async () => {
            const result = await pathParams.safeParseAsync(req.params);
            if (!result.success) {
              return {
                error: result.error,
                data: undefined,
              };
            }
            return {
              error: undefined,
              data: result.data,
            };
          },
        );

        if (error) {
          logger.error(invalidInputMessage || "Invalid path parameters");
          logger.sources.pop();
          return reportBadRequestError({
            res,
            message: invalidInputMessage || "Invalid path parameters",
            data: formatZodError(error),
          });
        }

        params = data;
      }

      if (config.input.headers) {
        const headerParams = config.input.headers;
        const { error, data } = await logger.asyncProcess(
          "Validating headers",
          async () => {
            const result = await headerParams.safeParseAsync(req.headers);
            if (!result.success) {
              return {
                error: result.error,
                data: undefined,
              };
            }
            return {
              error: undefined,
              data: result.data,
            };
          },
        );

        if (error) {
          logger.error(invalidInputMessage || "Invalid headers");
          logger.sources.pop();
          return reportBadRequestError({
            res,
            message: invalidInputMessage || "Invalid headers",
            data: formatZodError(error),
          });
        }

        headers = data;
      }
    }

    let user: any = undefined;
    if (config.user) {
      const configUser = config.user;
      try {
        user = await logger.asyncProcess(
          "Getting the user from the request",
          async () => {
            return await configUser.getCurrentUser(req);
          },
        );

        if (configUser.authorize) {
          logger.info("Additional authorization required");
          const authorizationCallback = configUser.authorize;

          try {
            await logger.asyncProcess("Authorizing user", async () => {
              const authorized = await authorizationCallback(user);
              if (!authorized) {
                throw new Error("Authorization failed");
              }
            });
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
          } catch (e) {
            logger.sources.pop();
            return reportForbiddenError({
              res,
              message: "Authorization failed",
            });
          }
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (e) {
        logger.info("Checking to see if user is required for this route...");
        if (config.user.required !== false) {
          logger.error(
            "User is required for this route. Failed to get one from the request",
          );
          logger.sources.pop();
          return reportUnauthorizedError({
            res,
            message: "Unauthenticated",
          });
        }
      }
    }

    const handlerArgs: HandlerArgs<
      QuerySchema,
      ParamsSchema,
      BodySchema,
      HeadersSchema,
      Responses,
      UserSpec
    > = {
      request: req,
      response: res,
      user,
      logger,
      device: req.useragent ? getDeviceId(req.useragent).name : "Unknown",
      respond(localConfig) {
        const errorMessage =
          localConfig.message ||
          (typeof config.response[localConfig.status] === "string"
            ? config.response[localConfig.status]
            : typeof config.response[localConfig.status] === "object" &&
                "description" in (config.response as any)[localConfig.status]
              ? (config.response as any)[localConfig.status].description
              : "");
        res.status(localConfig.status as number).json(
          "data" in localConfig
            ? Array.isArray(localConfig.data)
              ? localConfig.data
              : {
                  message: errorMessage,
                  ...localConfig.data,
                }
            : {
                message: errorMessage,
              },
        );
      },
      params: params as z.infer<ParamsSchema>,
      body: body as z.infer<BodySchema>,
      query: query as z.infer<QuerySchema>,
      headers: headers as z.infer<HeadersSchema>,
    };

    try {
      const result = await logger.asyncProcess("Running handler", async () => {
        return await _handler(handlerArgs);
      });
      logger.sources.pop();
      return result;
    } catch (e) {
      logger.error(`Something went wrong: ${e}`);
      logger.sources.pop();
      return reportServerError({
        res,
        message: "Something went wrong",
      });
    }
  };

  const getOpenApiSpec = () => {
    const { methods, path, description, input, docs, response } = config;

    const { params, headers, query, body } = docs || {};

    const spec: any = {
      summary: description,
      parameters: [],
      responses: {},
    };

    // Query parameters
    if (input?.query) {
      const json = zodToJsonSchema(input.query);
      if ("properties" in json) {
        Object.entries(json.properties).forEach(([key, details]) => {
          const otherDocs = query ? query[key] : {};
          spec.parameters.push({
            name: key,
            in: "query",
            description:
              (otherDocs as any)?.description || "No description provided",
            required: json.required?.includes(key) || false,
            example: (otherDocs as any)?.example,
            schema: details,
          });
        });
      }
    }

    // Path parameters
    if (input?.params) {
      const json = zodToJsonSchema(input.params);
      if ("properties" in json) {
        Object.entries(json.properties).forEach(([key, details]) => {
          const otherDocs = params ? params[key] : {};
          spec.parameters.push({
            name: key,
            in: "path",
            description:
              (otherDocs as any)?.description || "No description provided",
            required: true,
            example: (otherDocs as any)?.example,
            schema: details,
          });
        });
      }
    }

    // Body parameters
    if (input?.body) {
      const json = zodToJsonSchema(input.body);
      if ("properties" in json) {
        const properties = { ...json.properties } as any;
        Object.entries(properties).forEach(([key, details]) => {
          const otherDocs = body ? body[key] : {};
          properties[key] = {
            ...(details as any),
            description:
              (otherDocs as any)?.description || "No description provided",
          };
        });
        spec.requestBody = {
          required: true,
          content: {
            "application/json": {
              schema: {
                ...json,
                properties,
              },
            },
          },
        };
      }
    }

    // Headers
    if (input?.headers) {
      const json = zodToJsonSchema(input.headers);
      if ("properties" in json) {
        Object.entries(json.properties).forEach(([key, details]) => {
          const otherDocs = headers ? headers[key] : {};
          spec.parameters.push({
            name: key,
            in: "header",
            description:
              (otherDocs as any)?.description || "No description provided",
            required: json.required?.includes(key) || false,
            example: (otherDocs as any)?.example,
            schema: details,
          });
        });
      }
    }

    // Responses
    Object.entries(response).forEach(([statusCode, resDetails]) => {
      if (typeof resDetails === "string") {
        spec.responses[statusCode] = { description: resDetails };
      } else {
        spec.responses[statusCode] = {
          description: resDetails.description || "No description",
          content: resDetails.data
            ? {
                "application/json": {
                  schema: zodToJsonSchema(resDetails.data),
                },
              }
            : undefined,
        };
      }
    });

    return {
      path,
      methods: methods.map((method) => method.toLowerCase()),
      spec,
    };
  };

  const middleware = [...(config.middleware || [])];

  const attachToRouter = (router: Router) => {
    config.methods.forEach((method) => {
      (router as any)[method.toLowerCase()](
        config.path,
        ...middleware,
        handler,
      );
    });

    router.get(`${config.path}/docs`, (req, res) => {
      okResponse({ res, data: getOpenApiSpec() });
    });

    router.get(`${config.path}/html-docs`, (req, res) => {
      try {
        const spec = getOpenApiSpec();
        const htmlOutput = generateHtmlFromOpenAPISpec(spec as any);
        res.setHeader("Content-Type", "text/html");
        res.send(htmlOutput);
      } catch (error) {
        console.error("Error generating docs:", error);
        res.status(500).send("Error generating documentation");
      }
    });
  };

  if (config.router) {
    attachToRouter(config.router);
  }

  return {
    config,
    handler,
    getOpenApiSpec,
    attachTo: attachToRouter,
  };
}
