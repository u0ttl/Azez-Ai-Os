"use client";

import { FormEvent, useEffect, useState } from "react";
import { apiFetch } from "../lib/api-client";

const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/v1";
type Base = { id: string; name: string };
type Conversation = { id: string; title: string };
type Message = { id: string; role: "USER" | "ASSISTANT"; content: string; citations: Array<{ title: string }> | null };
type AIStatus = { provider: string; model: string; embeddingsEnabled: boolean; usedToday: number; dailyLimit: number };

export function AIWorkspace() {
  const [organizationId, setOrganizationId] = useState<string>();
  const [bases, setBases] = useState<Base[]>([]);
  const [baseId, setBaseId] = useState("");
  const [conversation, setConversation] = useState<Conversation>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [status, setStatus] = useState<AIStatus>();

  useEffect(() => {
    void (async () => {
      const me = await apiFetch(`${api}/auth/me`);
      if (me.status === 401) return window.location.assign("/login");
      const identity = (await me.json()) as { memberships: Array<{ organizationId: string }> };
      const org = identity.memberships[0]?.organizationId; if (!org) return;
      setOrganizationId(org);
      const [response, statusResponse] = await Promise.all([
        apiFetch(`${api}/organizations/${org}/knowledge/bases`),
        apiFetch(`${api}/organizations/${org}/ai/status`),
      ]);
      if (response.ok) { const loaded = (await response.json()) as Base[]; setBases(loaded); setBaseId(loaded[0]?.id ?? ""); }
      if (statusResponse.ok) setStatus((await statusResponse.json()) as AIStatus);
    })().catch(() => setError("تعذر تجهيز المساعد"));
  }, []);

  async function ensureConversation(): Promise<Conversation | undefined> {
    if (conversation) return conversation;
    if (!organizationId) return undefined;
    const response = await apiFetch(`${api}/organizations/${organizationId}/ai/conversations`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: "محادثة جديدة" }) });
    if (!response.ok) return undefined;
    const created = (await response.json()) as Conversation; setConversation(created); return created;
  }

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); const content = String(data.get("content") ?? "").trim(); if (!content || !organizationId) return;
    setBusy(true); setError(undefined); const current = await ensureConversation();
    if (!current) { setBusy(false); return setError("تعذر إنشاء المحادثة"); }
    setMessages((items) => [...items, { id: `temp-${Date.now()}`, role: "USER", content, citations: null }]); form.reset();
    const response = await apiFetch(`${api}/organizations/${organizationId}/ai/conversations/${current.id}/messages`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ content, knowledgeBaseId: baseId || undefined }) });
    if (response.ok) {
      const answer = (await response.json()) as Message;
      setMessages((items) => [...items, answer]);
    } else {
      setError("تعذر الحصول على إجابة");
    }
    setBusy(false);
  }

  return <div className="ai-page"><header className="ai-header"><div><span className="eyebrow">Azez Intelligence</span><h1>المساعد الذكي</h1>{status && <div className="ai-status"><span>{status.provider}</span><b>{status.model}</b><small>{status.usedToday}/{status.dailyLimit} اليوم · {status.embeddingsEnabled ? "بحث دلالي" : "بحث محلي"}</small></div>}</div><select value={baseId} onChange={(event) => setBaseId(event.target.value)}><option value="">دون قاعدة معرفة</option>{bases.map((base) => <option key={base.id} value={base.id}>{base.name}</option>)}</select></header><section className="chat-surface">{messages.length === 0 && <div className="chat-empty"><span>✦</span><h2>اسأل معرفة مؤسستك</h2><p>ستظهر الإجابات من المستندات المخزنة مع مصادرها. توضح الشارة أعلاه ما إذا كان المزود الخارجي مفعّلًا.</p></div>}{messages.map((message) => <article className={`chat-message ${message.role.toLowerCase()}`} key={message.id}><strong>{message.role === "USER" ? "أنت" : "Azez AI"}</strong><p>{message.content}</p>{message.citations && message.citations.length > 0 && <small>المصادر: {message.citations.map((citation) => citation.title).join("، ")}</small>}</article>)}{busy && <p className="thinking">جارٍ البحث في المعرفة…</p>}</section>{error && <p className="auth-error">{error}</p>}<form className="chat-input" onSubmit={send}><textarea name="content" required minLength={2} placeholder="اكتب سؤالك هنا…"/><button disabled={busy}>إرسال</button></form></div>;
}
