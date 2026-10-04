import { Injectable } from "@nestjs/common";

export interface RenderedEmail { subject: string; text: string; html: string }

@Injectable()
export class EmailTemplateService {
  render(template: string, payload: Record<string, unknown>): RenderedEmail {
    const name = text(payload.name) || "مرحبًا";
    const url = text(payload.url) || text(payload.verificationUrl);
    if (!url || !/^https?:\/\//.test(url)) throw new Error("EMAIL_TEMPLATE_URL_INVALID");
    if (template === "verify-email") return this.message("تأكيد بريدك في Azez AI OS", name, "أكد ملكية بريدك الإلكتروني لإكمال حماية الحساب.", "تأكيد البريد", url);
    if (template === "reset-password") return this.message("استعادة كلمة مرور Azez AI OS", name, "استخدم الرابط الآمن التالي لتعيين كلمة مرور جديدة. تنتهي صلاحيته بعد 30 دقيقة.", "تعيين كلمة مرور جديدة", url);
    throw new Error("EMAIL_TEMPLATE_NOT_SUPPORTED");
  }

  private message(subject: string, name: string, description: string, action: string, url: string): RenderedEmail {
    const safeName = escapeHtml(name); const safeDescription = escapeHtml(description); const safeAction = escapeHtml(action); const safeUrl = escapeHtml(url);
    return {
      subject,
      text: `${name}\n\n${description}\n\n${action}: ${url}\n\nإذا لم تطلب هذه العملية فتجاهل الرسالة.`,
      html: `<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;max-width:560px;margin:auto;color:#171427"><h1 style="color:#6044c8">Azez AI OS</h1><p>${safeName}</p><p>${safeDescription}</p><p><a href="${safeUrl}" style="display:inline-block;background:#6f50db;color:white;padding:12px 18px;border-radius:9px;text-decoration:none">${safeAction}</a></p><p style="color:#777;font-size:12px">إذا لم تطلب هذه العملية فتجاهل الرسالة.</p></div>`,
    };
  }
}

function text(value: unknown): string { return typeof value === "string" ? value : ""; }
function escapeHtml(value: string): string { return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character] ?? character); }
