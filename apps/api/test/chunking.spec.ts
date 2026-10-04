import { describe, expect, it } from "vitest";
import { chunkText, lexicalScore } from "../src/knowledge/chunking.js";

describe("knowledge text processing", () => {
  it("creates ordered bounded chunks", () => {
    const chunks = chunkText("الفقرة الأولى عن العملاء.\n\nالفقرة الثانية عن المشاريع والمهام.", 40);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0]?.position).toBe(0);
    expect(chunks.every((chunk) => chunk.content.length <= 40)).toBe(true);
  });

  it("ranks content containing Arabic query terms", () => {
    expect(lexicalScore("إدارة العملاء", "يساعد النظام في إدارة العملاء والمبيعات")).toBeGreaterThan(0);
    expect(lexicalScore("إدارة العملاء", "جدول الطقس اليوم")).toBe(0);
  });
});
