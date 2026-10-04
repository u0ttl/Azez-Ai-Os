import { Module } from "@nestjs/common";
import { BillingController } from "./billing.controller.js";
import { BillingService } from "./billing.service.js";
import { EntitlementsService } from "./entitlements.service.js";

@Module({ controllers: [BillingController], providers: [BillingService, EntitlementsService], exports: [BillingService, EntitlementsService] })
export class BillingModule {}
