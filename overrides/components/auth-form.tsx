"use client";

import type { CSSProperties, FormEvent } from "react";
import { useState } from "react";
import { apiBase, apiFetch } from "@/lib/api-client";

type Mode = "login" | "register";
type Lang = "ar" | "en";
type AccountType = "individual" | "business";

const COPY = {
  ar: {
    individual: "فرد",
    business: "شركة أو فريق",
    name: "الاسم الكامل",
    organization: "اسم الشركة أو الفريق",
    slug: "الرابط المختصر",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    submitRegister: "إنشاء الحساب",
    submitLogin: "تسجيل الدخول",
    working: "جارٍ التنفيذ…",
    requestFailed: "تعذر إكمال الطلب",
    connectionFailed: "تعذر الاتصال بالخادم",
    passwordHint: "استخدم 12 حرفًا على الأقل.",
  },
  en: {
    individual: "Individual",
    business: "Company or team",
    name: "Full name",
    organization: "Company or team name",
    slug: "Workspace URL",
    email: "Email address",
    password: "Password",
    submitRegister: "Create account",
    submitLogin: "Sign in",
    working: "Working…",
    requestFailed: "Unable to complete the request",
    connectionFailed: "Unable to reach the server",
    passwordHint: "Use at least 12 characters.",
  },
} as const;

const typeSwitchStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 8,
  marginBottom: 2,
};

const typeButtonStyle: CSSProperties = {
  minHeight: 45,
  borderRadius: 11,
  border: "1px solid var(--auth-border)",
  background: "var(--auth-surface)",
  color: "var(--auth-ink)",
  font: "inherit",
  fontSize: 12,
  fontWeight: 750,
  cursor: "pointer",
};

function activeTypeButton(active: boolean): CSSProperties {
  return active ? {
    ...typeButtonStyle,
    borderColor: "transparent",
    background: "linear-gradient(115deg,var(--auth-accent),var(--auth-accent-2))",
    color: "#fff",
    boxShadow: "0 10px 24px color-mix(in srgb,var(--auth-accent) 24%,transparent)",
  } : typeButtonStyle;
}

function problemMessage(problem: unknown, fallback: string): string {
  if (!problem || typeof problem !== "object") return fallback;
  const candidate = problem as { code?: unknown; message?: unknown };
  if (typeof candidate.message === "string" && candidate.message) return candidate.message;
  if (typeof candidate.code === "string" && candidate.code) return candidate.code;
  return fallback;
}

function slugPart(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 36) || "member";
}

export function AuthForm({ mode, lang }: { mode: Mode; lang: Lang }) {
  const [accountType, setAccountType] = useState<AccountType>("individual");
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
    const payload = Object.fromEntries(data.entries()) as Record<string, FormDataEntryValue>;

    if (isRegister && accountType === "individual") {
      const name = String(payload.name ?? "AZEZ Member").trim();
      const emailPrefix = String(payload.email ?? name).split("@")[0] ?? name;
      payload.organizationName = lang === "ar" ? `مساحة ${name}` : `${name}'s workspace`;
      payload.organizationSlug = `${slugPart(emailPrefix)}-${crypto.randomUUID().slice(0, 6)}`;
    }

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
          <div style={typeSwitchStyle} role="group" aria-label={lang === "ar" ? "نوع الحساب" : "Account type"}>
            <button className={accountType === "individual" ? "account-type-button active" : "account-type-button"} type="button" style={activeTypeButton(accountType === "individual")} aria-pressed={accountType === "individual"} onClick={() => setAccountType("individual")}>◉ {copy.individual}</button>
            <button className={accountType === "business" ? "account-type-button active" : "account-type-button"} type="button" style={activeTypeButton(accountType === "business")} aria-pressed={accountType === "business"} onClick={() => setAccountType("business")}>▦ {copy.business}</button>
          </div>
          <label>
            <span>{copy.name}</span>
            <input name="name" required minLength={2} autoComplete="name" />
          </label>
          {accountType === "business" && (
            <>
              <label>
                <span>{copy.organization}</span>
                <input name="organizationName" required minLength={2} autoComplete="organization" />
              </label>
              <label>
                <span>{copy.slug}</span>
                <input name="organizationSlug" required minLength={2} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" dir="ltr" placeholder="azez-company" autoCapitalize="none" spellCheck={false} />
              </label>
            </>
          )}
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
