import type { Metadata } from "next";
import { product } from "@/lib/product";
import "./globals.css";

export const metadata: Metadata = {
  title: product.name,
  description: "نظام التشغيل الذكي لأعمالك",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang={product.locale} dir={product.direction}>
      <body>
        {children}
        <footer className="project-signature" aria-label="Project author">
          <span>Built by <strong>abdulaziz alfotaih</strong></span>
          <a href="tel:+967776776381" dir="ltr">+967776776381</a>
        </footer>
      </body>
    </html>
  );
}
