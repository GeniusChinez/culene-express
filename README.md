# Express Route Handler

This package provides an easy way to define routes with structured input validation using Zod, manage responses, handle user authentication, and generate API documentation automatically.

## Features

- **Route Definitions**: Define routes with HTTP methods, path, and description.
- **Input Validation**: Validate query parameters, path parameters, request body, and headers using Zod.
- **Authentication**: Optionally validate users and get user data from requests.
- **Response Handling**: Automatically validates and returns responses based on defined schemas.
- **API Documentation**: Automatically generate OpenAPI specs and HTML documentation.

## Installation

To install the package, run:

```bash
npm install express-route-handler
```

## Usage

### 1. Define a Route

You can define a route by calling the `route` function. It requires a configuration object and a handler function.

```ts
import express from "express";
import { Request } from "express";
import routing from "express-route-handler";
import { z } from "zod";

const app = express();

async function getCurrentUser(request: Request) {
  return {
    id: "exampleId",
    fullName: "Jane Doe",
    email: "example@gmail.com",
    kind: "admin",
    ip: request.ip,
  };
}

export const createUsers = routing.route(
  {
    methods: ["POST"],
    path: "/auth/register",
    description: "Create an account",
    input: {
      body: z.object({
        username: z.string(),
        password: z.string(),
      }),
    },
    user: {
      getCurrentUser,
      required: false,
    },
    response: {
      200: {
        description: "User created",
        data: z.object({
          id: z.string(),
        }),
        headers: z.object({
          secret: z.string(),
        }),
      },
      403: "User already logged in",
    },
    docs: {
      body: {
        username: {
          description: "The name of the user",
          example: "Peter",
        },
        password: {
          description: "The user's password",
          example: "12345678",
        },
      },
    },
  },
  async (context) => {
    if (context.user) {
      console.log(`${context.user.fullName} already logged in`);
      return context.respond({
        status: 403,
        message: "Please log out, human",
      });
    }

    return context.respond({
      status: 200,
      data: { id: "something" },
      headers: { secret: "things" },
    });
  }
);

createUsers.attachTo(app);
```

### 2. Automatic OpenAPI Documentation

The route includes functionality to generate an OpenAPI spec and HTML documentation.

- **OpenAPI Spec**: Accessible at `/auth/register/docs`.
- **HTML Documentation**: Accessible at `/auth/register/html-docs`.

### 3. Route Configuration

The route configuration is passed as the first argument to the `route` function. Here's the structure:

```ts
{
  methods: HttpMethod[];  // Array of HTTP methods (GET, POST, etc.)
  path: string;           // The route path
  description: string;    // A description of the route
  input?: {
    query?: ZodSchema;
    params?: ZodSchema;
    body?: ZodSchema;
    headers?: ZodSchema;
  };                      // Input schemas to validate request data
  user?: {
    getCurrentUser: (request: Request) => Promise<any>;
    required?: boolean;
  };                      // Optional user authentication
  response: {
    [statusCode: number]: string | { description: string; data?: ZodSchema; headers?: ZodSchema };
  };                      // Response status codes and schemas
  docs: {
    query?: Record<string, { description: string; example?: any }>;
    params?: Record<string, { description: string; example?: any }>;
    body?: Record<string, { description: string; example?: any }>;
    headers?: Record<string, { description: string; example?: any }>;
  };                      // Documentation for input fields
}
```

### 4. Response Handling

The response is automatically validated according to the schema you define. For example, in the above code, a `200` status code response includes data and headers.

```ts
response: {
  200: {
    description: "User created",
    data: z.object({
      id: z.string(),
    }),
    headers: z.object({
      secret: z.string(),
    }),
  },
}
```

### 5. User Authentication

The `user` field is optional and allows you to authenticate users before processing the request. If a user is required, the `getCurrentUser` function should return user data based on the request. It can throw an exception to indicate an error.

### 6. Error Handling

The package provides built-in error handling for common HTTP errors:

- **400 (Bad Request)**: Invalid input data.
- **401 (Unauthorized)**: User authentication failed.
- **500 (Server Error)**: Internal server error.

## Example of Error Handling

```ts
if (!result.success) {
  return reportBadRequestError({
    res,
    message: "Invalid input data",
    data: formatZodError(result.error),
  });
}
```

## Additional Functions

### `attachTo`

The `attachTo` function attaches the route to an Express router.

```ts
createUsers.attachTo(app);
```

### `getOpenApiSpec`

Use this function to get the OpenAPI specification for the route.

```ts
createUsers.getOpenApiSpec();
```

## API Documentation

The OpenAPI spec is automatically generated for each route. You can view the JSON or HTML version of the documentation:

- JSON version: `/auth/register/docs`
- HTML version: `/auth/register/html-docs`

### Example OpenAPI Spec

```json
{
  "summary": "Create an account",
  "parameters": [
    {
      "name": "username",
      "in": "body",
      "description": "The name of the user",
      "required": true,
      "example": "Peter",
      "schema": { "type": "string" }
    }
  ],
  "responses": {
    "200": {
      "description": "User created",
      "content": {
        "application/json": {
          "schema": { "type": "object", "properties": { "id": { "type": "string" } } }
        }
      }
    }
  }
}
```

## License
This project is licensed under the MIT License.
