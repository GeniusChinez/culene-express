/* eslint-disable @typescript-eslint/no-explicit-any */

import { z, ZodSchema, ZodType } from "zod";
import { HttpMethod } from "./methods";
import { Middleware } from "./middleware";
import { Request, Response, Router } from "express";
import { createLogger, Logger } from "./logs";
import { CustomErrorConfig } from "./custom-error";

// Define a utility type that ensures any Zod schema is compatible with ZodType
export type ZodCompatible<T> =
  T extends ZodSchema<any> ? T : ZodType<any, any, any>;

export type FirstArgument<F extends (...args: any[]) => any> = Parameters<F>[0];

export type GetResponseDataSchema<T> = T extends string
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

export type GetResponseHeadersSchema<T> = T extends string
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

export type GetDataEntry<Schema> =
  GetResponseDataSchema<Schema> extends never
    ? object
    : {
        data: GetResponseDataSchema<Schema>;
      };

export type GetHeadersEntry<Schema> =
  GetResponseHeadersSchema<Schema> extends never
    ? object
    : {
        headers: GetResponseHeadersSchema<Schema>;
      };

export type ResponseConfig<Schema> = keyof (GetDataEntry<Schema> &
  GetHeadersEntry<Schema>) extends never
  ? object
  : GetDataEntry<Schema> & GetHeadersEntry<Schema>;

type HasKeys<T> = keyof T extends never ? false : true;
type InferUserType<UserSpec> =
  HasKeys<UserSpec> extends true
    ? UserSpec extends {
        getCurrentUser: (
          request: Request,
          logger: Logger,
        ) => Promise<infer UserT>;
        required: false;
      }
      ? UserT | undefined
      : UserSpec extends {
            getCurrentUser: (
              request: Request,
              logger: Logger,
            ) => Promise<infer UserT>;
          }
        ? UserT
        : never
    : never;

export function action<
  Returns = void,
  OnErrorResult = never,
  OnSuccessResult = void,
>(args: {
  name: string;
  exec: () => Returns;
  onError?: (error: unknown) => OnErrorResult;
  onSuccess?: (result: Returns) => OnSuccessResult;
}) {
  const result = (() => {
    try {
      const temp = (() => {
        const result = args.exec();
        if (args.onSuccess) {
          return args.onSuccess(result);
        }
        return result;
      })();
      return temp as OnSuccessResult extends void ? Returns : OnSuccessResult;
    } catch (error) {
      if (args.onError) {
        return args.onError(error) as OnErrorResult extends never
          ? never
          : OnErrorResult extends undefined
            ? undefined
            : OnErrorResult extends void
              ? undefined
              : OnErrorResult;
      }
      throw error;
    }
  })();
  return result;
}

export async function asyncAction<
  Returns = void,
  OnErrorResult = never,
  OnSuccessResult = void,
>(args: {
  name: string;
  exec: () => Promise<Returns> | Returns;
  onError?: (error: unknown) => Promise<OnErrorResult> | OnErrorResult;
  onSuccess?: (result: Returns) => Promise<OnSuccessResult> | OnSuccessResult;
}) {
  const result = await (async () => {
    try {
      const temp = await (async () => {
        const result = await args.exec();
        if (args.onSuccess) {
          return await args.onSuccess(result);
        }
        return result;
      })();
      return temp as OnSuccessResult extends void ? Returns : OnSuccessResult;
    } catch (error) {
      if (args.onError) {
        return (await args.onError(error)) as OnErrorResult extends never
          ? never
          : OnErrorResult extends undefined
            ? undefined
            : OnErrorResult extends void
              ? undefined
              : OnErrorResult;
      }
      throw error;
    }
  })();
  return result;
}

export type HandlerArgs<
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
  responses: Responses;
  user: InferUserType<UserSpec>;
  action: typeof action;
  asyncAction: typeof asyncAction;
  fail: <ResponseStatus extends keyof Responses>(
    args: CustomErrorConfig<Responses, ResponseStatus>,
  ) => void;
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
    authorize?: (
      user: InferUserType<UserSpec>,
      logger: Logger,
    ) => boolean | Promise<boolean>;
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
