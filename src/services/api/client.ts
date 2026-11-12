/**
 * Thin fetch wrapper used by every client-side service module.
 * The server answers errors as { error: { code, fields? } }; the UI turns the
 * codes into text in the active language (see lib/apiErrors.ts).
 */
export class ApiError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    public readonly fields: Record<string, string> = {},
    public readonly details: Record<string, unknown> = {},
  ) {
    super(code);
    this.name = "ApiError";
  }
}

type Options = Omit<RequestInit, "body"> & { body?: unknown; query?: Record<string, string | number | undefined | null> };

export async function api<T>(path: string, { body, query, headers, ...init }: Options = {}): Promise<T> {
  const url = new URL(path, typeof window === "undefined" ? "http://localhost" : window.location.origin);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }

  let response: Response;
  try {
    response = await fetch(url.pathname + url.search, {
      ...init,
      credentials: "same-origin",
      headers: { ...(body !== undefined ? { "Content-Type": "application/json" } : {}), ...headers },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("NETWORK", 0);
  }

  const payload = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    const error = (payload as { error?: { code?: string; fields?: Record<string, string>; details?: Record<string, unknown> } } | null)?.error;
    const fallback = response.status === 401 ? "UNAUTHORIZED" : response.status === 403 ? "FORBIDDEN" : response.status === 404 ? "NOT_FOUND" : "INTERNAL";
    throw new ApiError(error?.code ?? fallback, response.status, error?.fields, error?.details);
  }
  return payload as T;
}
