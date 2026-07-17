"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { apiBase, apiFetch } from "@/lib/api-client";

type Mode = "login" | "register";
type Lang = "ar" | "en";

const COPY = {
  ar: {
    name: "الاسم",
    organization: "اسم المؤسسة",
    slug: "رابط المؤسسة",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    submitRegister: "إنشاء مساحة العمل",
    submitLogin: "تسجيل الدخول",
    working: "جارٍ التنفيذ…",
    requestFailed: "تعذر إكمال الطلب",
    connectionFailed: "تعذر الاتصال بالخادم",
    passwordHint: "استخدم 12 حرفًا على الأقل.",
  },
  en: {
    name: "Name",
    organization: "Organization name",
    slug: "Organization URL",
    email: "Email address",
    password: "Password",
    submitRegister: "Create workspace",
    submitLogin: "Sign in",
    working: "Working…",
    requestFailed: "Unable to complete the request",
    connectionFailed: "Unable to reach the server",
    passwordHint: "Use at least 12 characters.",
  },
} as const;

function problemMessage(problem: unknown, fallback: string): string {
  if (!problem || typeof problem !== "object") return fallback;
  const candidate = problem as { code?: unknown; message?: unknown };
  if (typeof candidate.message === "string" && candidate.message) return candidate.message;
  if (typeof candidate.code === "string" && candidate.code) return candidate.code;
  return fallback;
}

export function AuthForm({ mode, lang }: { mode: Mode; lang: Lang }) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const copy = COPY[lang];
  const isRegister = mode === "register";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const form = event.currentTarget;
    const data = new FormData(form);
    const payload = Object.fromEntries(data.entries());

    try {
      const response = await apiFetch(`${apiBase}/auth/${mode}`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        let problem: unknown;
        try { problem = await response.json(); } catch { problem = undefined; }
        throw new Error(problemMessage(problem, copy.requestFailed));
      }
      window.location.assign("/");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : copy.connectionFailed);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={submit} noValidate={false}>
      {isRegister && (
        <>
          <label>
            <span>{copy.name}</span>
            <input name="name" required minLength={2} autoComplete="name" />
          </label>
          <label>
            <span>{copy.organization}</span>
            <input name="organizationName" required minLength={2} autoComplete="organization" />
          </label>
          <label>
            <span>{copy.slug}</span>
            <input name="organizationSlug" required minLength={2} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" dir="ltr" placeholder="azez-company" autoCapitalize="none" spellCheck={false} />
          </label>
          <input name="locale" type="hidden" value={lang} />
        </>
      )}
      <label>
        <span>{copy.email}</span>
        <input name="email" type="email" required autoComplete="email" dir="ltr" inputMode="email" autoCapitalize="none" spellCheck={false} />
      </label>
      <label>
        <span>{copy.password}</span>
        <input name="password" type="password" required minLength={isRegister ? 12 : 1} autoComplete={isRegister ? "new-password" : "current-password"} dir="ltr" />
        {isRegister && <small>{copy.passwordHint}</small>}
      </label>
      {error && <p className="auth-error" role="alert" aria-live="assertive">{error}</p>}
      <button className="auth-submit" type="submit" disabled={loading}>
        {loading ? copy.working : isRegister ? copy.submitRegister : copy.submitLogin}
      </button>
    </form>
  );
}
