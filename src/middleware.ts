import { NextFunction } from "express";

/* eslint-disable @typescript-eslint/no-explicit-any */
export type Middleware = (
  req: Request | any,
  res: Response | any,
  next: NextFunction,
) => any;
