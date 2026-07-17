type LogLevel =
  | "debug"
  | "info"
  | "warn"
  | "error";

type LogPayload = {
  message: string;
  context?: Record<string, unknown>;
  error?: unknown;
};

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return error;
}

function write(
  level: LogLevel,
  payload: LogPayload
) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message: payload.message,
    context: payload.context,
    error: serializeError(
      payload.error
    ),
  };

  const output =
    JSON.stringify(entry);

  if (level === "error") {
    console.error(output);
    return;
  }

  if (level === "warn") {
    console.warn(output);
    return;
  }

  console.log(output);
}

export const logger = {
  debug(
    message: string,
    context?: Record<string, unknown>
  ) {
    write("debug", {
      message,
      context,
    });
  },

  info(
    message: string,
    context?: Record<string, unknown>
  ) {
    write("info", {
      message,
      context,
    });
  },

  warn(
    message: string,
    context?: Record<string, unknown>
  ) {
    write("warn", {
      message,
      context,
    });
  },

  error(
    message: string,
    error?: unknown,
    context?: Record<string, unknown>
  ) {
    write("error", {
      message,
      error,
      context,
    });
  },
};
