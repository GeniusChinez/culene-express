import { Response, Request } from "express";
import { reportNotFoundError } from "./response";

export default function notFoundHandler(req: Request, res: Response) {
  reportNotFoundError({ res, message: "Route not found" });
}
