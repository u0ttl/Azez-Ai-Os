import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { CinematicScene } from "@/components/cinematic/cinematic-scene";

export default function LoginPage() {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand"><span className="brand-mark">A</span><strong>Azez AI OS</strong></div>
        <span className="eyebrow">مرحبًا بعودتك</span><h1>سجّل الدخول إلى أعمالك</h1>
        <p>أدر عملاءك ومشاريعك وعملياتك الذكية من مكان واحد.</p>
        <AuthForm mode="login" />
        <small><Link href="/forgot-password">نسيت كلمة المرور؟</Link> · ليس لديك حساب؟ <Link href="/register">أنشئ مساحة عمل</Link></small>
      </section>
      <aside className="auth-art cinematic">
        <CinematicScene variant="ambient" className="cinematic-mount" />
        <div className="auth-art-content"><span>✦ ذكاء منضبط،</span><strong>عمل أوضح.</strong><p>كل إجراء ذكي يبقى ضمن صلاحياتك وسجل مؤسستك.</p></div>
      </aside>
    </main>
  );
}
