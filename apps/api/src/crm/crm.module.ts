import { Module } from "@nestjs/common";
import { CrmController } from "./crm.controller.js";
import { CrmService } from "./crm.service.js";

@Module({ controllers: [CrmController], providers: [CrmService] })
export class CrmModule {}
