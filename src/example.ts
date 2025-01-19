import express from "express";
import { Request } from "express";
import { route } from "./route";
import { z } from "zod";
import { CustomError } from "./custom-error";

const app = express();

async function getCurrentUser(request: Request): Promise<{
  id: "exampleId";
  fullName: "Jane Doe";
  email: "example@gmail.com";
  kind: "admin" | "normal";
  ip: string | undefined;
}> {
  return {
    id: "exampleId",
    fullName: "Jane Doe",
    email: "example@gmail.com",
    kind: "admin",
    ip: request.ip,
  };
}

export const createUsers = route(
  {
    methods: ["POST"], // methods must be provided
    path: "/auth/register", // paths must be provided
    description: "Create an account", // description must be provided
    input: {
      body: z.object({
        username: z.string(),
        password: z.string(),
      }),
      // "query", "params", "headers" can all be validated as well
    },
    user: {
      // optional
      getCurrentUser,
      required: true, // optional
      authorize: (user) => user.kind === "normal",
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
  } as const, // must say "as const" here for type infererence to do its thing
  async (context) => {
    // handler must be async
    // note: "context.user" will not be available if the "user" key is not specified in the config
    if (context.user) {
      console.log(`${context.user.fullName} already logged in`);
      return context.respond({
        status: 403, // all status codes specified in "respond" must have been documented in the config
        message: "Please log out, human",
      });
    }

    return context.respond({
      status: 200,
      data: {
        // the data in here is automatically validated to make sure it is of the type spcified in the config
        id: "something",
      },
      headers: {
        // this is also validated to match what was specified in teh config
        secret: "things",
      },
    });
  },
);

/**
 * "createUsers" is an object containing:
 * - config: the config you used to create it
 * - handler: a modified version of the handler you provided
 * - getOpenApiSpec: a function that returns the open API spec for this route
 * - attachTo: a function that attaches the route to a given router,
 */

createUsers.attachTo(app);

// OR:
export const routeX = route(
  {
    router: app, // will automatically attach this route to the given express router
    methods: ["GET"],
    path: "/",
    user: {
      getCurrentUser,
      authorize(user) {
        return user.kind === "admin";
      },
    },
    description: "Test",
    input: {
      body: z.object({
        name: z.string(),
      }),
    },
    response: {
      400: {
        description: "Nice work",
        data: z.object({
          token: z.string(),
        }),
      },
      501: "soMETHING",
    },
  } as const,
  async (ctx) => {
    const temp = ctx.user;
    console.log(temp);

    throw new CustomError({
      context: ctx,
      status: 400,
      data: {
        token: "",
      },
    });
  },
);
