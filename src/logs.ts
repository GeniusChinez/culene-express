/* eslint-disable @typescript-eslint/no-explicit-any */
import winston from "winston";

export function createLogger(config?: {
  customFormat?: (data: {
    timestamp: string;
    level: string;
    message: unknown;
  }) => string;
  ouputFile?: string;
}) {
  const logFormat = winston.format.printf(({ timestamp, level, message }) => {
    if (config?.customFormat) {
      return config.customFormat({
        timestamp: (timestamp as any)?.toString(),
        level,
        message,
      });
    }
    return `[${timestamp}] [${level.toUpperCase()}]: ${message}`;
  });

  const logger = winston.createLogger({
    level: "info",
    format: winston.format.combine(winston.format.timestamp(), logFormat),
    transports: [
      new winston.transports.Console(),
      new winston.transports.File({
        filename: config?.ouputFile || "server.log",
      }),
    ],
  });

  let sources: string[] = ["Global"];
  let processes: string[] = [];

  const info = (message: string) => {
    const process =
      processes.length > 0 ? processes[processes.length - 1] : undefined;
    if (process) {
      logger.info(
        `${sources.slice(-1)[0]}> during **${process}**: ${message || "Done!"}`,
      );
    } else {
      logger.info(`${sources.slice(-1)[0]}: ${message}`);
    }
  };

  const error = (message?: string) => {
    const process =
      processes.length > 0 ? processes[processes.length - 1] : undefined;
    if (process) {
      logger.error(
        `${sources.slice(-1)[0]}> during **${process}**: ${message || "Unexpected error"}`,
      );
    } else {
      logger.error(`${sources.slice(-1)[0]}: ${message || "Unexpected error"}`);
    }
  };

  const warning = (message: string) => {
    const process =
      processes.length > 0 ? processes[processes.length - 1] : undefined;
    if (process) {
      logger.warn(`${sources.slice(-1)[0]}> during **${process}**: ${message}`);
    } else {
      logger.warn(`${sources.slice(-1)[0]}: ${message}`);
    }
  };

  const _sources = {
    push: (source: string) => {
      sources.push(source);
    },
    pop: () => {
      if (sources.length > 1) {
        sources = sources.slice(0, sources.length - 1);
      }
    },
  };

  const _processes = {
    start: (name: string) => {
      processes.push(name);
      logger.info(`${sources.slice(-1)[0]}> ${name}`);
    },
    stop: (message?: string) => {
      const process =
        processes.length > 0 ? processes[processes.length - 1] : undefined;
      if (process) {
        processes = processes.slice(0, processes.length - 1);
        logger.info(
          `${sources.slice(-1)[0]}> during **${process}**: ${message || "Done!"}`,
        );
      }
    },
    stopWithError: (message?: string) => {
      const process =
        processes.length > 0 ? processes[processes.length - 1] : undefined;
      if (process) {
        logger.error(
          `${sources.slice(-1)[0]}> during **${process}**: ${message || "Unexpected error"}`,
        );
        processes = processes.slice(0, processes.length - 1);
      }
    },
    stopWithWarning: (message: string) => {
      const process =
        processes.length > 0 ? processes[processes.length - 1] : undefined;
      if (process) {
        logger.warn(
          `${sources.slice(-1)[0]}> during **${process}**: ${message}`,
        );
        processes = processes.slice(0, processes.length - 1);
      }
    },
  };

  return {
    info,
    error,
    warning,
    sources: _sources,
    processes: _processes,
    process: <Args extends any[], Returns = void>(
      name: string,
      callback: (...args: Args) => Returns,
      ...args: Args
    ): Returns => {
      _processes.start(name);
      try {
        const result = callback(...args);
        _processes.stop();
        return result;
      } catch (e) {
        _processes.stopWithError(
          e &&
            typeof e === "object" &&
            "message" in e &&
            typeof e.message === "string"
            ? e.message
            : "Unexpected error",
        );
        throw e;
      }
    },
    asyncProcess: async <Args extends any[], Returns = void>(
      name: string,
      callback: (...args: Args) => Promise<Returns>,
      ...args: Args
    ): Promise<Returns> => {
      _processes.start(name);
      try {
        const result = await callback(...args);
        _processes.stop();
        return result;
      } catch (e) {
        _processes.stopWithError(
          e &&
            typeof e === "object" &&
            "message" in e &&
            typeof e.message === "string"
            ? e.message
            : "Unexpected error",
        );
        throw e;
      }
    },
  };
}

export type Logger = ReturnType<typeof createLogger>;
