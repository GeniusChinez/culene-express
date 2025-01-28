/* eslint-disable @typescript-eslint/no-explicit-any */
import { z, ZodError, ZodSchema } from "zod";
import {
  action,
  asyncAction,
  FirstArgument,
  HandlerArgs,
  RouteConfig,
  ZodCompatible,
} from "./route.types";
import { createLogger } from "./logs";
import { NextFunction, Request, Response, Router } from "express";
import { CustomError, isCustomError } from "./custom-error";
import rateLimit from "express-rate-limit";
import {
  okResponse,
  reportBadRequestError,
  reportForbiddenError,
  reportServerError,
  reportUnauthorizedError,
  respond,
} from "./response";
import zodToJsonSchema, { JsonSchema7ObjectType } from "zod-to-json-schema";
import { generateHtmlFromOpenAPISpec } from "./route-html-spec";
import { getDeviceId } from "./device";
import { formatZodError } from "./validations";
import { inlineNestedSchemas } from "./inline-schemas";
import { getRateLimitingOptions } from "./rate-limiting";
import { getUserIp } from "./ip";

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
  const authenticationMiddleware = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    let user: any = undefined;
    if (config.user) {
      const configUser = config.user;
      try {
        user = await configUser.getCurrentUser(req);

        if (configUser.authorize) {
          const authorizationCallback = configUser.authorize;

          try {
            const authorized = await authorizationCallback(user);
            if (!authorized) {
              throw new Error("Authorization failed");
            }
          } catch (e) {
            if (isCustomError(e)) {
              throw e;
            }
            return reportForbiddenError({
              res,
              message: "Authorization failed",
            });
          }
        }
        req.user = user;
      } catch (e) {
        if (config.user.required !== false) {
          if (isCustomError(e)) {
            return respond({
              res,
              status: e.status,
              data: e.data,
              message: e.message,
            });
          }
          return reportUnauthorizedError({
            res,
            message: "Unauthenticated",
          });
        }
      }
    }
    next();
  };

  const handler = async (req: Request, res: Response) => {
    const logger = createLogger({
      ouputFile: `./logs/${req.method.toLowerCase()}.${config.path.replaceAll("/", ".").slice(1)}.log`,
      customFormat: (data: {
        timestamp: string;
        level: string;
        message: unknown;
      }) =>
        JSON.stringify({
          ...data,
          ip: getUserIp(req),
          path: req.path,
        }),
    });

    try {
      logger.sources.push(`${req.method.toUpperCase()}`);

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
          try {
            const data = await logger.process(
              "Validating query parameters",
              async () => {
                return await queryParams.parseAsync(req.query);
              },
            );
            query = data;
          } catch (e) {
            logger.error(
              `Invalid query parameters (${JSON.stringify(formatZodError(e as ZodError))})`,
            );
            logger.sources.pop();
            return reportBadRequestError({
              res,
              message: invalidInputMessage || "Invalid query parameters",
              data: formatZodError(e as ZodError),
            });
          }
        }

        if (config.input.body) {
          const bodyParams = config.input.body;
          try {
            const data = await logger.process("Validating body", async () => {
              return await bodyParams.parseAsync(req.body);
            });
            body = data;
          } catch (e) {
            logger.error(
              `Invalid body (${JSON.stringify(formatZodError(e as ZodError))})`,
            );
            logger.sources.pop();
            return reportBadRequestError({
              res,
              message: invalidInputMessage || "Invalid body",
              data: formatZodError(e as ZodError),
            });
          }
        }

        if (config.input.params) {
          const pathParams = config.input.params;
          try {
            const data = await logger.process(
              "Validating path parameters",
              async () => {
                return await pathParams.parseAsync(req.params);
              },
            );
            params = data;
          } catch (e) {
            logger.error(
              `Invalid path parameters (${JSON.stringify(formatZodError(e as ZodError))})`,
            );
            logger.sources.pop();
            return reportBadRequestError({
              res,
              message: invalidInputMessage || "Invalid path parameters",
              data: formatZodError(e as ZodError),
            });
          }
        }

        if (config.input.headers) {
          const headerParams = config.input.headers;
          try {
            const data = await logger.process(
              "Validating headers",
              async () => {
                return await headerParams.parseAsync(req.headers);
              },
            );
            headers = data;
          } catch (e) {
            logger.error(
              `Invalid headers (${JSON.stringify(formatZodError(e as ZodError))})`,
            );
            logger.sources.pop();
            return reportBadRequestError({
              res,
              message: invalidInputMessage || "Invalid headers",
              data: formatZodError(e as ZodError),
            });
          }
        }
      }

      // let user: any = undefined;
      // if (config.user) {
      //   const configUser = config.user;
      //   try {
      //     user = await logger.asyncProcess(
      //       "Getting the user from the request",
      //       async () => {
      //         return await configUser.getCurrentUser(req, logger);
      //       },
      //     );

      //     if (configUser.authorize) {
      //       logger.info("Additional authorization required");
      //       const authorizationCallback = configUser.authorize;

      //       try {
      //         await logger.asyncProcess("Authorizing user", async () => {
      //           const authorized = await authorizationCallback(user, logger);
      //           if (!authorized) {
      //             throw new Error("Authorization failed");
      //           }
      //         });
      //       } catch (e) {
      //         logger.sources.pop();
      //         if (isCustomError(e)) {
      //           throw e;
      //         }
      //         return reportForbiddenError({
      //           res,
      //           message: "Authorization failed",
      //         });
      //       }
      //     }
      //   } catch (e) {
      //     logger.info("Checking to see if user is required for this route...");
      //     if (config.user.required !== false) {
      //       logger.error(
      //         "User is required for this route. Failed to get one from the request",
      //       );

      //       logger.sources.pop();
      //       if (isCustomError(e)) {
      //         throw e;
      //       }
      //       return reportUnauthorizedError({
      //         res,
      //         message: "Unauthenticated",
      //       });
      //     }
      //     logger.info("User is not required for this route");
      //   }
      // }

      function respond(
        localConfig: FirstArgument<
          HandlerArgs<
            QuerySchema,
            ParamsSchema,
            BodySchema,
            HeadersSchema,
            Responses,
            UserSpec
          >["respond"]
        >,
      ) {
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
      }

      const answer = {
        ...(200 in config.response
          ? {
              ok: (res: unknown) => {
                return respond({
                  status: 200,
                  ...(typeof res === "string"
                    ? { message: res }
                    : (res as any)),
                });
              },
            }
          : {}),
        ...(201 in config.response
          ? {
              created: (res: unknown) => {
                return respond({
                  status: 201,
                  ...(typeof res === "string"
                    ? { message: res }
                    : (res as any)),
                });
              },
            }
          : {}),
        ...(202 in config.response
          ? {
              accepted: (res: unknown) => {
                return respond({
                  status: 202,
                  ...(typeof res === "string"
                    ? { message: res }
                    : (res as any)),
                });
              },
            }
          : {}),
        ...(204 in config.response
          ? {
              noContent: (res: unknown) => {
                return respond({
                  status: 204,
                  ...(typeof res === "string"
                    ? { message: res }
                    : (res as any)),
                });
              },
            }
          : {}),
        ...(301 in config.response
          ? {
              movedPermanently: (res: unknown) => {
                return respond({
                  status: 301,
                  ...(typeof res === "string"
                    ? { message: res }
                    : (res as any)),
                });
              },
            }
          : {}),
        ...(302 in config.response
          ? {
              found: (res: unknown) => {
                return respond({
                  status: 302,
                  ...(typeof res === "string"
                    ? { message: res }
                    : (res as any)),
                });
              },
            }
          : {}),
        ...(304 in config.response
          ? {
              notModified: (res: unknown) => {
                return respond({
                  status: 304,
                  ...(typeof res === "string"
                    ? { message: res }
                    : (res as any)),
                });
              },
            }
          : {}),
      };

      const fatal = {
        ...(400 in config.response
          ? {
              badRequest: (res: unknown) => {
                throw new CustomError({
                  context: {
                    responses: config.response,
                    respond,
                  },
                  status: 400,
                  ...(typeof res === "string"
                    ? { message: res }
                    : (res as any)),
                });
              },
            }
          : {}),
        ...(401 in config.response
          ? {
              unauthorized: (res: unknown) => {
                throw new CustomError({
                  context: {
                    responses: config.response,
                    respond,
                  },
                  status: 401,
                  ...(typeof res === "string"
                    ? { message: res }
                    : (res as any)),
                });
              },
            }
          : {}),
        ...(403 in config.response
          ? {
              forbidden: (res: unknown) => {
                throw new CustomError({
                  context: {
                    responses: config.response,
                    respond,
                  },
                  status: 403,
                  ...(typeof res === "string"
                    ? { message: res }
                    : (res as any)),
                });
              },
            }
          : {}),
        ...(404 in config.response
          ? {
              notFound: (res: unknown) => {
                throw new CustomError({
                  context: {
                    responses: config.response,
                    respond,
                  },
                  status: 404,
                  ...(typeof res === "string"
                    ? { message: res }
                    : (res as any)),
                });
              },
            }
          : {}),
        ...(405 in config.response
          ? {
              methodNotAllowed: (res: unknown) => {
                throw new CustomError({
                  context: {
                    responses: config.response,
                    respond,
                  },
                  status: 405,
                  ...(typeof res === "string"
                    ? { message: res }
                    : (res as any)),
                });
              },
            }
          : {}),
        ...(409 in config.response
          ? {
              conflict: (res: unknown) => {
                throw new CustomError({
                  context: {
                    responses: config.response,
                    respond,
                  },
                  status: 409,
                  ...(typeof res === "string"
                    ? { message: res }
                    : (res as any)),
                });
              },
            }
          : {}),
        ...(422 in config.response
          ? {
              unprocessableEntity: (res: unknown) => {
                throw new CustomError({
                  context: {
                    responses: config.response,
                    respond,
                  },
                  status: 422,
                  ...(typeof res === "string"
                    ? { message: res }
                    : (res as any)),
                });
              },
            }
          : {}),
        ...(429 in config.response
          ? {
              tooManyRequests: (res: unknown) => {
                throw new CustomError({
                  context: {
                    responses: config.response,
                    respond,
                  },
                  status: 429,
                  ...(typeof res === "string"
                    ? { message: res }
                    : (res as any)),
                });
              },
            }
          : {}),
        ...(500 in config.response
          ? {
              serverError: (res: unknown) => {
                throw new CustomError({
                  context: {
                    responses: config.response,
                    respond,
                  },
                  status: 500,
                  ...(typeof res === "string"
                    ? { message: res }
                    : (res as any)),
                });
              },
            }
          : {}),
        ...(502 in config.response
          ? {
              badGateway: (res: unknown) => {
                throw new CustomError({
                  context: {
                    responses: config.response,
                    respond,
                  },
                  status: 502,
                  ...(typeof res === "string"
                    ? { message: res }
                    : (res as any)),
                });
              },
            }
          : {}),
        ...(503 in config.response
          ? {
              serviceUnavailable: (res: unknown) => {
                throw new CustomError({
                  context: {
                    responses: config.response,
                    respond,
                  },
                  status: 503,
                  ...(typeof res === "string"
                    ? { message: res }
                    : (res as any)),
                });
              },
            }
          : {}),
        ...(504 in config.response
          ? {
              gatewayTimeout: (res: unknown) => {
                throw new CustomError({
                  context: {
                    responses: config.response,
                    respond,
                  },
                  status: 504,
                  ...(typeof res === "string"
                    ? { message: res }
                    : (res as any)),
                });
              },
            }
          : {}),
      };

      const handlerArgs: HandlerArgs<
        QuerySchema,
        ParamsSchema,
        BodySchema,
        HeadersSchema,
        Responses,
        UserSpec
      > = {
        ip: getUserIp(req),
        request: req,
        response: res,
        responses: config.response,
        user: req.user,
        logger,
        device: req.useragent ? getDeviceId(req.useragent).name : "Unknown",
        deviceInfo: req.useragent ? getDeviceId(req.useragent) : undefined,
        action: <
          Returns = void,
          OnErrorResult = never,
          OnSuccessResult = void,
        >(args: {
          name: string;
          exec: () => Returns;
          onError?: (error: unknown) => OnErrorResult;
          onSuccess?: (result: Returns) => OnSuccessResult;
        }) => {
          return logger.process(args.name, () => {
            return action<Returns, OnErrorResult, OnSuccessResult>(args);
          });
        },
        asyncAction: async <
          Returns = void,
          OnErrorResult = never,
          OnSuccessResult = void,
        >(args: {
          name: string;
          exec: () => Promise<Returns> | Returns;
          onError?: (error: unknown) => Promise<OnErrorResult> | OnErrorResult;
          onSuccess?: (
            result: Returns,
          ) => Promise<OnSuccessResult> | OnSuccessResult;
        }) => {
          return await logger.asyncProcess(args.name, async () => {
            return await asyncAction<Returns, OnErrorResult, OnSuccessResult>(
              args,
            );
          });
        },
        respond,
        answer: answer as any,
        fatal: fatal as any,
        params: params as z.infer<ParamsSchema>,
        body: body as z.infer<BodySchema>,
        query: query as z.infer<QuerySchema>,
        headers: headers as z.infer<HeadersSchema>,
      };

      const result = await logger.asyncProcess("Running handler", async () => {
        return await _handler(handlerArgs);
      });
      logger.sources.pop();
      return result;
    } catch (error) {
      logger.sources.pop();
      if (isCustomError(error)) {
        return error.context.respond(error);
      }
      return reportServerError({ res, message: "Something went wrong" });
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
      const _json = zodToJsonSchema(inlineNestedSchemas(input.query), {
        // target: "openApi3",
        $refStrategy: "none",
        effectStrategy: "input", // Optional: Handle transformations
      });
      if (
        "properties" in _json &&
        _json.properties &&
        typeof _json.properties === "object"
      ) {
        const json = _json as JsonSchema7ObjectType;
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
      const _json = zodToJsonSchema(inlineNestedSchemas(input.params), {
        // target: "openApi3",
        $refStrategy: "none",
        effectStrategy: "input", // Optional: Handle transformations
      });
      if (
        "properties" in _json &&
        _json.properties &&
        typeof _json.properties === "object"
      ) {
        const json = _json as JsonSchema7ObjectType;
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
      const _json = zodToJsonSchema(inlineNestedSchemas(input.body), {
        // target: "openApi3",
        $refStrategy: "none",
        effectStrategy: "input", // Optional: Handle transformations
      });
      if (
        "properties" in _json &&
        _json.properties &&
        typeof _json.properties === "object"
      ) {
        const json = _json as JsonSchema7ObjectType;
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
      const _json = zodToJsonSchema(inlineNestedSchemas(input.headers), {
        // target: "openApi3",
        $refStrategy: "none",
        effectStrategy: "input", // Optional: Handle transformations
      });

      if (
        "properties" in _json &&
        _json.properties &&
        typeof _json.properties === "object"
      ) {
        const json = _json as JsonSchema7ObjectType;
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
                  schema: zodToJsonSchema(
                    inlineNestedSchemas(resDetails.data),
                    {
                      // target: "openApi3",
                      $refStrategy: "none",
                      effectStrategy: "input", // Optional: Handle transformations
                    },
                  ),
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
      const allMiddleware = [
        authenticationMiddleware,
        ...middleware,
        ...(config.rateLimitGuests
          ? [
              (req: Request, res: Response, next: NextFunction) => {
                if (!req.user) {
                  const options = config.rateLimitGuests!;
                  return rateLimit(getRateLimitingOptions(options))(
                    req,
                    res,
                    next,
                  );
                }
                next();
              },
            ]
          : []),
        ...(config.rateLimitUsers
          ? [
              (req: Request, res: Response, next: NextFunction) => {
                if (req.user) {
                  const options = config.rateLimitUsers!;
                  return rateLimit(getRateLimitingOptions(options))(
                    req,
                    res,
                    next,
                  );
                }
                next();
              },
            ]
          : []),
        ...(config.rateLimit
          ? [rateLimit(getRateLimitingOptions(config.rateLimit))]
          : []),
      ];

      (router as any)[method.toLowerCase()](
        config.path,
        ...allMiddleware,
        handler,
      );

      router.get(`${config.path}-spec/${method.toLowerCase()}`, (req, res) => {
        okResponse({ res, data: getOpenApiSpec() });
      });

      router.get(`${config.path}-docs/${method.toLowerCase()}`, (req, res) => {
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
