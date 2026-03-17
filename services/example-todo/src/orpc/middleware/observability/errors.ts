type ErrorShape = {
  name?: unknown;
  message?: unknown;
  code?: unknown;
  status?: unknown;
};

export function getErrorDetails(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return {};
  }

  const typed = error as ErrorShape;
  return {
    code: typeof typed.code === "string" ? typed.code : undefined,
    status: typeof typed.status === "number" ? typed.status : undefined,
    errorName: typeof typed.name === "string" ? typed.name : undefined,
    errorMessage: typeof typed.message === "string" ? typed.message : undefined,
  };
}
