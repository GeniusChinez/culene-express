/* eslint-disable @typescript-eslint/no-explicit-any */
import { ZodSchema } from "zod";
import { HandlerArgs, ResponseConfig, ZodCompatible } from "./route.types";

type CustomErrorConfig<
  Responses extends {
    [key: number]:
      | string
      | {
          description?: string;
          data?: ZodCompatible<ZodSchema<any>>;
          headers?: ZodCompatible<ZodSchema<any>>;
        };
  },
  ResponseStatus extends keyof Responses,
> = {
  status: ResponseStatus;
  message?: string;
} & ResponseConfig<Responses[ResponseStatus]>;

export class CustomError<
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
  ResponseStatus extends keyof Responses,
> {
  constructor(
    config: CustomErrorConfig<Responses, ResponseStatus> & {
      context: HandlerArgs<
        QuerySchema,
        ParamsSchema,
        BodySchema,
        HeadersSchema,
        Responses,
        UserSpec
      >;
    },
  ) {
    this.status = config.status;
    this.message = config.message;
    this.data = "data" in config ? config.data : undefined;
    this.context = config.context;
  }
  status: ResponseStatus;
  message?: string;
  data?: any;
  context: HandlerArgs<
    QuerySchema,
    ParamsSchema,
    BodySchema,
    HeadersSchema,
    Responses,
    UserSpec
  >;
}

export function isCustomError(
  e: unknown,
): e is CustomError<any, any, any, any, any, any, any> {
  return e instanceof CustomError;
}
