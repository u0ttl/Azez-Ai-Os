import { Injectable } from "@nestjs/common";
import { randomBytes, timingSafeEqual } from "node:crypto";

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

@Injectable()
export class CsrfService {
  issue(): string {
    return randomBytes(32).toString("base64url");
  }

  verify(token: string | undefined): token is string {
    return typeof token === "string" && TOKEN_PATTERN.test(token);
  }

  matches(supplied: string | undefined, cookie: string | undefined): boolean {
    if (!this.verify(supplied) || !this.verify(cookie)) return false;
    const suppliedBytes = Buffer.from(supplied, "utf8");
    const cookieBytes = Buffer.from(cookie, "utf8");
    return suppliedBytes.length === cookieBytes.length && timingSafeEqual(suppliedBytes, cookieBytes);
  }
}
