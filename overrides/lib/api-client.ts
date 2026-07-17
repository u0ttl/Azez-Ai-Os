const configuredApiBase = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
const apiBase = configuredApiBase ?? "/api/v1";
const apiConfigured = true;
const CSRF_COOKIES = ["__Host-azez_csrf", "azez_csrf"] as const;
let csrfToken: string | null = null;

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const prefix = `${encodeURIComponent(name)}=`;
  for (const item of document.cookie.split(";")) {
    const value = item.trim();
    if (!value.startsWith(prefix)) continue;
    try {
      return decodeURIComponent(value.slice(prefix.length));
    } catch {
      return null;
    }
  }
  return null;
}

function readCsrfCookie(): string | null {
  for (const name of CSRF_COOKIES) {
    const token = readCookie(name);
    if (token) return token;
  }
  return null;
}

async function getCsrfToken(forceRefresh = false): Promise<string> {
  const cookieToken = readCsrfCookie();
  if (!forceRefresh && csrfToken && cookieToken === csrfToken) return csrfToken;

  csrfToken = null;
  const response = await fetch(`${apiBase}/auth/csrf`, {
    credentials: "include",
    cache: "no-store",
  });
  if (!response.ok) throw new Error("تعذر تهيئة حماية الطلب");
  const body = (await response.json()) as { csrfToken?: unknown };
  if (typeof body.csrfToken !== "string" || !body.csrfToken) {
    throw new Error("استجابة حماية الطلب غير صالحة");
  }
  csrfToken = body.csrfToken;
  return csrfToken;
}

async function responseCode(response: Response): Promise<string | undefined> {
  try {
    const body = (await response.clone().json()) as { code?: unknown };
    return typeof body.code === "string" ? body.code : undefined;
  } catch {
    return undefined;
  }
}

export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const method = (init.method ?? "GET").toUpperCase();
  const unsafe = !["GET", "HEAD", "OPTIONS"].includes(method);

  const send = async (forceCsrfRefresh: boolean): Promise<Response> => {
    const headers = new Headers(init.headers);
    if (unsafe) headers.set("x-csrf-token", await getCsrfToken(forceCsrfRefresh));
    return fetch(input, { ...init, credentials: "include", headers });
  };

  const response = await send(false);
  if (!unsafe || response.status !== 403 || (await responseCode(response)) !== "CSRF_TOKEN_INVALID") {
    return response;
  }

  const requestIsReusable = typeof Request === "undefined" || !(input instanceof Request);
  const bodyIsStream = typeof ReadableStream !== "undefined" && init.body instanceof ReadableStream;
  if (!requestIsReusable || bodyIsStream) return response;

  return send(true);
}

export { apiBase, apiConfigured };
