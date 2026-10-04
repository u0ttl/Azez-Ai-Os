import { describe, expect, it } from "vitest";
import { DatabaseService } from "../src/database/database.service.js";
import { AIGatewayService } from "../src/ai/ai-gateway.service.js";
import { EntitlementsService } from "../src/billing/entitlements.service.js";

describe("AI gateway local fallback", () => {
  it("returns a private local answer when no external provider is configured", async () => {
    const originalProvider = process.env.AI_PROVIDER;
    delete process.env.AI_PROVIDER;
    const entitlements = { getLimit: async () => 100 } as unknown as EntitlementsService;
    const gateway = new AIGatewayService({} as DatabaseService, entitlements);
    const answer = await gateway.answer("org-1", "ما السياسة؟", [{ chunkId: "c1", content: "سياسة الإجازات خمسة أيام.", score: 1, document: { id: "d1", title: "الإجازات" } }]);
    expect(answer.provider).toBe("local-retrieval");
    expect(answer.content).toContain("سياسة الإجازات");
    if (originalProvider) process.env.AI_PROVIDER = originalProvider;
  });
});
