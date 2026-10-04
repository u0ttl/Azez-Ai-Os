import { BadRequestException, Injectable } from "@nestjs/common";
import { DatabaseService } from "../database/database.service.js";
import { EntitlementsService, FREE_PLAN_ID } from "./entitlements.service.js";

@Injectable()
export class BillingService {
  constructor(private readonly database: DatabaseService, private readonly entitlements: EntitlementsService) {}

  async plans() {
    const plans = await this.database.client.plan.findMany({
      where: { status: "ACTIVE" }, include: { prices: { where: { active: true } }, entitlements: true }, orderBy: { createdAt: "asc" },
    });
    return plans.map((plan: { prices: Array<{ amountMinor: bigint; [key: string]: unknown }>; entitlements: Array<{ limitValue: bigint | null; [key: string]: unknown }>; [key: string]: unknown }) => ({
      ...plan,
      prices: plan.prices.map((price) => ({ ...price, amountMinor: price.amountMinor.toString() })),
      entitlements: plan.entitlements.map((item) => ({ ...item, limitValue: item.limitValue?.toString() ?? null })),
    }));
  }

  async summary(organizationId: string) {
    await this.entitlements.ensureSubscription(organizationId);
    const subscription = await this.database.client.subscription.findFirst({
      where: { organizationId, status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] } },
      include: { plan: { include: { entitlements: true, prices: { where: { active: true } } } } },
      orderBy: { createdAt: "desc" },
    });
    const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
    const monthStart = new Date(dayStart.getFullYear(), dayStart.getMonth(), 1);
    const [aiRequests, workflowRuns, seats] = await Promise.all([
      this.database.client.aIUsage.count({ where: { organizationId, createdAt: { gte: dayStart } } }),
      this.database.client.workflowRun.count({ where: { organizationId, startedAt: { gte: monthStart } } }),
      this.database.client.membership.count({ where: { organizationId, status: "ACTIVE" } }),
    ]);
    const limits = Object.fromEntries((subscription?.plan.entitlements ?? []).map((item: { key: string; limitValue: bigint | null; enabled: boolean }) => [item.key, item.enabled ? item.limitValue?.toString() ?? null : "0"]));
    return {
      subscription: subscription ? { id: subscription.id, status: subscription.status, provider: subscription.provider, plan: { id: subscription.plan.id, code: subscription.plan.code, name: subscription.plan.name } } : null,
      usage: { "ai.daily_requests": aiRequests, "workflow.monthly_runs": workflowRuns, seats },
      limits,
    };
  }

  async selectPlan(organizationId: string, planCode: string) {
    if (planCode !== "FREE") throw new BadRequestException({ code: "PAYMENT_PROVIDER_REQUIRED" });
    await this.database.client.subscription.updateMany({ where: { organizationId, status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] } }, data: { status: "CANCELLED" } });
    return this.database.client.subscription.create({ data: { organizationId, planId: FREE_PLAN_ID, status: "ACTIVE", provider: "internal" } });
  }
}
