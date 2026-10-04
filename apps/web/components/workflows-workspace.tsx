"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { apiFetch } from "../lib/api-client";

const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/v1";
type Workflow = { id: string; name: string; description: string | null; status: string; _count: { steps: number; runs: number } };
type Run = { id: string; status: string; startedAt: string; workflow: { name: string }; stepRuns: unknown[] };
type Approval = { id: string; summary: string; run: { workflow: { name: string } }; step: { name: string } };

export function WorkflowsWorkspace() {
  const [organizationId, setOrganizationId] = useState<string>();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [selectedId, setSelectedId] = useState<string>();
  const [actionType, setActionType] = useState("CREATE_LEAD");
  const [error, setError] = useState<string>();

  const load = useCallback(async () => {
    const me = await apiFetch(`${api}/auth/me`);
    if (me.status === 401) return window.location.assign("/login");
    const identity = (await me.json()) as { memberships: Array<{ organizationId: string }> };
    const org = identity.memberships[0]?.organizationId;
    if (!org) throw new Error("لا توجد مؤسسة مرتبطة بالحساب");
    setOrganizationId(org);
    const [workflowResponse, runResponse, approvalResponse] = await Promise.all([
      apiFetch(`${api}/organizations/${org}/workflows`),
      apiFetch(`${api}/organizations/${org}/workflows/runs/history`),
      apiFetch(`${api}/organizations/${org}/workflows/approvals/pending`),
    ]);
    if (!workflowResponse.ok || !runResponse.ok || !approvalResponse.ok) throw new Error("تعذر تحميل سير العمل");
    const loaded = (await workflowResponse.json()) as Workflow[];
    setWorkflows(loaded); setRuns((await runResponse.json()) as Run[]); setApprovals((await approvalResponse.json()) as Approval[]);
    setSelectedId((current) => current ?? loaded.find((workflow) => workflow.status === "DRAFT")?.id);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial authenticated API load
    void load().catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "حدث خطأ"));
  }, [load]);

  async function createWorkflow(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!organizationId) return; const form = event.currentTarget; const data = new FormData(form);
    const response = await apiFetch(`${api}/organizations/${organizationId}/workflows`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(Object.fromEntries(data.entries())) });
    if (!response.ok) return setError("تعذر إنشاء سير العمل"); const created = (await response.json()) as Workflow; setSelectedId(created.id); form.reset(); await load();
  }

  async function addStep(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!organizationId || !selectedId) return; const form = event.currentTarget; const data = new FormData(form); const value = String(data.get("value") ?? ""); const projectId = String(data.get("projectId") ?? "");
    const selected = workflows.find((workflow) => workflow.id === selectedId); const config = actionType === "HUMAN_APPROVAL" ? { summary: value } : actionType === "CREATE_TASK" ? { title: value, projectId } : { title: value };
    const response = await apiFetch(`${api}/organizations/${organizationId}/workflows/${selectedId}/steps`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: String(data.get("name")), position: selected?._count.steps ?? 0, actionType, config }) });
    if (!response.ok) return setError("تعذر إضافة الخطوة؛ تحقق من ترتيبها وإعداداتها"); form.reset(); await load();
  }

  async function changeStatus(workflowId: string, status: "ACTIVE" | "PAUSED") {
    if (!organizationId) return; const response = await apiFetch(`${api}/organizations/${organizationId}/workflows/${workflowId}/status`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status }) });
    if (!response.ok) return setError("يجب إضافة خطوة واحدة على الأقل قبل التفعيل"); await load();
  }

  async function run(workflowId: string) {
    if (!organizationId) return; const response = await apiFetch(`${api}/organizations/${organizationId}/workflows/${workflowId}/runs`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ input: {} }) });
    if (!response.ok) return setError("تعذر تشغيل سير العمل"); await load();
  }

  async function decide(approvalId: string, decision: "APPROVED" | "REJECTED") {
    if (!organizationId) return; await apiFetch(`${api}/organizations/${organizationId}/workflows/approvals/${approvalId}/decision`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ decision }) }); await load();
  }

  return <div className="module-content"><header className="module-header"><div><span className="eyebrow">أتمتة منضبطة</span><h1>سير العمل</h1><p>نفّذ إجراءات مسموحة مع سجل كامل وموافقة بشرية عند الحاجة.</p></div><span className="module-count">{workflows.length} عمليات</span></header>{error && <p className="auth-error">{error}</p>}
    <section className="workflow-layout"><article className="panel"><h2>إنشاء عملية</h2><form className="stack-form" onSubmit={createWorkflow}><input name="name" required minLength={2} placeholder="اسم سير العمل"/><input name="description" placeholder="وصف الغرض"/><button>إنشاء مسودة</button></form><div className="workflow-list">{workflows.map((workflow) => <button className={selectedId === workflow.id ? "workflow-item active" : "workflow-item"} onClick={() => setSelectedId(workflow.id)} key={workflow.id}><span><strong>{workflow.name}</strong><small>{workflow._count.steps} خطوات · {workflow._count.runs} تشغيلات</small></span><b>{workflow.status}</b></button>)}</div></article>
      <article className="panel"><div className="panel-heading"><h2>محرر الخطوات</h2><span>{workflows.find((item) => item.id === selectedId)?.status ?? "—"}</span></div>{selectedId ? <><form className="step-form" onSubmit={addStep}><input name="name" required placeholder="اسم الخطوة"/><select value={actionType} onChange={(event) => setActionType(event.target.value)}><option value="CREATE_LEAD">إنشاء فرصة بيع</option><option value="CREATE_TASK">إنشاء مهمة</option><option value="HUMAN_APPROVAL">طلب موافقة بشرية</option></select>{actionType === "CREATE_TASK" && <input name="projectId" required placeholder="معرّف المشروع" dir="ltr"/>}<input name="value" required placeholder={actionType === "HUMAN_APPROVAL" ? "ملخص طلب الموافقة" : "عنوان السجل الجديد"}/><button>إضافة خطوة</button></form><div className="workflow-actions">{workflows.find((item) => item.id === selectedId)?.status === "DRAFT" ? <button onClick={() => void changeStatus(selectedId,"ACTIVE")}>تفعيل</button> : <><button onClick={() => void run(selectedId)}>تشغيل الآن</button><button className="muted-action" onClick={() => void changeStatus(selectedId,"PAUSED")}>إيقاف مؤقت</button></>}</div></> : <p className="empty-state">أنشئ مسودة أو اختر واحدة.</p>}</article></section>
    <section className="workflow-bottom"><article className="panel"><h2>الموافقات المعلقة</h2>{approvals.length === 0 ? <p className="empty-state">لا توجد موافقات معلقة.</p> : approvals.map((approval) => <div className="approval-row" key={approval.id}><div><strong>{approval.summary}</strong><small>{approval.run.workflow.name} · {approval.step.name}</small></div><button onClick={() => void decide(approval.id,"APPROVED")}>موافقة</button><button className="reject" onClick={() => void decide(approval.id,"REJECTED")}>رفض</button></div>)}</article><article className="panel"><h2>آخر التشغيلات</h2>{runs.slice(0,8).map((run) => <div className="run-row" key={run.id}><div><strong>{run.workflow.name}</strong><small>{new Date(run.startedAt).toLocaleString("ar")}</small></div><span className={`run-status ${run.status.toLowerCase()}`}>{run.status}</span></div>)}</article></section></div>;
}
