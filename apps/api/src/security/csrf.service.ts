import { Injectable } from "@nestjs/common";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

@Injectable()
export class CsrfService {
  private readonly secret = process.env.SESSION_SECRET ?? "development-only-session-secret-change-me";

  issue(): string {
    const nonce = randomBytes(32).toString("base64url");
    return `${nonce}.${this.sign(nonce)}`;
  }

  verify(token: string | undefined): boolean {
    if (!token) return false;
    const [nonce, signature, extra] = token.split(".");
    if (!nonce || !signature || extra || !/^[A-Za-z0-9_-]{43}$/.test(nonce)) return false;
    const expected = Buffer.from(this.sign(nonce), "utf8");
    const supplied = Buffer.from(signature, "utf8");
    return expected.length === supplied.length && timingSafeEqual(expected, supplied);
  }

  private sign(nonce: string): string {
    return createHmac("sha256", this.secret).update(`csrf:${nonce}`).digest("base64url");
  }
}
