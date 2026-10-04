import { BootOverlay } from "@/components/cinematic/boot-overlay";
import { CinematicScene } from "@/components/cinematic/cinematic-scene";

const navigation = [
  { label: "نظرة عامة", href: "/" },
  { label: "العملاء", href: "/crm" },
  { label: "المشاريع", href: "/projects" },
  { label: "المعرفة", href: "/knowledge" },
  { label: "المساعد الذكي", href: "/ai" },
  { label: "سير العمل", href: "/workflows" },
  { label: "الخطط والاستخدام", href: "/billing" },
];

const metrics = [
  { label: "المهام النشطة", value: "24", change: "+12%", tone: "violet" },
  { label: "العملاء المحتملون", value: "18", change: "+5 هذا الأسبوع", tone: "blue" },
  { label: "عمليات الذكاء", value: "1,284", change: "ضمن الحد", tone: "green" },
  { label: "وقت تم توفيره", value: "32 س", change: "+8.4 س", tone: "amber" },
];

const tasks = [
  { title: "مراجعة عرض شركة النور", meta: "المبيعات · اليوم", state: "قيد المراجعة" },
  { title: "تجهيز ملخص تقدم المشروع", meta: "مشروع ألفا · غدًا", state: "يعمل عليه AI" },
  { title: "متابعة العملاء الجدد", meta: "CRM · 5 عملاء", state: "جاهز" },
];

export default function DashboardPage() {
  return (
    <main className="app-shell">
      <BootOverlay />
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">A</span><span>Azez <b>AI OS</b></span></div>
        <nav aria-label="التنقل الرئيسي">
          {navigation.map((item, index) => (
            <a className={index === 0 ? "nav-item active" : "nav-item"} href={item.href} key={item.label}>
              <span className="nav-dot" />{item.label}
            </a>
          ))}
        </nav>
        <div className="workspace-card">
          <span className="eyebrow">مساحة العمل</span>
          <strong>شركة عزيز</strong>
          <small>الخطة التجريبية</small>
        </div>
      </aside>

      <section className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">الاثنين، 13 يوليو</p>
            <h1>مرحبًا عزيز، هذه أعمالك اليوم</h1>
          </div>
          <div className="top-actions"><a className="ghost" href="/knowledge">⌕ بحث</a><a className="avatar" aria-label="الحساب" href="/billing">ع</a></div>
        </header>

        <section className="hero cinematic-hero">
          <CinematicScene variant="hero" className="cinematic-mount" />
          <div className="hero-content hero-flex">
            <div>
              <span className="ai-pill">✦ مساعد عزيز الذكي</span>
              <h2>ماذا تريد أن تنجز؟</h2>
              <p>اطلب ملخصًا، أنشئ مهمة، حلّل بيانات العملاء أو شغّل سير عمل.</p>
            </div>
            <a className="primary" href="/ai">ابدأ محادثة <span>←</span></a>
          </div>
        </section>

        <section className="metric-grid" aria-label="مؤشرات الأداء">
          {metrics.map((metric) => (
            <article className="metric-card" key={metric.label}>
              <span className={`metric-icon ${metric.tone}`} />
              <p>{metric.label}</p><strong>{metric.value}</strong><small>{metric.change}</small>
            </article>
          ))}
        </section>

        <section className="dashboard-grid">
          <article className="panel tasks-panel">
            <div className="panel-heading"><div><span className="eyebrow">مساحة التنفيذ</span><h3>الأعمال ذات الأولوية</h3></div><a className="text-button" href="/projects">عرض الكل</a></div>
            <div className="task-list">
              {tasks.map((task) => (
                <div className="task-row" key={task.title}><span className="task-check" /><div><strong>{task.title}</strong><small>{task.meta}</small></div><span className="status">{task.state}</span></div>
              ))}
            </div>
          </article>

          <article className="panel insight-panel">
            <span className="eyebrow">رؤية ذكية</span><h3>فرصة تحتاج انتباهك</h3>
            <p>ثلاثة عملاء محتملين لم تتم متابعتهم منذ أكثر من 48 ساعة.</p>
            <div className="insight-number"><strong>68%</strong><span>احتمال التحويل</span></div>
            <a className="secondary" href="/workflows">إنشاء خطة متابعة</a>
          </article>
        </section>
      </section>
    </main>
  );
}
