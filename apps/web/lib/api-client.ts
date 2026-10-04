const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/v1";
let csrfToken: string | null = null;

async function getCsrfToken(): Promise<string> {
  if (csrfToken) return csrfToken;
  const response = await fetch(`${apiBase}/auth/csrf`, { credentials: "include", cache: "no-store" });
  if (!response.ok) throw new Error("تعذر تهيئة حماية الطلب");
  const body = (await response.json()) as { csrfToken: string };
  csrfToken = body.csrfToken;
  return csrfToken;
}

export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const method = (init.method ?? "GET").toUpperCase();
  const headers = new Headers(init.headers);
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) headers.set("x-csrf-token", await getCsrfToken());
  return fetch(input, { ...init, credentials: "include", headers });
}

export { apiBase };
