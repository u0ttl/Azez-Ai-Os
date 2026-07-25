import { Module } from "@nestjs/common";
import { BillingModule } from "../billing/billing.module.js";
import { FilesController } from "./files.controller.js";
import { FilesService } from "./files.service.js";
import { MalwareScannerService } from "./malware-scanner.service.js";
import { ObjectStorageService } from "./object-storage.service.js";

@Module({
  imports: [BillingModule],
  controllers: [FilesController],
  providers: [FilesService, ObjectStorageService, MalwareScannerService],
  exports: [MalwareScannerService, ObjectStorageService],
})
export class FilesModule {}
