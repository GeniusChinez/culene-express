export type HttpMethods = (
  | "GET"
  | "POST"
  | "PATCH"
  | "PUT"
  | "DELETE"
  | "OPTIONS"
  | "HEAD"
)[];
export type HttpMethod = HttpMethods[number];
