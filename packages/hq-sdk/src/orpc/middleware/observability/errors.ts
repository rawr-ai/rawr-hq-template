/** Extracts public diagnostic fields without changing the failure channel. */
export function getErrorDetails(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return {};
  }

  const code = Reflect.get(error, "code");
  const status = Reflect.get(error, "status");
  const name = Reflect.get(error, "name");
  const message = Reflect.get(error, "message");

  return {
    code: typeof code === "string" ? code : undefined,
    status: typeof status === "number" ? status : undefined,
    errorName: typeof name === "string" ? name : undefined,
    errorMessage: typeof message === "string" ? message : undefined,
  };
}
