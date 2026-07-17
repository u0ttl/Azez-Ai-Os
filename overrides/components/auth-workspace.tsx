"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { apiBase, apiFetch } from "@/lib/api-client";

type Lang = "en" | "ar";
type Mode = "login" | "register";
type AccountKind = "individual" | "business";
type ThemeMode = "light" | "dark";
type Identity = { userId?: string; name?: string; email?: string; emailVerified?: boolean; memberships?: Array<{ organizationId: string }> };

function messageFromProblem(problem: unknown, fallback: string): string {
  if (!problem || typeof problem !== "object") return fallback;
  const candidate = problem as { code?: unknown; message?: unknown };
  if (typeof candidate.code === "string" && candidate.code) return candidate.code;
  if (typeof candidate.message === "string" && candidate.message) return candidate.message;
  return fallback;
}

function safeSlug(value: string): string {
  const normalized = value.trim().toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 38);
  return normalized || `member-${crypto.randomUUID().slice(0, 8)}`;
}

function copy(lang: Lang) {
  return lang === "ar" ? {
    account: "حساب AZEZ AI OS", signIn: "تسجيل الدخول", create: "إنشاء حساب", intro: "ادخل إلى نظام أعمالك الذكي من بوابة تقنية آمنة.",
    individual: "فرد", business: "شركة أو فريق", name: "الاسم الكامل", org: "اسم الشركة أو الفريق", slug: "الرابط المختصر", email: "البريد الإلكتروني", password: "كلمة المرور",
    submitLogin: "دخول إلى النظام", submitRegister: "إنشاء الحساب", working: "جارٍ التنفيذ…", created: "تم إنشاء الحساب ومساحة العمل.", signed: "تم تسجيل الدخول.", failed: "تعذر إكمال الطلب", unreachable: "تعذر الاتصال بالخادم",
    connected: "الحساب المتصل", emailStatus: "حالة البريد", verified: "موثّق", notVerified: "غير موثّق", spaces: "مساحات العمل", security: "الأمان والجلسات", logout: "تسجيل الخروج", dark: "الوضع الداكن", light: "الوضع الفاتح",
    techTitle: "هوية رقمية موحّدة", techCopy: "جلسات مشفّرة، قاعدة بيانات حقيقية، وأتمتة ذكية في واجهة واحدة."
  } : {
    account: "AZEZ AI OS account", signIn: "Sign in", create: "Create account", intro: "Enter your intelligent business system through a secure technology portal.",
    individual: "Individual", business: "Company or team", name: "Full name", org: "Company or team name", slug: "Workspace slug", email: "Email address", password: "Password",
    submitLogin: "Enter the system", submitRegister: "Create account", working: "Working…", created: "Account and workspace created.", signed: "Signed in.", failed: "Unable to complete the request", unreachable: "Unable to reach the server",
    connected: "Connected account", emailStatus: "Email status", verified: "Verified", notVerified: "Not verified", spaces: "Workspaces", security: "Security and sessions", logout: "Sign out", dark: "Dark mode", light: "Light mode",
    techTitle: "Unified digital identity", techCopy: "Encrypted sessions, real data, and intelligent automation in one interface."
  };
}

export function AccountWorkspace({ lang, identity, onSessionChanged, openSecurity }: { lang: Lang; identity?: Identity; onSessionChanged: () => Promise<void> | void; openSecurity: () => void }) {
  const t = copy(lang);
  const [mode, setMode] = useState<Mode>("login");
  const [accountKind, setAccountKind] = useState<AccountKind>("individual");
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();

  useEffect(() => {
    const saved = window.localStorage.getItem("azez-theme");
    setTheme(saved === "light" || saved === "dark" ? saved : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  }, []);
  useEffect(() => { document.documentElement.dataset.authTheme = theme; window.localStorage.setItem("azez-theme", theme); }, [theme]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const payload = Object.fromEntries(new FormData(form).entries()) as Record<string, FormDataEntryValue>;
    if (mode === "register") {
      payload.locale = lang;
      if (accountKind === "individual") {
        const name = String(payload.name ?? "AZEZ Member").trim();
        payload.organizationName = lang === "ar" ? `مساحة ${name}` : `${name}'s workspace`;
        payload.organizationSlug = `${safeSlug(String(payload.email ?? name).split("@")[0])}-${crypto.randomUUID().slice(0, 6)}`;
      }
    }
    setBusy(true); setError(undefined); setNotice(undefined);
    try {
      const response = await apiFetch(`${apiBase}/auth/${mode}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      if (!response.ok) { let problem: unknown; try { problem = await response.json(); } catch { problem = undefined; } throw new Error(messageFromProblem(problem, t.failed)); }
      form.reset(); setNotice(mode === "register" ? t.created : t.signed); await onSessionChanged();
    } catch (caught) { setError(caught instanceof Error ? caught.message : t.unreachable); } finally { setBusy(false); }
  }

  async function logout() {
    setBusy(true); setError(undefined);
    try { const response = await apiFetch(`${apiBase}/auth/logout`, { method: "POST" }); if (!response.ok) throw new Error(t.unreachable); await onSessionChanged(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : t.unreachable); } finally { setBusy(false); }
  }

  const direction = lang === "ar" ? "rtl" : "ltr";
  const languageBadge = lang === "ar" ? "ع" : "EN";
  const toolbar = <div className="auth-toolbar"><span className="auth-language-badge">{languageBadge}</span><button type="button" className="theme-toggle" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>{theme === "dark" ? "☀" : "◐"}<span>{theme === "dark" ? t.light : t.dark}</span></button></div>;

  if (identity?.userId) return <div className="auth-experience" dir={direction}><div className="auth-ambient" aria-hidden="true"><i /><i /><i /><span className="auth-core">A</span></div><section className="auth-shell connected-shell">{toolbar}<section className="auth-connected-card"><span className="connected-avatar">A</span><small>{t.connected}</small><h2>{identity.name ?? identity.email ?? "AZEZ"}</h2><p>{identity.email ?? identity.userId}</p></section><section className="auth-stats"><article><small>{t.emailStatus}</small><strong>{identity.emailVerified ? t.verified : t.notVerified}</strong></article><article><small>{t.spaces}</small><strong>{identity.memberships?.length ?? 0}</strong></article></section><div className="auth-actions"><button type="button" onClick={openSecurity}>{t.security}</button><button type="button" className="secondary" onClick={() => void logout()} disabled={busy}>{busy ? t.working : t.logout}</button></div>{error && <p className="auth-message error" role="alert">{error}</p>}</section></div>;

  return <div className="auth-experience" dir={direction}>
    <div className="auth-ambient" aria-hidden="true"><i /><i /><i /><b /><b /><b /><span className="auth-core"><em>A</em></span></div>
    <section className="auth-shell">
      <aside className="auth-visual-panel"><div className="auth-brand"><span>A</span><strong>AZEZ AI OS</strong></div><div className="auth-tech-copy"><small>INTELLIGENT OPERATING SYSTEM</small><h2>{t.techTitle}</h2><p>{t.techCopy}</p></div><div className="tech-grid" aria-hidden="true"><span /><span /><span /><span /><span /><span /></div></aside>
      <main className="auth-form-panel">{toolbar}<header className="auth-heading"><small>{t.account}</small><h1>{mode === "login" ? t.signIn : t.create}</h1><p>{t.intro}</p></header>
        <div className="auth-mode-switch" role="tablist"><button type="button" className={mode === "login" ? "active" : ""} onClick={() => { setMode("login"); setError(undefined); setNotice(undefined); }}>{t.signIn}</button><button type="button" className={mode === "register" ? "active" : ""} onClick={() => { setMode("register"); setError(undefined); setNotice(undefined); }}>{t.create}</button></div>
        {mode === "register" && <div className="account-kind-switch"><button type="button" className={accountKind === "individual" ? "active" : ""} onClick={() => setAccountKind("individual")}>◉ {t.individual}</button><button type="button" className={accountKind === "business" ? "active" : ""} onClick={() => setAccountKind("business")}>▦ {t.business}</button></div>}
        <form className="auth-form" onSubmit={submit}>
          {mode === "register" && <><label><span>{t.name}</span><input name="name" required minLength={2} autoComplete="name" /></label>{accountKind === "business" && <div className="auth-field-row"><label><span>{t.org}</span><input name="organizationName" required minLength={2} /></label><label><span>{t.slug}</span><input name="organizationSlug" required minLength={2} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" dir="ltr" placeholder="azez-company" /></label></div>}</>}
          <label><span>{t.email}</span><input name="email" type="email" required autoComplete="email" dir="ltr" /></label><label><span>{t.password}</span><input name="password" type="password" required minLength={mode === "register" ? 12 : 1} autoComplete={mode === "register" ? "new-password" : "current-password"} dir="ltr" /></label>
          {notice && <p className="auth-message success" role="status">{notice}</p>}{error && <p className="auth-message error" role="alert">{error}</p>}<button className="auth-submit" type="submit" disabled={busy}>{busy ? t.working : mode === "register" ? t.submitRegister : t.submitLogin}</button>
        </form>
      </main>
    </section>
  </div>;
}
