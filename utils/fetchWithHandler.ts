// utils/fetchWithHandler.ts

import { extractErrorMessage } from "./extractErrorMessage.ts";

export type FetchResult<T> = {
  data: T | null;
  error: string | null;
  status: number;
  ok: boolean;
};

export async function fetchWithHandler<T = unknown>(
  url: string,
  options?: RequestInit
): Promise<FetchResult<T>> {
  try {
    const res = await fetch(url, options);
    const contentType = res.headers.get("Content-Type") || "";

    let data: unknown;

    if (contentType.includes("application/json")) {
      try {
        data = await res.json();
      } catch {
        return {
          data: null,
          error: "Invalid JSON response",
          status: res.status,
          ok: res.ok,
        };
      }
    } else {
      const text = await res.text();
      data = text;
    }

    return {
      data: res.ok ? (data as T) : null,
      error: res.ok ? null : extractErrorMessage(data) || "Unknown error",
      status: res.status,
      ok: res.ok,
    };
  } catch (err: any) {
    return {
      data: null,
      error: err?.message || "Network error",
      status: 0,
      ok: false,
    };
  }
}
