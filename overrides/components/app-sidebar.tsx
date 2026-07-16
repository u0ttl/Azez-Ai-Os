import Link from "next/link";

const items = [
  ["نظرة عامة", "/"],
  ["العملاء", "/crm"],
  ["المشاريع", "/projects"],
  ["المعرفة", "/knowledge"],
  ["المساعد الذكي", "/ai"],
  ["سير العمل", "/workflows"],
  ["الطرفية", "/terminal"],
  ["قاعدة البيانات", "/database"],
  ["التحليلات", "/analytics"],
  ["مساحة الكود", "/code"],
  ["الإعدادات", "/settings"],
  ["الخطط والاستخدام", "/billing"],
  ["الإشعارات", "/notifications"],
  ["الأمان والجلسات", "/security"],
] as const;

export function AppSidebar({ active }: { active: "crm" | "projects" | "knowledge" | "ai" | "workflows" | "terminal" | "database" | "analytics" | "code" | "settings" | "billing" | "notifications" | "security" }) {
  return (
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">A</span><span>Azez <b>AI OS</b></span></div>
      <nav aria-label="التنقل الرئيسي">
        {items.map(([label, href]) => (
          <Link className={href === `/${active}` ? "nav-item active" : "nav-item"} href={href} key={label}>
            <span className="nav-dot" />{label}
          </Link>
        ))}
      </nav>
      <div className="workspace-card"><span className="eyebrow">مساحة العمل</span><strong>مؤسستك</strong><small>بيانات حقيقية بعد الدخول</small></div>
    </aside>
  );
}
