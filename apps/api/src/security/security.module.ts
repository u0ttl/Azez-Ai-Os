import { Global, Module } from "@nestjs/common";
import { CsrfGuard } from "./csrf.guard.js";
import { CsrfService } from "./csrf.service.js";
import { SecurityRateLimiter } from "./rate-limiter.service.js";

@Global()
@Module({
  providers: [CsrfService, CsrfGuard, SecurityRateLimiter],
  exports: [CsrfService, CsrfGuard, SecurityRateLimiter],
})
export class SecurityModule {}
