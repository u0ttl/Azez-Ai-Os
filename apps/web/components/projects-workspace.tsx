"use client";

import { DragEvent, FormEvent, useCallback, useEffect, useState } from "react";
import { apiFetch } from "../lib/api-client";

const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/v1";
const taskStages = ["TODO", "IN_PROGRESS", "REVIEW", "DONE", "BLOCKED"] as const;
const stageLabels: Record<string, string> = { TODO: "للعمل", IN_PROGRESS: "قيد التنفيذ", REVIEW: "مراجعة", DONE: "مكتملة", BLOCKED: "متوقفة" };
type Project = { id: string; name: string; description: string | null; status: string; dueAt: string | null; _count: { tasks: number; members: number } };
type User = { id: string; name: string; email: string };
type Assignee = { role: string; user: User };
type Task = { id: string; title: string; description: string | null; status: string; priority: string; dueAt: string | null; assignee: User | null; _count: { comments: number } };
type ProjectDetail = Project & { tasks: Task[]; members: Array<{ id: string; role: string; user: User }> };
type Comment = { id: string; content: string; createdAt: string; author: { id: string; name: string } };
type Attachment = { id: string; createdAt: string; file: { id: string; fileName: string; mimeType: string; sizeBytes: string; uploader: { id: string; name: string } } };

export function ProjectsWorkspace() {
  const [organizationId, setOrganizationId] = useState<string>();
  const [projects, setProjects] = useState<Project[]>([]);
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [selected, setSelected] = useState<ProjectDetail>();
  const [activeTask, setActiveTask] = useState<Task>();
  const [comments, setComments] = useState<Comment[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string>();

  const load = useCallback(async () => {
    const me = await apiFetch(`${api}/auth/me`); if (me.status === 401) return window.location.assign("/login");
    const identity = (await me.json()) as { memberships: Array<{ organizationId: string }> }; const org = identity.memberships[0]?.organizationId;
    if (!org) throw new Error("لا توجد مؤسسة مرتبطة بالحساب"); setOrganizationId(org);
    const params = new URLSearchParams(); if (search) params.set("search", search); if (status) params.set("status", status);
    const [projectsResponse, assigneesResponse] = await Promise.all([apiFetch(`${api}/organizations/${org}/projects?${params}`), apiFetch(`${api}/organizations/${org}/projects/available-assignees`)]);
    if (!projectsResponse.ok || !assigneesResponse.ok) throw new Error("تعذر تحميل المشاريع");
    setProjects((await projectsResponse.json()) as Project[]); setAssignees((await assigneesResponse.json()) as Assignee[]);
  }, [search, status]);

  const openProject = useCallback(async (projectId: string, org = organizationId) => {
    if (!org) return; const response = await apiFetch(`${api}/organizations/${org}/projects/${projectId}`);
    if (!response.ok) throw new Error("تعذر تحميل تفاصيل المشروع"); setSelected((await response.json()) as ProjectDetail);
  }, [organizationId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial and filtered projects load
    void load().catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "حدث خطأ"));
  }, [load]);

  async function refreshProject() { await load(); if (selected) await openProject(selected.id); }

  async function addProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!organizationId) return; const form = event.currentTarget; const data = new FormData(form);
    const response = await apiFetch(`${api}/organizations/${organizationId}/projects`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(cleanForm(data)) });
    if (!response.ok) return setError("تعذر إنشاء المشروع"); const project = await response.json() as Project; form.reset(); await load(); await openProject(project.id);
  }

  async function addTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!organizationId || !selected) return; const form = event.currentTarget; const data = new FormData(form);
    const response = await apiFetch(`${api}/organizations/${organizationId}/projects/${selected.id}/tasks`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(cleanForm(data)) });
    if (!response.ok) return setError("تعذر إنشاء المهمة"); form.reset(); await refreshProject();
  }

  async function moveTask(taskId: string, nextStatus: string) {
    if (!organizationId || !selected) return;
    const response = await apiFetch(`${api}/organizations/${organizationId}/projects/${selected.id}/tasks/${taskId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: nextStatus }) });
    if (!response.ok) return setError("تعذر نقل المهمة"); await refreshProject();
  }

  async function openComments(task: Task) {
    if (!organizationId || !selected) return; setActiveTask(task);
    const [commentsResponse, attachmentsResponse] = await Promise.all([
      apiFetch(`${api}/organizations/${organizationId}/projects/${selected.id}/tasks/${task.id}/comments`),
      apiFetch(`${api}/organizations/${organizationId}/projects/${selected.id}/tasks/${task.id}/attachments`),
    ]);
    if (!commentsResponse.ok || !attachmentsResponse.ok) return setError("تعذر تحميل تفاصيل المهمة");
    setComments((await commentsResponse.json()) as Comment[]); setAttachments((await attachmentsResponse.json()) as Attachment[]);
  }

  async function addComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!organizationId || !selected || !activeTask) return; const form = event.currentTarget; const data = new FormData(form);
    const response = await apiFetch(`${api}/organizations/${organizationId}/projects/${selected.id}/tasks/${activeTask.id}/comments`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ content: data.get("content") }) });
    if (!response.ok) return setError("تعذر إضافة التعليق"); form.reset(); await openComments(activeTask); await refreshProject();
  }

  async function addMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!organizationId || !selected) return; const form = event.currentTarget; const data = new FormData(form);
    const response = await apiFetch(`${api}/organizations/${organizationId}/projects/${selected.id}/members`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(Object.fromEntries(data.entries())) });
    if (!response.ok) return setError("تعذر إضافة العضو"); form.reset(); await refreshProject();
  }

  async function uploadAttachment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!organizationId || !selected || !activeTask) return; const form = event.currentTarget; const data = new FormData(form); const file = data.get("file");
    if (!(file instanceof File) || !file.size) return setError("اختر ملفًا أولًا");
    if (file.size > 10 * 1024 * 1024) return setError("الحد الأقصى للملف 10 ميجابايت");
    const response = await apiFetch(`${api}/organizations/${organizationId}/projects/${selected.id}/tasks/${activeTask.id}/attachments`, { method: "POST", body: data });
    if (!response.ok) { const body = await response.json() as { code?: string }; return setError(body.code ?? "تعذر رفع الملف"); }
    form.reset(); await openComments(activeTask);
  }

  async function downloadAttachment(attachmentId: string) {
    if (!organizationId || !selected || !activeTask) return;
    const response = await apiFetch(`${api}/organizations/${organizationId}/projects/${selected.id}/tasks/${activeTask.id}/attachments/${attachmentId}/download`);
    if (!response.ok) return setError("تعذر إنشاء رابط التنزيل"); const body = await response.json() as { url: string }; window.location.assign(body.url);
  }

  async function deleteAttachment(attachmentId: string) {
    if (!organizationId || !selected || !activeTask) return;
    const response = await apiFetch(`${api}/organizations/${organizationId}/projects/${selected.id}/tasks/${activeTask.id}/attachments/${attachmentId}`, { method: "DELETE" });
    if (!response.ok) return setError("تعذر حذف المرفق"); await openComments(activeTask);
  }

  function dragStart(event: DragEvent, taskId: string) { event.dataTransfer.setData("text/task-id", taskId); event.dataTransfer.effectAllowed = "move"; }
  function drop(event: DragEvent, nextStatus: string) { event.preventDefault(); const taskId = event.dataTransfer.getData("text/task-id"); if (taskId) void moveTask(taskId, nextStatus); }

  return <div className="module-content">
    <header className="module-header"><div><span className="eyebrow">مساحة التنفيذ</span><h1>المشاريع والمهام</h1><p>خطط، عيّن، اسحب المهام بين المراحل وناقش التنفيذ.</p></div><span className="module-count">{projects.length} مشروع</span></header>
    {error && <p className="auth-error">{error}</p>}
    <section className="project-toolbar panel"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث في المشاريع" /><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">كل الحالات</option><option value="PLANNING">تخطيط</option><option value="ACTIVE">نشط</option><option value="ON_HOLD">معلّق</option><option value="COMPLETED">مكتمل</option></select></section>
    <form className="create-project" onSubmit={addProject}><input name="name" required minLength={2} placeholder="اسم المشروع الجديد" /><input name="description" placeholder="وصف مختصر" /><select name="status" defaultValue="PLANNING"><option value="PLANNING">تخطيط</option><option value="ACTIVE">نشط</option></select><button>إنشاء مشروع</button></form>
    <section className="project-selector">{projects.map((project) => <button className={`project-card ${selected?.id === project.id ? "selected" : ""}`} key={project.id} onClick={() => void openProject(project.id).catch(() => setError("تعذر فتح المشروع"))}><span className={`project-state ${project.status.toLowerCase()}`}>{project.status}</span><h2>{project.name}</h2><p>{project.description ?? "لا يوجد وصف"}</p><footer><span>{project._count.tasks} مهام</span><span>{project._count.members} أعضاء</span></footer></button>)}</section>
    {!selected ? <section className="panel empty-state">اختر مشروعًا لفتح لوحة العمل.</section> : <>
      <section className="project-detail-head panel"><div><span className="eyebrow">المشروع المفتوح</span><h2>{selected.name}</h2><p>{selected.description ?? "دون وصف"}</p></div><form onSubmit={addMember}><select name="userId" required defaultValue=""><option value="" disabled>إضافة عضو</option>{assignees.filter((item) => !selected.members.some((member) => member.user.id === item.user.id)).map((item) => <option value={item.user.id} key={item.user.id}>{item.user.name}</option>)}</select><input type="hidden" name="role" value="MEMBER" /><button>إضافة</button></form></section>
      <form className="task-create panel" onSubmit={addTask}><input name="title" required minLength={2} placeholder="عنوان المهمة" /><select name="priority" defaultValue="MEDIUM"><option value="LOW">منخفضة</option><option value="MEDIUM">متوسطة</option><option value="HIGH">عالية</option><option value="URGENT">عاجلة</option></select><select name="assigneeUserId" defaultValue=""><option value="">دون مسؤول</option>{assignees.map((item) => <option value={item.user.id} key={item.user.id}>{item.user.name}</option>)}</select><input name="dueAt" type="date" /><button>إضافة مهمة</button></form>
      <section className="kanban-board">{taskStages.map((stage) => <div className={`kanban-column ${stage.toLowerCase()}`} key={stage} onDragOver={(event) => event.preventDefault()} onDrop={(event) => drop(event, stage)}><header><strong>{stageLabels[stage]}</strong><span>{selected.tasks.filter((task) => task.status === stage).length}</span></header>{selected.tasks.filter((task) => task.status === stage).map((task) => <article className="task-card" draggable onDragStart={(event) => dragStart(event, task.id)} key={task.id}><div><span className={`priority ${task.priority.toLowerCase()}`}>{task.priority}</span><button onClick={() => void openComments(task)}>{task._count.comments} تعليق</button></div><h3>{task.title}</h3><p>{task.description ?? "دون وصف"}</p><footer><small>{task.assignee?.name ?? "غير معيّنة"}</small><select value={task.status} onChange={(event) => void moveTask(task.id, event.target.value)}>{taskStages.map((item) => <option key={item} value={item}>{stageLabels[item]}</option>)}</select></footer></article>)}</div>)}</section>
      {activeTask && <section className="comments-drawer panel"><div className="panel-heading"><div><span className="eyebrow">تفاصيل المهمة</span><h2>{activeTask.title}</h2></div><button className="text-button" onClick={() => setActiveTask(undefined)}>إغلاق</button></div><div className="task-detail-grid"><div><h3>النقاش</h3><div className="comments-list">{comments.length ? comments.map((comment) => <div className="comment" key={comment.id}><strong>{comment.author.name}</strong><p>{comment.content}</p><small>{new Date(comment.createdAt).toLocaleString("ar")}</small></div>) : <p className="empty-state">لا توجد تعليقات بعد.</p>}</div><form className="comment-form" onSubmit={addComment}><textarea name="content" required maxLength={4000} placeholder="اكتب تحديثًا أو سؤالًا حول المهمة" /><button>إضافة تعليق</button></form></div><div><h3>المرفقات الآمنة</h3><form className="attachment-form" onSubmit={uploadAttachment}><input name="file" type="file" required accept=".pdf,.docx,.txt,.png,.jpg,.jpeg" /><button>رفع الملف</button><small>PDF وWord والنصوص والصور، بحد أقصى 10MB.</small></form><div className="attachment-list">{attachments.map((attachment) => <div className="attachment-row" key={attachment.id}><div><strong>{attachment.file.fileName}</strong><small>{formatBytes(Number(attachment.file.sizeBytes))} · {attachment.file.uploader.name}</small></div><span><button onClick={() => void downloadAttachment(attachment.id)}>تنزيل</button><button className="delete-file" onClick={() => void deleteAttachment(attachment.id)}>حذف</button></span></div>)}</div></div></div></section>}
    </>}
  </div>;
}

function cleanForm(data: FormData): Record<string, FormDataEntryValue> {
  return Object.fromEntries([...data.entries()].filter(([, value]) => String(value).trim() !== ""));
}

function formatBytes(value: number): string { return value < 1024 * 1024 ? `${Math.ceil(value / 1024)} KB` : `${(value / 1024 / 1024).toFixed(1)} MB`; }
