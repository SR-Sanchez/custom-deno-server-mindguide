export function extractErrorMessage(data: unknown): string | null {
  if (!data) return null;

  if (typeof data === "string") {
    return data;
  }

  if (typeof data === "object" && data !== null) {
    // @ts-ignore: data is unknown, so accessing message may cause a TS error
    if (typeof data.message === "string") return data.message;
    // @ts-ignore: data is unknown, so accessing error may cause a TS error
    if (typeof data.error === "string") return data.error;
    // @ts-ignore: data.error may be undefined, so optional chaining may cause a TS error
    if (typeof data.error?.message === "string") return data.error.message;
  }

  try {
    return JSON.stringify(data);
  } catch {
    return null;
  }
}