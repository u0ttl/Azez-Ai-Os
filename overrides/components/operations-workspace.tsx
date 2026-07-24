"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { apiBase, apiFetch } from "@/lib/api-client";
import { formatJsonInput, parseOperatorCommand } from "@/lib/operations";

type Mode = "terminal" | "database" | "analytics" | "code" | "settings";
type Health = { status: "ok"; service: string; version: string; uptimeSeconds: number; timestamp: string };
type Readiness = {
  status: "ready" | "not_ready";
  checks?: {
    database?: { status: "up" | "down"; latencyMs: number };
    redis?: { status: "up" | "down" | "disabled"; required: boolean; latencyMs: number };
    malwareScanner?: { status: "up" | "down" | "disabled"; required: boolean; latencyMs: number };
  };
  timestamp?: string;
};
type Version = { service: string; version: string; commit: string; branch?: string | null; builtAt: string | null };
type Identity = { userId: string; name?: string; email?: string; emailVerified?: boolean };
type Organization = { id: string; name: string; slug: string; locale: string };
type Snapshot = {
  health?: Health;
  ready?: Readiness;
  version?: Version;
  identity?: Identity;
  organizations: Organization[];
  loading: boolean;
  error?: string;
};

const DEFAULT_CODE = '{\n  "project": "AZEZ AI OS",\n  "status": "launch-hardening"\n}';
const titles: Record<Mode, string> = {
  terminal: "الطرفية الآمنة",
  database: "جاهزية قاعدة البيانات",
  analytics: "تحليلات النظام",
  code: "مساحة الكود",
  settings: "الإعدادات",
};

async function readJson<T>(response: Response): Promise<T | undefined> {
  try {
    return (await response.json()) as T;
  } catch {
    return undefined;
  }
}

function statusLabel(value: string | undefined): string {
  if (value === "up" || value === "ok" || value === "ready") return "متصل";
  if (value === "disabled") return "اختياري/معطل";
  if (!value) return "غير معروف";
  return "غير جاهز";
}

export function OperationsWorkspace({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<Snapshot>({ organizations: [], loading: true });
  const [lines, setLines] = useState([
    "AZEZ AI OS Operator Terminal v0.12.0",
    "اكتب help لعرض الأوامر.",
  ]);
  const [code, setCode] = useState(() => {
    if (typeof window === "undefined" || mode !== "code") return DEFAULT_CODE;
    return window.localStorage.getItem("azez-code-scratchpad") ?? DEFAULT_CODE;
  });
  const [message, setMessage] = useState("");

  const refresh = useCallback(async () => {
    setSnapshot((current) => {
      const next: Snapshot = { ...current, loading: true };
      delete next.error;
      return next;
    });
    try {
      const [healthResponse, readyResponse, versionResponse, meResponse] = await Promise.all([
        fetch(`${apiBase}/health`, { cache: "no-store" }),
        fetch(`${apiBase}/health/ready`, { cache: "no-store" }),
        fetch(`${apiBase}/health/version`, { cache: "no-store" }),
        apiFetch(`${apiBase}/auth/me`),
      ]);
      const health = await readJson<Health>(healthResponse);
      const ready = await readJson<Readiness>(readyResponse);
      const version = await readJson<Version>(versionResponse);
      const identity = meResponse.ok ? await readJson<Identity>(meResponse) : undefined;
      let organizations: Organization[] = [];
      if (identity) {
        const response = await apiFetch(`${apiBase}/organizations`);
        if (response.ok) organizations = (await readJson<Organization[]>(response)) ?? [];
      }
      setSnapshot({
        ...(health ? { health } : {}),
        ...(ready ? { ready } : {}),
        ...(version ? { version } : {}),
        ...(identity ? { identity } : {}),
        organizations,
        loading: false,
        ...(!healthResponse.ok ? { error: "API غير متاح" } : {}),
      });
    } catch {
      setSnapshot({ organizations: [], loading: false, error: "تعذر الاتصال بخدمات AZEZ AI OS" });
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  const uptime = useMemo(() => {
    const seconds = snapshot.health?.uptimeSeconds;
    if (seconds === undefined) return "—";
    return `${Math.floor(seconds / 3600)}س ${Math.floor((seconds % 3600) / 60)}د`;
  }, [snapshot.health?.uptimeSeconds]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const command = String(form.get("command") ?? "").trim();
    if (!command) return;
    event.currentTarget.reset();
    const action = parseOperatorCommand(command);
    if (action.type === "clear") {
      setLines([]);
      return;
    }
    if (action.type === "navigate") {
      setLines((current) => [...current, `$ ${command}`, action.message]);
      router.push(action.path);
      return;
    }
    const output = action.lines.map((line) => {
      if (line === "__FETCH_HEALTH__") return `API: ${snapshot.health?.status ?? "unavailable"} · ${uptime}`;
      if (line === "__FETCH_READY__") return `Readiness: ${snapshot.ready?.status ?? "unknown"}`;
      if (line === "__FETCH_VERSION__") return `Version: ${snapshot.version?.version ?? snapshot.health?.version ?? "unknown"}`;
      return line;
    });
    setLines((current) => [...current, `$ ${command}`, ...output]);
  }

  return (
    <section className="module-content operations-workspace">
      <header className="module-header">
        <div>
          <span className="eyebrow">AZEZ AI OS 0.12.0</span>
          <h1>{titles[mode]}</h1>
          <p>بيانات تشغيل حية وليست قيمًا تجريبية.</p>
        </div>
        <button className="secondary" disabled={snapshot.loading} onClick={() => void refresh()} type="button">
          {snapshot.loading ? "جارٍ الفحص" : "تحديث"}
        </button>
      </header>
      {snapshot.error && <p className="auth-error">{snapshot.error}</p>}

      {mode === "terminal" && (
        <section className="panel operator-terminal">
          <div className="operator-terminal-output" dir="ltr">
            {lines.map((line, index) => <p key={`${line}-${index}`}>{line}</p>)}
          </div>
          <form onSubmit={submit}>
            <input aria-label="أمر الطرفية" autoComplete="off" name="command" placeholder="help" />
            <button type="submit">تنفيذ</button>
          </form>
        </section>
      )}

      {mode === "database" && (
        <section className="dashboard-grid">
          <article className="panel"><h2>PostgreSQL</h2><strong>{statusLabel(snapshot.ready?.checks?.database?.status)}</strong><p>{snapshot.ready?.checks?.database?.latencyMs ?? "—"} ms</p></article>
          <article className="panel"><h2>Redis</h2><strong>{statusLabel(snapshot.ready?.checks?.redis?.status)}</strong><p>{snapshot.ready?.checks?.redis?.required ? "مطلوب" : "اختياري"}</p></article>
          <article className="panel"><h2>فاحص الملفات</h2><strong>{statusLabel(snapshot.ready?.checks?.malwareScanner?.status)}</strong></article>
          <article className="panel"><h2>الجاهزية</h2><strong>{statusLabel(snapshot.ready?.status)}</strong></article>
        </section>
      )}

      {mode === "analytics" && (
        <section className="dashboard-grid">
          <article className="panel"><h2>API</h2><strong>{statusLabel(snapshot.health?.status)}</strong></article>
          <article className="panel"><h2>الإصدار</h2><strong>{snapshot.version?.version ?? snapshot.health?.version ?? "—"}</strong></article>
          <article className="panel"><h2>Commit</h2><strong>{snapshot.version?.commit ?? "—"}</strong></article>
          <article className="panel"><h2>مدة التشغيل</h2><strong>{uptime}</strong></article>
        </section>
      )}

      {mode === "code" && (
        <section className="panel">
          <div className="workspace-actions">
            <button onClick={() => { window.localStorage.setItem("azez-code-scratchpad", code); setMessage("تم الحفظ محليًا"); }} type="button">حفظ محلي</button>
            <button className="secondary" onClick={() => { try { setCode(formatJsonInput(code)); setMessage("تم تنسيق JSON"); } catch { setMessage("JSON غير صالح"); } }} type="button">تنسيق JSON</button>
          </div>
          <textarea dir="ltr" onChange={(event) => setCode(event.target.value)} value={code} />
          <small>{message || "لا يرسل المحرر محتواه للخادم."}</small>
        </section>
      )}

      {mode === "settings" && (
        <section className="dashboard-grid">
          <article className="panel"><h2>الحساب</h2>{snapshot.identity ? <><p>{snapshot.identity.name ?? snapshot.identity.userId}</p><p>{snapshot.identity.email ?? "—"}</p></> : <p><Link href="/login">تسجيل الدخول</Link> لإدارة الحساب.</p>}</article>
          <article className="panel"><h2>المؤسسات</h2>{snapshot.organizations.length ? snapshot.organizations.map((organization) => <p key={organization.id}>{organization.name} · {organization.locale}</p>) : <p>لا توجد مؤسسة في الجلسة الحالية.</p>}</article>
          <article className="panel"><h2>إدارة النظام</h2><p><Link href="/security">الأمان والجلسات</Link></p><p><Link href="/billing">الخطط والاستخدام</Link></p><p><Link href="/notifications">الإشعارات</Link></p></article>
        </section>
      )}
    </section>
  );
}
