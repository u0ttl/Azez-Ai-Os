"use client";

import { useCallback, useEffect, useState } from "react";
import { apiBase, apiFetch } from "../lib/api-client";

type Notification = { id: string; type: string; title: string; body: string; link: string | null; readAt: string | null; createdAt: string; organization: { name: string } };

export function NotificationsWorkspace() {
  const [items, setItems] = useState<Notification[]>([]); const [unreadOnly, setUnreadOnly] = useState(false); const [error, setError] = useState<string>();
  const load = useCallback(async () => {
    const response = await apiFetch(`${apiBase}/notifications?unread=${unreadOnly}`);
    if (response.status === 401) return window.location.assign("/login");
    if (!response.ok) throw new Error("تعذر تحميل الإشعارات"); setItems((await response.json()) as Notification[]);
  }, [unreadOnly]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial notification load
    void load().catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "حدث خطأ"));
  }, [load]);

  async function open(item: Notification) {
    if (!item.readAt) await apiFetch(`${apiBase}/notifications/${item.id}/read`, { method: "PATCH" });
    if (item.link) window.location.assign(item.link); else await load();
  }
  async function readAll() { await apiFetch(`${apiBase}/notifications/read-all`, { method: "POST" }); await load(); }

  return <main className="module-content"><header className="module-header"><div><span className="eyebrow">صندوق العمل</span><h1>الإشعارات</h1><p>التعيينات والتعليقات والأحداث المهمة في مؤسساتك.</p></div><button className="secondary inline-secondary" onClick={readAll}>تعليم الكل كمقروء</button></header>{error && <p className="auth-error">{error}</p>}<section className="notification-toolbar panel"><label><input type="checkbox" checked={unreadOnly} onChange={(event) => setUnreadOnly(event.target.checked)} /> غير المقروءة فقط</label><span>{items.filter((item) => !item.readAt).length} غير مقروء</span></section><section className="notification-list">{items.length ? items.map((item) => <button className={`notification-item ${item.readAt ? "read" : "unread"}`} key={item.id} onClick={() => void open(item)}><span className="notification-mark" /><div><small>{item.organization.name} · {item.type}</small><strong>{item.title}</strong><p>{item.body}</p><time>{new Date(item.createdAt).toLocaleString("ar")}</time></div></button>) : <div className="panel empty-state">لا توجد إشعارات حاليًا.</div>}</section></main>;
}
