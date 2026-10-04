"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { apiFetch } from "../lib/api-client";

const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/v1";
type Base = { id: string; name: string; description: string | null; _count: { documents: number } };
type Document = { id: string; title: string; status: string; _count: { chunks: number } };

export function KnowledgeWorkspace() {
  const [organizationId, setOrganizationId] = useState<string>();
  const [bases, setBases] = useState<Base[]>([]);
  const [activeBase, setActiveBase] = useState<string>();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [error, setError] = useState<string>();

  const load = useCallback(async () => {
    const me = await apiFetch(`${api}/auth/me`);
    if (me.status === 401) return window.location.assign("/login");
    const identity = (await me.json()) as { memberships: Array<{ organizationId: string }> };
    const org = identity.memberships[0]?.organizationId;
    if (!org) throw new Error("لا توجد مؤسسة مرتبطة بالحساب");
    setOrganizationId(org);
    const response = await apiFetch(`${api}/organizations/${org}/knowledge/bases`);
    if (!response.ok) throw new Error("تعذر تحميل قواعد المعرفة");
    const loaded = (await response.json()) as Base[];
    setBases(loaded);
    setActiveBase((current) => current ?? loaded[0]?.id);
  }, []);

  const loadDocuments = useCallback(async () => {
    if (!organizationId || !activeBase) return setDocuments([]);
    const response = await apiFetch(`${api}/organizations/${organizationId}/knowledge/bases/${activeBase}/documents`);
    if (response.ok) setDocuments((await response.json()) as Document[]);
  }, [organizationId, activeBase]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial authenticated API load
    void load().catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "حدث خطأ"));
  }, [load]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load documents after base selection
    void loadDocuments();
  }, [loadDocuments]);

  async function createBase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!organizationId) return;
    const form = event.currentTarget; const data = new FormData(form);
    const response = await apiFetch(`${api}/organizations/${organizationId}/knowledge/bases`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(Object.fromEntries(data.entries())) });
    if (!response.ok) return setError("تعذر إنشاء قاعدة المعرفة");
    form.reset(); await load();
  }

  async function addDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!organizationId || !activeBase) return;
    const form = event.currentTarget; const data = new FormData(form);
    const response = await apiFetch(`${api}/organizations/${organizationId}/knowledge/bases/${activeBase}/documents/text`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(Object.fromEntries(data.entries())) });
    if (!response.ok) return setError("تعذر إضافة المستند أو أنه مكرر");
    form.reset(); await loadDocuments(); await load();
  }

  return <div className="module-content"><header className="module-header"><div><span className="eyebrow">ذاكرة المؤسسة</span><h1>قاعدة المعرفة</h1><p>حوّل النصوص الداخلية إلى معلومات قابلة للبحث والاستشهاد.</p></div><span className="module-count">{bases.length} قواعد</span></header>{error && <p className="auth-error">{error}</p>}
    <section className="knowledge-layout"><aside className="panel knowledge-bases"><h2>المجموعات</h2><form className="stack-form" onSubmit={createBase}><input name="name" required minLength={2} placeholder="اسم المجموعة"/><input name="description" required placeholder="وصف مختصر"/><button>إضافة مجموعة</button></form>{bases.map((base) => <button className={activeBase === base.id ? "base-item active" : "base-item"} onClick={() => setActiveBase(base.id)} key={base.id}><span><strong>{base.name}</strong><small>{base.description}</small></span><b>{base._count.documents}</b></button>)}</aside>
      <article className="panel knowledge-documents"><div className="panel-heading"><h2>المستندات النصية</h2><span>{documents.length}</span></div>{activeBase ? <form className="document-form" onSubmit={addDocument}><input name="title" required minLength={2} placeholder="عنوان المستند"/><textarea name="content" required minLength={20} placeholder="الصق سياسة، دليلًا، ملاحظات أو معرفة داخلية هنا…"/><button>معالجة وإضافة</button></form> : <p className="empty-state">أنشئ مجموعة أولًا.</p>}<div className="data-list">{documents.map((document) => <div className="data-row" key={document.id}><span className="company-avatar">ن</span><div><strong>{document.title}</strong><small>{document._count.chunks} مقاطع قابلة للبحث</small></div><span className="status">{document.status}</span></div>)}</div></article></section></div>;
}
