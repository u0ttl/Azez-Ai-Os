"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../lib/api-client";

const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/v1";
type Entitlement = { key: string; enabled: boolean; limitValue: string | null };
type Price = { amountMinor: string; currency: string; interval: string };
type Plan = { id: string; code: string; name: string; description: string | null; prices: Price[]; entitlements: Entitlement[] };
type Summary = { subscription: { status: string; provider: string; plan: { code: string; name: string } } | null; usage: Record<string, number>; limits: Record<string, string | null> };

const labels: Record<string, string> = { seats: "المقاعد", "ai.daily_requests": "طلبات AI يوميًا", "workflow.monthly_runs": "تشغيلات الأتمتة شهريًا", "storage.mb": "التخزين بالميجابايت" };

export function BillingWorkspace() {
  const [organizationId, setOrganizationId] = useState<string>();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [summary, setSummary] = useState<Summary>();
  const [error, setError] = useState<string>();

  const load = useCallback(async () => {
    const me = await apiFetch(`${api}/auth/me`);
    if (me.status === 401) return window.location.assign("/login");
    const identity = (await me.json()) as { memberships: Array<{ organizationId: string }> };
    const org = identity.memberships[0]?.organizationId; if (!org) throw new Error("لا توجد مؤسسة مرتبطة بالحساب"); setOrganizationId(org);
    const [plansResponse, summaryResponse] = await Promise.all([apiFetch(`${api}/organizations/${org}/billing/plans`), apiFetch(`${api}/organizations/${org}/billing/summary`)]);
    if (!plansResponse.ok || !summaryResponse.ok) throw new Error("تعذر تحميل بيانات الاشتراك"); setPlans((await plansResponse.json()) as Plan[]); setSummary((await summaryResponse.json()) as Summary);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial authenticated billing load
    void load().catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "حدث خطأ"));
  }, [load]);

  async function selectFree() {
    if (!organizationId) return;
    const response = await apiFetch(`${api}/organizations/${organizationId}/billing/select-plan`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ planCode: "FREE" }) });
    if (!response.ok) return setError("يتطلب تغيير الخطة صلاحية المالك أو المدير"); await load();
  }

  const usageCards = [
    ["ai.daily_requests", summary?.usage["ai.daily_requests"] ?? 0],
    ["workflow.monthly_runs", summary?.usage["workflow.monthly_runs"] ?? 0],
    ["seats", summary?.usage.seats ?? 0],
  ] as const;

  return <div className="module-content"><header className="module-header"><div><span className="eyebrow">SaaS Control</span><h1>الخطط والاستخدام</h1><p>راقب حدود المؤسسة دون رسوم أو ترقيات غير معتمدة.</p></div>{summary?.subscription && <span className="module-count">{summary.subscription.plan.name} · {summary.subscription.status}</span>}</header>{error && <p className="auth-error">{error}</p>}
    <section className="usage-grid">{usageCards.map(([key, used]) => { const raw = summary?.limits[key]; const limit = raw === null ? null : Number(raw ?? 0); const percent = limit ? Math.min(100, used / limit * 100) : 0; return <article className="usage-card" key={key}><div><span>{labels[key]}</span><strong>{used} <small>/ {limit === null ? "غير محدود" : limit}</small></strong></div><div className="usage-bar"><i style={{width:`${percent}%`}}/></div></article>; })}</section>
    <section className="plans-grid">{plans.map((plan) => { const current = summary?.subscription?.plan.code === plan.code; const price = plan.prices[0]; return <article className={current ? "plan-card current" : "plan-card"} key={plan.id}>{current && <span className="current-plan">خطتك الحالية</span>}<h2>{plan.name}</h2><p>{plan.description}</p><strong className="plan-price">{price ? Number(price.amountMinor) === 0 ? "مجاني" : `${Number(price.amountMinor)/100} ${price.currency}` : "يحدد بعد اختيار مزود الدفع"}</strong><ul>{plan.entitlements.map((item) => <li key={item.key}><span>✓</span>{labels[item.key] ?? item.key}: {item.limitValue ?? "غير محدود"}</li>)}</ul>{plan.code === "FREE" ? <button disabled={current} onClick={() => void selectFree()}>{current ? "مفعّلة" : "اختيار المجانية"}</button> : <button disabled>الدفع غير مفعّل بعد</button>}</article>; })}</section>
  </div>;
}
