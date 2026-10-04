import "dotenv/config";
import { randomBytes, scrypt as nodeScrypt } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  CompanyStatus, LeadStatus, MembershipRole, MembershipStatus, PrismaClient,
  ProjectStatus, TaskPriority, TaskStatus,
} from "../generated/client/client.js";

const IDS = {
  user: "10000000-0000-4000-8000-000000000001",
  organization: "10000000-0000-4000-8000-000000000002",
  membership: "10000000-0000-4000-8000-000000000003",
  company: "10000000-0000-4000-8000-000000000004",
  contact: "10000000-0000-4000-8000-000000000005",
  lead: "10000000-0000-4000-8000-000000000006",
  project: "10000000-0000-4000-8000-000000000007",
  projectMember: "10000000-0000-4000-8000-000000000008",
  firstTask: "10000000-0000-4000-8000-000000000009",
  secondTask: "10000000-0000-4000-8000-000000000010",
  knowledgeBase: "10000000-0000-4000-8000-000000000011",
  notification: "10000000-0000-4000-8000-000000000012",
} as const;

function scrypt(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    nodeScrypt(password, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt);
  return `scrypt$16384$8$1$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}

async function main(): Promise<void> {
  if (process.env.ALLOW_DEMO_SEED !== "true") throw new Error("Set ALLOW_DEMO_SEED=true to load demo data");
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_PRODUCTION_DEMO_SEED !== "I_UNDERSTAND") {
    throw new Error("Demo seeding is blocked in production");
  }
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required");
  const password = process.env.DEMO_PASSWORD ?? "Azez-Demo-2026!";
  if (password.length < 12) throw new Error("DEMO_PASSWORD must contain at least 12 characters");
  const email = (process.env.DEMO_EMAIL ?? "demo@azez.local").trim().toLowerCase();
  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  try {
    const passwordHash = await hashPassword(password);
    await client.$transaction(async (tx) => {
      await tx.user.upsert({
        where: { email },
        update: { name: "مدير الحساب التجريبي", passwordHash, emailVerifiedAt: new Date(), status: "ACTIVE" },
        create: { id: IDS.user, email, name: "مدير الحساب التجريبي", passwordHash, emailVerifiedAt: new Date() },
      });
      const user = await tx.user.findUniqueOrThrow({ where: { email } });
      await tx.organization.upsert({
        where: { slug: "azez-demo" },
        update: { name: "شركة عزيز التجريبية" },
        create: { id: IDS.organization, name: "شركة عزيز التجريبية", slug: "azez-demo" },
      });
      const organization = await tx.organization.findUniqueOrThrow({ where: { slug: "azez-demo" } });
      await tx.membership.upsert({
        where: { organizationId_userId: { organizationId: organization.id, userId: user.id } },
        update: { role: MembershipRole.OWNER, status: MembershipStatus.ACTIVE },
        create: { id: IDS.membership, organizationId: organization.id, userId: user.id, role: MembershipRole.OWNER, status: MembershipStatus.ACTIVE },
      });
      await tx.company.upsert({
        where: { id: IDS.company },
        update: { name: "مؤسسة الأفق", status: CompanyStatus.ACTIVE },
        create: { id: IDS.company, organizationId: organization.id, name: "مؤسسة الأفق", email: "hello@example.test", phone: "+967-000-000-000", status: CompanyStatus.ACTIVE },
      });
      await tx.contact.upsert({
        where: { id: IDS.contact },
        update: { name: "أحمد علي" },
        create: { id: IDS.contact, companyId: IDS.company, name: "أحمد علي", email: "ahmed@example.test", jobTitle: "مدير العمليات" },
      });
      await tx.lead.upsert({
        where: { id: IDS.lead },
        update: { title: "تطبيق نظام إدارة العمليات", status: LeadStatus.QUALIFIED },
        create: { id: IDS.lead, organizationId: organization.id, companyId: IDS.company, title: "تطبيق نظام إدارة العمليات", status: LeadStatus.QUALIFIED, valueMinor: 2500000n, currency: "USD", ownerUserId: user.id },
      });
      await tx.project.upsert({
        where: { id: IDS.project },
        update: { name: "إطلاق بوابة العملاء", status: ProjectStatus.ACTIVE },
        create: { id: IDS.project, organizationId: organization.id, name: "إطلاق بوابة العملاء", description: "مشروع تجريبي يعرض إدارة المهام والتعاون.", status: ProjectStatus.ACTIVE },
      });
      await tx.projectMember.upsert({
        where: { projectId_userId: { projectId: IDS.project, userId: user.id } },
        update: { role: "OWNER" },
        create: { id: IDS.projectMember, projectId: IDS.project, userId: user.id, role: "OWNER" },
      });
      await tx.task.upsert({
        where: { id: IDS.firstTask },
        update: { title: "مراجعة متطلبات البوابة", status: TaskStatus.DONE },
        create: { id: IDS.firstTask, projectId: IDS.project, title: "مراجعة متطلبات البوابة", status: TaskStatus.DONE, priority: TaskPriority.HIGH, assigneeUserId: user.id, position: 0, completedAt: new Date() },
      });
      await tx.task.upsert({
        where: { id: IDS.secondTask },
        update: { title: "اعتماد نموذج الواجهة", status: TaskStatus.IN_PROGRESS },
        create: { id: IDS.secondTask, projectId: IDS.project, title: "اعتماد نموذج الواجهة", status: TaskStatus.IN_PROGRESS, priority: TaskPriority.MEDIUM, assigneeUserId: user.id, position: 1 },
      });
      await tx.knowledgeBase.upsert({
        where: { id: IDS.knowledgeBase },
        update: { name: "دليل الشركة" },
        create: { id: IDS.knowledgeBase, organizationId: organization.id, name: "دليل الشركة", description: "مساحة تجريبية لسياسات وإجراءات الشركة." },
      });
      await tx.notification.upsert({
        where: { id: IDS.notification },
        update: { title: "مرحبًا بك في Azez AI OS" },
        create: { id: IDS.notification, organizationId: organization.id, userId: user.id, type: "WELCOME", title: "مرحبًا بك في Azez AI OS", body: "تم تجهيز الحساب التجريبي ببيانات تساعدك على استكشاف المنصة.", dedupeKey: "demo-welcome" },
      });
    });
    process.stdout.write(`Demo data ready for ${email}\n`);
  } finally {
    await client.$disconnect();
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : "Demo seed failed"}\n`);
  process.exitCode = 1;
});
