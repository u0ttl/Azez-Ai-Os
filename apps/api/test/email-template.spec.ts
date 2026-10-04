import { describe, expect, it } from "vitest";
import { EmailTemplateService } from "../src/email/email-template.service.js";

describe("account email templates", () => {
  const templates = new EmailTemplateService();

  it("renders supported account links without leaking unsafe HTML", () => {
    const email = templates.render("verify-email", { name: "<script>alert(1)</script>", verificationUrl: "https://app.example.com/verify?token=abc" });
    expect(email.subject).toContain("تأكيد"); expect(email.html).not.toContain("<script>"); expect(email.html).toContain("&lt;script&gt;");
  });

  it("rejects unsupported templates and non-http links", () => {
    expect(() => templates.render("unknown", { url: "https://example.com" })).toThrow();
    expect(() => templates.render("reset-password", { url: "javascript:alert(1)" })).toThrow();
  });
});
