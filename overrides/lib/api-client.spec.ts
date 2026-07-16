import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("apiFetch CSRF lifecycle", () => {
  it("does not request a CSRF token for safe methods", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const { apiFetch } = await import("./api-client");
    const response = await apiFetch("/api/v1/health");

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/v1/health");
  });

  it("issues a CSRF token before an unsafe request", async () => {
    vi.stubGlobal("document", { cookie: "" });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ csrfToken: "csrf-token-1" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const { apiFetch } = await import("./api-client");
    const response = await apiFetch("/api/v1/auth/login", {
      method: "POST",
      body: "{}",
      headers: { "content-type": "application/json" },
    });

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const requestInit = fetchMock.mock.calls[1]?.[1] as RequestInit;
    expect(new Headers(requestInit.headers).get("x-csrf-token")).toBe("csrf-token-1");
  });

  it("refreshes an expired CSRF token and retries once", async () => {
    vi.stubGlobal("document", { cookie: "" });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ csrfToken: "csrf-token-old" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ code: "CSRF_TOKEN_INVALID" }), {
          status: 403,
          headers: { "content-type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ csrfToken: "csrf-token-new" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const { apiFetch } = await import("./api-client");
    const response = await apiFetch("/api/v1/auth/login", {
      method: "POST",
      body: "{}",
      headers: { "content-type": "application/json" },
    });

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(4);
    const retryInit = fetchMock.mock.calls[3]?.[1] as RequestInit;
    expect(new Headers(retryInit.headers).get("x-csrf-token")).toBe("csrf-token-new");
  });
});
