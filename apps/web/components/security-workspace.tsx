"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { apiBase, apiFetch } from "../lib/api-client";

type Identity = { userId: string; sessionId: string; email: string; emailVerified: boolean };
type Session = { id: string; ipAddress: string | null; userAgent: string | null; createdAt: string; lastSeenAt: string; expiresAt: string; current: boolean };

export function SecurityWorkspace() {
  const [identity, setIdentity] = useState<Identity>();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();

  const load = useCallback(async () => {
    const [meResponse, sessionsResponse] = await Promise.all([apiFetch(`${apiBase}/auth/me`), apiFetch(`${apiBase}/auth/sessions`)]);
    if (meResponse.status === 401) { window.location.assign("/login"); return; }
    if (!meResponse.ok || !sessionsResponse.ok) throw new Error("تعذر تحميل إعدادات الأمان");
    setIdentity(await meResponse.json() as Identity);
    setSessions(await sessionsResponse.json() as Session[]);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial authenticated security load
    void load().catch((caught) => setError(caught instanceof Error ? caught.message : "تعذر الاتصال"));
  }, [load]);

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(undefined); setMessage(undefined);
    const form = event.currentTarget; const data = new FormData(form);
    const response = await apiFetch(`${apiBase}/auth/change-password`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(Object.fromEntries(data.entries())) });
    if (!response.ok) { const body = await response.json() as { code?: string }; setError(body.code ?? "تعذر تغيير كلمة المرور"); return; }
    form.reset(); setMessage("تم تغيير كلمة المرور وإلغاء الجلسات الأخرى."); await load();
  }

  async function revoke(id: string) {
    const response = await apiFetch(`${apiBase}/auth/sessions/${id}`, { method: "DELETE" });
    if (!response.ok) { setError("تعذر إلغاء الجلسة"); return; }
    if (id === identity?.sessionId) { window.location.assign("/login"); return; }
    await load();
  }

  async function resendVerification() {
    const response = await apiFetch(`${apiBase}/auth/resend-verification`, { method: "POST" });
    setMessage(response.ok ? "أُضيفت رسالة التأكيد إلى قائمة الإرسال." : "تعذر إرسال رسالة التأكيد.");
  }

  async function logoutAll() {
    await apiFetch(`${apiBase}/auth/logout-all`, { method: "POST" });
    window.location.assign("/login");
  }

  return (
    <main className="module-content">
      <header className="module-header"><div><span className="eyebrow">الحساب</span><h1>الأمان والجلسات</h1><p>تحكم بكلمة المرور والأجهزة التي يمكنها الوصول إلى حسابك.</p></div><span className={identity?.emailVerified ? "security-badge ok" : "security-badge warn"}>{identity?.emailVerified ? "البريد مؤكّد" : "البريد غير مؤكّد"}</span></header>
      {message && <p className="security-message">{message}</p>}{error && <p className="auth-error">{error}</p>}
      <div className="security-grid">
        <section className="panel"><h2>كلمة المرور</h2><form className="stack-form" onSubmit={changePassword}><label>كلمة المرور الحالية<input type="password" name="currentPassword" required autoComplete="current-password" /></label><label>كلمة المرور الجديدة<input type="password" name="newPassword" required minLength={12} autoComplete="new-password" /></label><button>تغيير كلمة المرور</button></form>{!identity?.emailVerified && <button className="secondary" onClick={resendVerification}>إعادة إرسال تأكيد البريد</button>}</section>
        <section className="panel"><div className="panel-heading"><h2>الجلسات النشطة</h2><button className="text-button danger" onClick={logoutAll}>تسجيل الخروج من الكل</button></div><div className="data-list">{sessions.map((session) => <div className="session-row" key={session.id}><div><strong>{session.current ? "هذا الجهاز" : deviceLabel(session.userAgent)}</strong><small>{session.ipAddress ?? "عنوان غير متاح"} · آخر نشاط {new Date(session.lastSeenAt).toLocaleString("ar")}</small></div><button disabled={session.current} onClick={() => revoke(session.id)}>{session.current ? "نشطة" : "إلغاء"}</button></div>)}</div></section>
      </div>
    </main>
  );
}

function deviceLabel(userAgent: string | null): string {
  if (!userAgent) return "جهاز غير معروف";
  if (/mobile|android|iphone/i.test(userAgent)) return "هاتف أو جهاز لوحي";
  return "متصفح سطح مكتب";
}
