"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { apiFetch } from "../lib/api-client";

const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/v1";
const leadStages = ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "WON", "LOST"] as const;
type Company = { id: string; name: string; email: string | null; phone: string | null; status: string; _count: { contacts: number; leads: number; activities: number } };
type Contact = { id: string; name: string; email: string | null; phone: string | null; jobTitle: string | null };
type Activity = { id: string; type: string; subject: string; notes: string | null; occurredAt: string; contact: { name: string } | null; lead: { title: string } | null };
type Lead = { id: string; title: string; status: string; valueMinor: string | null; currency: string; company: { id?: string; name: string } | null };
type CompanyDetails = Company & { contacts: Contact[]; activities: Activity[]; leads: Lead[] };

export function CrmWorkspace() {
  const [organizationId, setOrganizationId] = useState<string>();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selected, setSelected] = useState<CompanyDetails>();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string>();

  const load = useCallback(async () => {
    const me = await apiFetch(`${api}/auth/me`);
    if (me.status === 401) return window.location.assign("/login");
    const identity = (await me.json()) as { memberships: Array<{ organizationId: string }> };
    const org = identity.memberships[0]?.organizationId;
    if (!org) throw new Error("لا توجد مؤسسة مرتبطة بالحساب");
    setOrganizationId(org);
    const params = new URLSearchParams(); if (search) params.set("search", search); if (status) params.set("status", status);
    const [companyResponse, leadResponse] = await Promise.all([
      apiFetch(`${api}/organizations/${org}/crm/companies?${params}`),
      apiFetch(`${api}/organizations/${org}/crm/leads`),
    ]);
    if (!companyResponse.ok || !leadResponse.ok) throw new Error("تعذر تحميل بيانات CRM");
    setCompanies((await companyResponse.json()) as Company[]);
    setLeads((await leadResponse.json()) as Lead[]);
  }, [search, status]);

  const openCompany = useCallback(async (companyId: string, org = organizationId) => {
    if (!org) return;
    const response = await apiFetch(`${api}/organizations/${org}/crm/companies/${companyId}`);
    if (!response.ok) throw new Error("تعذر تحميل ملف الشركة");
    setSelected((await response.json()) as CompanyDetails);
  }, [organizationId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial and filtered CRM load
    void load().catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "حدث خطأ"));
  }, [load]);

  async function refreshSelected() { await load(); if (selected) await openCompany(selected.id); }

  async function addCompany(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!organizationId) return; const form = event.currentTarget; const data = new FormData(form);
    const response = await apiFetch(`${api}/organizations/${organizationId}/crm/companies`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(cleanForm(data)) });
    if (!response.ok) return setError("تعذر إضافة العميل"); form.reset(); await load();
  }

  async function addContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!organizationId || !selected) return; const form = event.currentTarget; const data = new FormData(form);
    const response = await apiFetch(`${api}/organizations/${organizationId}/crm/companies/${selected.id}/contacts`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(cleanForm(data)) });
    if (!response.ok) return setError("تعذر إضافة جهة الاتصال"); form.reset(); await refreshSelected();
  }

  async function addActivity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!organizationId || !selected) return; const form = event.currentTarget; const data = new FormData(form);
    const response = await apiFetch(`${api}/organizations/${organizationId}/crm/companies/${selected.id}/activities`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(cleanForm(data)) });
    if (!response.ok) return setError("تعذر حفظ النشاط"); form.reset(); await refreshSelected();
  }

  async function addLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!organizationId) return; const form = event.currentTarget; const data = new FormData(form);
    const value = String(data.get("valueMinor") ?? "");
    const body = { title: data.get("title"), companyId: data.get("companyId") || undefined, status: "NEW", valueMinor: value ? Math.round(Number(value) * 100) : undefined, currency: "USD" };
    const response = await apiFetch(`${api}/organizations/${organizationId}/crm/leads`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    if (!response.ok) return setError("تعذر إنشاء الفرصة"); form.reset(); await refreshSelected();
  }

  async function moveLead(leadId: string, nextStatus: string) {
    if (!organizationId) return;
    const response = await apiFetch(`${api}/organizations/${organizationId}/crm/leads/${leadId}/status`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: nextStatus }) });
    if (!response.ok) return setError("تعذر تحديث مرحلة الفرصة"); await refreshSelected();
  }

  return <div className="module-content">
    <header className="module-header"><div><span className="eyebrow">إدارة العلاقات</span><h1>العملاء والمبيعات</h1><p>ملف موحد للشركة وجهات الاتصال والأنشطة والفرص.</p></div><span className="module-count">{companies.length} شركة</span></header>
    {error && <p className="auth-error">{error}</p>}
    <section className="crm-toolbar panel"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث بالاسم أو البريد أو الهاتف" /><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">كل الحالات</option><option value="PROSPECT">محتمل</option><option value="ACTIVE">نشط</option><option value="INACTIVE">غير نشط</option></select></section>
    <section className="crm-layout">
      <aside className="panel crm-companies"><h2>الشركات</h2><form className="stack-form compact" onSubmit={addCompany}><input name="name" required minLength={2} placeholder="اسم الشركة" /><input name="email" type="email" placeholder="البريد الإلكتروني" dir="ltr" /><button>إضافة شركة</button></form><div className="data-list">{companies.map((company) => <button className={`company-item ${selected?.id === company.id ? "active" : ""}`} key={company.id} onClick={() => void openCompany(company.id).catch(() => setError("تعذر فتح الشركة"))}><span className="company-avatar">{company.name.slice(0, 1)}</span><span><strong>{company.name}</strong><small>{company._count.contacts} تواصل · {company._count.activities} نشاط</small></span><b>{company._count.leads}</b></button>)}</div></aside>
      <div className="crm-main">
        {!selected ? <section className="panel crm-empty"><h2>اختر شركة</h2><p>افتح ملف شركة لإدارة جهات الاتصال والملاحظات وسجل النشاط.</p></section> : <>
          <section className="panel company-profile"><div><span className="eyebrow">ملف الشركة</span><h2>{selected.name}</h2><p>{selected.email ?? selected.phone ?? "لا توجد وسيلة تواصل"}</p></div><span className="status">{selected.status}</span></section>
          <div className="crm-detail-grid">
            <section className="panel"><h2>جهات الاتصال</h2><form className="stack-form compact" onSubmit={addContact}><input name="name" required placeholder="الاسم" /><input name="jobTitle" placeholder="المسمى الوظيفي" /><input name="email" type="email" placeholder="البريد" /><button>إضافة جهة اتصال</button></form>{selected.contacts.map((contact) => <div className="contact-row" key={contact.id}><strong>{contact.name}</strong><small>{contact.jobTitle ?? contact.email ?? contact.phone ?? "دون تفاصيل"}</small></div>)}</section>
            <section className="panel"><h2>النشاط والملاحظات</h2><form className="stack-form compact" onSubmit={addActivity}><select name="type" defaultValue="NOTE"><option value="NOTE">ملاحظة</option><option value="CALL">مكالمة</option><option value="EMAIL">بريد</option><option value="MEETING">اجتماع</option><option value="TASK">متابعة</option></select><input name="subject" required placeholder="عنوان النشاط" /><textarea name="notes" placeholder="التفاصيل" /><button>حفظ النشاط</button></form>{selected.activities.map((activity) => <div className="activity-row" key={activity.id}><span>{activity.type}</span><div><strong>{activity.subject}</strong><small>{activity.notes ?? new Date(activity.occurredAt).toLocaleString("ar")}</small></div></div>)}</section>
          </div>
        </>}
      </div>
    </section>
    <section className="panel sales-panel"><div className="panel-heading"><h2>مسار الفرص</h2><span>{leads.length}</span></div><form className="lead-form" onSubmit={addLead}><input name="title" required placeholder="اسم الفرصة" /><select name="companyId" defaultValue=""><option value="">دون شركة</option>{companies.map((company) => <option value={company.id} key={company.id}>{company.name}</option>)}</select><input name="valueMinor" type="number" min="0" step="0.01" placeholder="القيمة بالدولار" /><button>إنشاء فرصة</button></form><div className="pipeline">{leadStages.map((stage) => <div className="pipeline-stage" key={stage}><div><strong>{stage}</strong><span>{leads.filter((lead) => lead.status === stage).length}</span></div>{leads.filter((lead) => lead.status === stage).map((lead) => <div className="lead-card" key={lead.id}><strong>{lead.title}</strong><small>{lead.company?.name ?? "فرصة مستقلة"}</small><select value={lead.status} onChange={(event) => void moveLead(lead.id, event.target.value)}>{leadStages.map((item) => <option value={item} key={item}>{item}</option>)}</select></div>)}</div>)}</div></section>
  </div>;
}

function cleanForm(data: FormData): Record<string, FormDataEntryValue> {
  return Object.fromEntries([...data.entries()].filter(([, value]) => String(value).trim() !== ""));
}
