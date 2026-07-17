"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { apiBase, apiFetch } from "@/lib/api-client";

type Lang = "en" | "ar";
type Mode = "login" | "register";
type Identity = {
  userId?: string;
  name?: string;
  email?: string;
  emailVerified?: boolean;
  memberships?: Array<{ organizationId: string }>;
};

function messageFromProblem(problem: unknown, fallback: string): string {
  if (!problem || typeof problem !== "object") return fallback;
  const candidate = problem as { code?: unknown; message?: unknown };
  if (typeof candidate.code === "string" && candidate.code) return candidate.code;
  if (typeof candidate.message === "string" && candidate.message) return candidate.message;
  return fallback;
}

export function AccountWorkspace({
  lang,
  identity,
  onSessionChanged,
  openSecurity,
}: {
  lang: Lang;
  identity?: Identity;
  onSessionChanged: () => Promise<void> | void;
  openSecurity: () => void;
}) {
  const [mode, setMode] = useState<Mode>("login");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries()) as Record<string, FormDataEntryValue>;
    if (mode === "register") payload.locale = lang;

    setBusy(true);
    setError(undefined);
    setNotice(undefined);
    try {
      const response = await apiFetch(`${apiBase}/auth/${mode}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        let problem: unknown;
        try { problem = await response.json(); } catch { problem = undefined; }
        throw new Error(messageFromProblem(problem, lang === "ar" ? "تعذر إكمال الطلب" : "Unable to complete the request"));
      }
      form.reset();
      setNotice(mode === "register"
        ? (lang === "ar" ? "تم إنشاء الحساب ومساحة العمل." : "Account and workspace created.")
        : (lang === "ar" ? "تم تسجيل الدخول." : "Signed in."));
      await onSessionChanged();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : (lang === "ar" ? "تعذر الاتصال بالخادم" : "Unable to reach the server"));
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);
    setError(undefined);
    setNotice(undefined);
    try {
      const response = await apiFetch(`${apiBase}/auth/logout`, { method: "POST" });
      if (!response.ok) throw new Error(lang === "ar" ? "تعذر تسجيل الخروج" : "Unable to sign out");
      setNotice(lang === "ar" ? "تم تسجيل الخروج." : "Signed out.");
      await onSessionChanged();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : (lang === "ar" ? "تعذر تسجيل الخروج" : "Unable to sign out"));
    } finally {
      setBusy(false);
    }
  }

  if (identity?.userId) {
    return (
      <div className="utility-workspace">
        <section className="window-hero-card">
          <span>AZ</span>
          <div>
            <small>{lang === "ar" ? "الحساب المتصل" : "Connected account"}</small>
            <h2>{identity.name ?? identity.email ?? "AZEZ"}</h2>
            <p>{identity.email ?? identity.userId}</p>
          </div>
        </section>
        <section className="dashboard-grid">
          <article className="panel"><h2>{lang === "ar" ? "حالة البريد" : "Email status"}</h2><strong>{identity.emailVerified ? (lang === "ar" ? "موثّق" : "Verified") : (lang === "ar" ? "غير موثّق" : "Not verified")}</strong></article>
          <article className="panel"><h2>{lang === "ar" ? "مساحات العمل" : "Workspaces"}</h2><strong>{identity.memberships?.length ?? 0}</strong></article>
        </section>
        <div className="workspace-actions">
          <button type="button" onClick={openSecurity}>{lang === "ar" ? "الأمان والجلسات" : "Security and sessions"}</button>
          <button className="secondary" type="button" onClick={() => void logout()} disabled={busy}>{busy ? (lang === "ar" ? "جارٍ التنفيذ…" : "Working…") : (lang === "ar" ? "تسجيل الخروج" : "Sign out")}</button>
        </div>
        {notice && <p className="auth-error" role="status">{notice}</p>}
        {error && <p className="auth-error" role="alert">{error}</p>}
      </div>
    );
  }

  return (
    <div className="utility-workspace">
      <section className="window-hero-card">
        <span>AZ</span>
        <div>
          <small>{lang === "ar" ? "حساب AZEZ AI OS" : "AZEZ AI OS account"}</small>
          <h2>{mode === "login" ? (lang === "ar" ? "تسجيل الدخول" : "Sign in") : (lang === "ar" ? "إنشاء مساحة عمل" : "Create workspace")}</h2>
          <p>{lang === "ar" ? "أدخل بياناتك هنا دون مغادرة النظام." : "Enter your details without leaving the operating system."}</p>
        </div>
      </section>
      <div className="workspace-actions">
        <button type="button" onClick={() => { setMode("login"); setError(undefined); setNotice(undefined); }} disabled={mode === "login"}>{lang === "ar" ? "دخول" : "Sign in"}</button>
        <button className="secondary" type="button" onClick={() => { setMode("register"); setError(undefined); setNotice(undefined); }} disabled={mode === "register"}>{lang === "ar" ? "حساب جديد" : "Create account"}</button>
      </div>
      <form className="auth-form panel" onSubmit={submit}>
        {mode === "register" && (
          <>
            <label>{lang === "ar" ? "الاسم" : "Name"}<input name="name" required minLength={2} autoComplete="name" /></label>
            <label>{lang === "ar" ? "اسم المؤسسة" : "Organization name"}<input name="organizationName" required minLength={2} /></label>
            <label>{lang === "ar" ? "رابط المؤسسة" : "Organization slug"}<input name="organizationSlug" required minLength={2} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" dir="ltr" placeholder="azez-company" /></label>
          </>
        )}
        <label>{lang === "ar" ? "البريد الإلكتروني" : "Email"}<input name="email" type="email" required autoComplete="email" dir="ltr" /></label>
        <label>{lang === "ar" ? "كلمة المرور" : "Password"}<input name="password" type="password" required minLength={mode === "register" ? 12 : 1} autoComplete={mode === "register" ? "new-password" : "current-password"} dir="ltr" /></label>
        {notice && <p className="auth-error" role="status">{notice}</p>}
        {error && <p className="auth-error" role="alert">{error}</p>}
        <button className="auth-submit" type="submit" disabled={busy}>{busy ? (lang === "ar" ? "جارٍ التنفيذ…" : "Working…") : mode === "register" ? (lang === "ar" ? "إنشاء الحساب" : "Create account") : (lang === "ar" ? "تسجيل الدخول" : "Sign in")}</button>
      </form>
    </div>
  );
}
