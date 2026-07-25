import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import nodemailer, { Transporter } from "nodemailer";
import { DatabaseService } from "../database/database.service.js";
import { EmailTemplateService } from "./email-template.service.js";

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("SMTP_HEALTH_TIMEOUT")), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

@Injectable()
export class EmailWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EmailWorkerService.name);
  private readonly transporter: Transporter | undefined;
  private readonly required = process.env.EMAIL_REQUIRED === "true";
  private timer?: NodeJS.Timeout;

  constructor(private readonly database: DatabaseService, private readonly templates: EmailTemplateService) {
    if (process.env.SMTP_HOST) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT ?? 587),
        secure: process.env.SMTP_SECURE === "true",
        auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
      });
    }
  }

  isRequired(): boolean {
    return this.required;
  }

  async ping(): Promise<"up" | "down" | "disabled"> {
    if (!this.transporter) return this.required ? "down" : "disabled";
    try {
      await withTimeout(
        this.transporter.verify(),
        Number(process.env.SMTP_HEALTH_TIMEOUT_MS ?? 5000),
      );
      return "up";
    } catch {
      return "down";
    }
  }

  async onModuleInit(): Promise<void> {
    if (!this.transporter) {
      if (this.required) this.logger.error("SMTP is required but SMTP_HOST is not configured");
      else this.logger.warn("SMTP is not configured; email outbox delivery is disabled");
      return;
    }
    await this.database.client.emailOutbox.updateMany({
      where: { status: "PROCESSING", claimedAt: { lt: new Date(Date.now() - 10 * 60 * 1000) } },
      data: { status: "PENDING", claimedAt: null },
    });
    void this.processBatch();
    this.timer = setInterval(() => void this.processBatch(), Number(process.env.EMAIL_POLL_INTERVAL_MS ?? 15_000));
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
    this.transporter?.close();
  }

  async processBatch(): Promise<number> {
    if (!this.transporter) return 0;
    const rows = await this.database.client.emailOutbox.findMany({ where: { status: "PENDING", availableAt: { lte: new Date() } }, orderBy: { createdAt: "asc" }, take: 10 });
    let delivered = 0;
    for (const row of rows) {
      const claim = await this.database.client.emailOutbox.updateMany({ where: { id: row.id, status: "PENDING" }, data: { status: "PROCESSING", claimedAt: new Date(), attempts: { increment: 1 } } });
      if (!claim.count) continue;
      try {
        const rendered = this.templates.render(row.template, row.payload as Record<string, unknown>);
        await this.transporter.sendMail({ from: process.env.EMAIL_FROM ?? "Azez AI OS <no-reply@example.com>", to: row.recipient, subject: rendered.subject, text: rendered.text, html: rendered.html });
        await this.database.client.emailOutbox.update({ where: { id: row.id }, data: { status: "SENT", sentAt: new Date(), claimedAt: null, lastError: null } });
        delivered += 1;
      } catch (error) {
        const attempts = row.attempts + 1;
        const failed = attempts >= 5;
        await this.database.client.emailOutbox.update({
          where: { id: row.id }, data: { status: failed ? "FAILED" : "PENDING", claimedAt: null, availableAt: new Date(Date.now() + Math.min(60, 2 ** attempts) * 60_000), lastError: String(error).slice(0, 1000) },
        });
        this.logger.error(`Email outbox item ${row.id} failed on attempt ${attempts}`);
      }
    }
    return delivered;
  }
}
