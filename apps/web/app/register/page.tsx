import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { CinematicScene } from "@/components/cinematic/cinematic-scene";

export default function RegisterPage() {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand"><span className="brand-mark">A</span><strong>Azez AI OS</strong></div>
        <span className="eyebrow">ابدأ من هنا</span><h1>أنشئ مساحة عملك</h1>
        <p>سيتم إنشاء حسابك ومؤسستك الأولى بصلاحية المالك.</p>
        <AuthForm mode="register" />
        <small>لديك حساب؟ <Link href="/login">تسجيل الدخول</Link></small>
      </section>
      <aside className="auth-art cinematic">
        <CinematicScene variant="ambient" className="cinematic-mount" />
        <div className="auth-art-content"><span>✦ نظام أعمالك،</span><strong>مدعوم بالذكاء.</strong><p>واجهة عربية، بيانات معزولة، وصلاحيات واضحة منذ اليوم الأول.</p></div>
      </aside>
    </main>
  );
}
