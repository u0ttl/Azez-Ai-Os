import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../database/database.service.js";

export const FREE_PLAN_ID = "00000000-0000-4000-8000-00000000f001";

@Injectable()
export class EntitlementsService {
  constructor(private readonly database: DatabaseService) {}

  async ensureSubscription(organizationId: string): Promise<void> {
    const existing = await this.database.client.subscription.findFirst({
      where: { organizationId, status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] } }, select: { id: true },
    });
    if (!existing) {
      await this.database.client.subscription.create({ data: { organizationId, planId: FREE_PLAN_ID, provider: "internal", status: "ACTIVE" } });
    }
  }

  async getLimit(organizationId: string, key: string): Promise<number | null> {
    await this.ensureSubscription(organizationId);
    const subscription = await this.database.client.subscription.findFirst({
      where: { organizationId, status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] } },
      include: { plan: { include: { entitlements: { where: { key } } } } },
      orderBy: { createdAt: "desc" },
    });
    const entitlement = subscription?.plan.entitlements[0];
    if (!entitlement?.enabled) return 0;
    return entitlement.limitValue === null || entitlement.limitValue === undefined ? null : Number(entitlement.limitValue);
  }
}
