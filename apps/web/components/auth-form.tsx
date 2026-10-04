"use client";

import { FormEvent, useState } from "react";
import { apiBase, apiFetch } from "../lib/api-client";

type Mode = "login" | "register";

export function AuthForm({ mode }: { mode: Mode }) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const data = new FormData(event.currentTarget);
    const payload = Object.fromEntries(data.entries());

    try {
      const response = await apiFetch(
        `${apiBase}/auth/${mode}`,
        {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!response.ok) {
        const problem = (await response.json()) as { message?: string; code?: string };
        throw new Error(problem.code ?? problem.message ?? "تعذر إكمال الطلب");
      }
      window.location.assign("/");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      {mode === "register" && (
        <>
          <label>الاسم<input name="name" required minLength={2} autoComplete="name" /></label>
          <label>اسم المؤسسة<input name="organizationName" required minLength={2} /></label>
          <label>رابط المؤسسة<input name="organizationSlug" required minLength={2} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" dir="ltr" placeholder="azez-company" /></label>
          <input name="locale" type="hidden" value="ar" />
        </>
      )}
      <label>البريد الإلكتروني<input name="email" type="email" required autoComplete="email" dir="ltr" /></label>
      <label>كلمة المرور<input name="password" type="password" required minLength={mode === "register" ? 12 : 1} autoComplete={mode === "register" ? "new-password" : "current-password"} dir="ltr" /></label>
      {error && <p className="auth-error" role="alert">{error}</p>}
      <button className="auth-submit" disabled={loading}>{loading ? "جارٍ التنفيذ…" : mode === "register" ? "إنشاء مساحة العمل" : "تسجيل الدخول"}</button>
    </form>
  );
}
