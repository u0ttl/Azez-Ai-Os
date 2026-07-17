"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AuthForm } from "@/components/auth-form";

type Lang = "ar" | "en";
type Theme = "dark" | "light";
type Mode = "login" | "register";

const COPY = {
  ar: {
    brand: "AZEZ AI OS",
    start: "ابدأ من هنا",
    registerTitle: "أنشئ حسابك",
    registerText: "اختر حسابًا فرديًا أو مساحة لشركة وفريق عمل.",
    loginTitle: "مرحبًا بعودتك",
    loginText: "سجّل الدخول للوصول إلى مساحة عملك وخدمات النظام.",
    registerAside: "هويتك الرقمية في نظام ذكي واحد.",
    loginAside: "كل أعمالك في مساحة تشغيل واحدة.",
    asideText: "واجهة تقنية ثلاثية الأبعاد، بيانات معزولة، وصلاحيات آمنة منذ اليوم الأول.",
    hasAccount: "لديك حساب؟",
    noAccount: "ليس لديك حساب؟",
    signIn: "تسجيل الدخول",
    create: "إنشاء حساب",
    light: "الوضع الفاتح",
    dark: "الوضع الداكن",
    language: "Switch to English",
  },
  en: {
    brand: "AZEZ AI OS",
    start: "Start here",
    registerTitle: "Create your account",
    registerText: "Choose an individual account or a workspace for a company and team.",
    loginTitle: "Welcome back",
    loginText: "Sign in to access your workspace and operating services.",
    registerAside: "Your digital identity in one intelligent system.",
    loginAside: "All your work in one operating environment.",
    asideText: "A three-dimensional technology interface, isolated data, and secure permissions from day one.",
    hasAccount: "Already have an account?",
    noAccount: "Need an account?",
    signIn: "Sign in",
    create: "Create account",
    light: "Light mode",
    dark: "Dark mode",
    language: "التبديل إلى العربية",
  },
} as const;

function initialLanguage(): Lang {
  if (typeof window === "undefined") return "ar";
  const saved = window.localStorage.getItem("azez-language");
  return saved === "ar" || saved === "en" ? saved : "ar";
}

function initialTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  const saved = window.localStorage.getItem("azez-theme");
  if (saved === "dark" || saved === "light") return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function AuthPageClient({ mode }: { mode: Mode }) {
  const [lang, setLang] = useState<Lang>(initialLanguage);
  const [theme, setTheme] = useState<Theme>(initialTheme);

  useEffect(() => {
    document.body.dataset.page = "auth";
    return () => { delete document.body.dataset.page; };
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("azez-language", lang);
    window.localStorage.setItem("azez-theme", theme);
  }, [lang, theme]);

  const copy = COPY[lang];
  const isRegister = mode === "register";

  return (
    <main className="auth-page" dir={lang === "ar" ? "rtl" : "ltr"}>
      <section className="auth-card">
        <header className="auth-toolbar">
          <div className="auth-brand">
            <span className="brand-mark" aria-hidden="true">A</span>
            <strong>{copy.brand}</strong>
          </div>
          <div className="auth-preferences">
            <button
              className="auth-preference"
              type="button"
              onClick={() => setTheme((current) => current === "dark" ? "light" : "dark")}
              aria-label={theme === "dark" ? copy.light : copy.dark}
              title={theme === "dark" ? copy.light : copy.dark}
            >
              <span aria-hidden="true">{theme === "dark" ? "☀" : "◐"}</span>
              <b>{theme === "dark" ? copy.light : copy.dark}</b>
            </button>
            <button
              className="auth-preference language"
              type="button"
              onClick={() => setLang((current) => current === "ar" ? "en" : "ar")}
              aria-label={copy.language}
              title={copy.language}
            >
              <span aria-hidden="true">{lang === "ar" ? "EN" : "ع"}</span>
            </button>
          </div>
        </header>

        <div className="auth-copy">
          <span className="eyebrow">{copy.start}</span>
          <h1>{isRegister ? copy.registerTitle : copy.loginTitle}</h1>
          <p>{isRegister ? copy.registerText : copy.loginText}</p>
        </div>

        <AuthForm mode={mode} lang={lang} />

        <small className="auth-switch">
          {isRegister ? copy.hasAccount : copy.noAccount}{" "}
          <Link href={isRegister ? "/login" : "/register"}>
            {isRegister ? copy.signIn : copy.create}
          </Link>
        </small>
      </section>

      <aside className="auth-art" aria-label={isRegister ? copy.registerAside : copy.loginAside}>
        <div className="auth-art-orb" aria-hidden="true"><span>A</span></div>
        <span>AZEZ AI OS</span>
        <strong>{isRegister ? copy.registerAside : copy.loginAside}</strong>
        <p>{copy.asideText}</p>
        <div className="auth-art-grid" aria-hidden="true" />
      </aside>
    </main>
  );
}
