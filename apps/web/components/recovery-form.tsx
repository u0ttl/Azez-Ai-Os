"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { apiBase, apiFetch } from "../lib/api-client";

export function RecoveryForm({ mode, token }: { mode: "forgot" | "reset" | "verify"; token?: string | undefined }) {
  const [message, setMessage] = useState<string>(); const [error, setError] = useState<string>();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(undefined); const data = new FormData(event.currentTarget);
    const endpoint = mode === "forgot" ? "forgot-password" : mode === "reset" ? "reset-password" : "verify-email";
    const payload = mode === "forgot" ? { email: data.get("email") } : mode === "reset" ? { token, password: data.get("password") } : { token };
    const response = await apiFetch(`${apiBase}/auth/${endpoint}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    if (!response.ok) { const body = await response.json() as { code?: string }; setError(body.code ?? "تعذر إكمال الطلب"); return; }
    setMessage(mode === "forgot" ? "إذا كان البريد مسجلًا فستصل تعليمات الاستعادة." : mode === "reset" ? "تم تغيير كلمة المرور. يمكنك تسجيل الدخول الآن." : "تم تأكيد البريد الإلكتروني بنجاح.");
  }
  return <div className="auth-page"><section className="auth-card"><div className="auth-brand"><span className="brand-mark">A</span><strong>Azez AI OS</strong></div><h1>{mode === "forgot" ? "استعادة كلمة المرور" : mode === "reset" ? "كلمة مرور جديدة" : "تأكيد البريد"}</h1><p>{mode === "forgot" ? "أدخل بريدك وسنجهز رسالة استعادة آمنة." : "أكمل العملية لحماية حسابك."}</p><form className="auth-form" onSubmit={submit}>{mode === "forgot" && <label>البريد الإلكتروني<input name="email" type="email" required /></label>}{mode === "reset" && <label>كلمة المرور الجديدة<input name="password" type="password" minLength={12} required /></label>}{!token && mode !== "forgot" && <p className="auth-error">الرابط غير مكتمل.</p>}{error && <p className="auth-error">{error}</p>}{message && <p className="security-message">{message}</p>}<button className="auth-submit" disabled={!token && mode !== "forgot"}>متابعة</button></form><small><Link href="/login">العودة إلى تسجيل الدخول</Link></small></section><aside className="auth-art"><span>حماية الحساب</span><strong>وصول آمن</strong><p>الروابط مؤقتة وتُستخدم مرة واحدة فقط، وتُلغى الجلسات القديمة بعد إعادة تعيين كلمة المرور.</p></aside></div>;
}
