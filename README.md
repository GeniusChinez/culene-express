# Culene Express Routing

This package provides an easy way to define routes with structured input validation using Zod, manage responses, handle user authentication, and generate API documentation automatically. You can also create and configure an express app directly.

## Features

- **Route Definitions**: Define routes with HTTP methods, path, and description.
- **Input Validation**: Validate query parameters, path parameters, request body, and headers using Zod.
- **Authentication**: Optionally validate users and get user data from requests.
- **Response Handling**: Automatically validates and returns responses based on defined schemas.
- **API Documentation**: Automatically generate OpenAPI specs and HTML documentation.
- **Middleware Support**: Attach custom middleware to individual routes or groups of routes.
- **App Creation**: Easily configure and set up an Express app with built-in middleware, rate limiting, and documentation.

## Installation

To install the package, run:

```bash
npm install culene
```

## Usage

### 1. Define a Route

You can define a route by calling the `route` function. It requires a configuration object and a handler function.

```ts
import express from "express";
import { Request } from "express";
import routing from "culene";
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

### 2. Use Middleware

You can attach middleware to routes or route groups to handle additional logic such as logging, authorization, or rate-limiting.

```ts
import { route, middleware } from "culene";

const logMiddleware = middleware(async (req, res, next) => {
  console.log(`Request made to ${req.path}`);
  next();
});

export const createPost = route(
  {
    methods: ["POST"],
    path: "/posts",
    description: "Create a new post",
    middlewares: [logMiddleware],
    input: {
      body: z.object({
        title: z.string(),
        content: z.string(),
      }),
    },
    response: {
      201: {
        description: "Post created successfully",
        data: z.object({
          id: z.string(),
        }),
      },
    },
  },
  async (context) => {
    const { title, content } = context.input.body;
    const newPost = { id: "uniquePostId", title, content };
    return context.respond({
      status: 201,
      data: newPost,
    });
  }
);
```

### 3. Add custom user authorization logic
```ts
export const getUsers = route(
  {
    methods: ["GET"],
    path: "/users",
    description: "Get users",
    user: {
      getCurrentUser,
      authorize: (user) => user.kind === "admin",
      // the "authorize" callback can be async or sync, and receives the user for the argument
    },
    response: {
      200: {
        description: "Users retrieved",
        data: z.object({
          id: z.string(),
        }).array(),
      },
    },
  },
  async (context) => {
    return context.respond({
      status: 200,
      data: [],
    });
  }
);
```

### 4. Create an App

The `createApp` function simplifies the setup of an Express app with common configurations like middleware, rate limiting, and Swagger documentation.

```ts
import { createApp } from "culene";

const appConfig = {
  title: "Culene API",
  version: "1.1.0",
  description: "Enhanced API with route groups and middleware",
  rateLimiting: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
  },
  routes: [postRoutes],
};

async function main() {
  const { app, start } = await createApp(appConfig);
  start(3000, {
    onStart: () => console.log("Server started on port 3000"),
  });
}

main();
```

## License

This project is licensed under the MIT License.
