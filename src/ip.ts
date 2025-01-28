import { Request } from "express";

/**
 * Gets the user's actual IP address, accounting for proxies.
 * @param req - The Express request object.
 * @returns The user's actual IP address.
 */
export const getUserIp = (req: Request): string => {
  // Check for the X-Forwarded-For header, which lists the client IP and proxy chain
  const xForwardedFor = req.headers["x-forwarded-for"];

  if (typeof xForwardedFor === "string") {
    // The first IP in the X-Forwarded-For list is the client's actual IP
    return xForwardedFor.split(",")[0].trim();
  }

  // Fallback to req.connection.remoteAddress if no X-Forwarded-For header exists
  const remoteAddress = req.connection.remoteAddress || "";

  // If the IP is IPv6 and prefixed with "::ffff:", it's actually an IPv4 address
  if (remoteAddress.startsWith("::ffff:")) {
    return remoteAddress.replace("::ffff:", "");
  }

  return remoteAddress;
};
