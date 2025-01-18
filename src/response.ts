/* eslint-disable @typescript-eslint/no-explicit-any */
import { Response } from "express";

export default (args: {
  success: boolean;
  message: string;
  data?: any;
}): any => {
  const { success, message, data } = args;
  return {
    success,
    message,
    data,
  };
};

export const status = {
  ok: 200,
  created: 201,
  badRequest: 400,
  unauthorized: 401,
  forbidden: 403,
  notFound: 404,
  serverError: 500,
};

export type ResponseArgs = {
  res: Response;
  data?: any;
  message?: string;
};

export const respond = (args: { status: number } & ResponseArgs) => {
  const { res, status, message, data } = args;

  // Determine response payload
  const responseBody = data !== undefined ? data : { message: message || "ok" };

  return res.status(status).json(responseBody);
};

export const okResponse = ({ res, data, message = "ok" }: ResponseArgs) => {
  return respond({
    res,
    status: status.ok,
    data,
    message,
  });
};

export const resourceCreatedResponse = ({
  res,
  message = "created",
  data,
}: ResponseArgs) => {
  return respond({
    res,
    status: status.created,
    data,
    message,
  });
};

export const reportBadRequestError = ({
  res,
  message = "bad request",
  data,
}: ResponseArgs) => {
  return respond({
    res,
    status: status.badRequest,
    message,
    data: data || { message },
  });
};

export const reportUnauthorizedError = ({
  res,
  message = "unauthorized",
  data,
}: ResponseArgs) => {
  return respond({
    res,
    status: status.unauthorized,
    message,
    data: data || { message },
  });
};

export const reportForbiddenError = ({
  res,
  message = "forbidden",
  data,
}: ResponseArgs) => {
  return respond({
    res,
    status: status.forbidden,
    message,
    data: data || { message },
  });
};

export const reportNotFoundError = ({
  res,
  message = "not found",
  data,
}: ResponseArgs) => {
  return respond({
    res,
    status: status.notFound,
    message,
    data: data || { message },
  });
};

export const reportServerError = ({
  res,
  message = "unexpected server error",
  data,
}: ResponseArgs) => {
  return respond({
    res,
    status: status.serverError,
    message,
    data: data || { message },
  });
};
