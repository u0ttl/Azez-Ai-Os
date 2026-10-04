import { BadRequestException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { validateFile } from "../src/files/file-validation.js";

describe("secure file validation", () => {
  it("accepts an allowed file only when its signature matches", () => {
    const file = validateFile(Buffer.from("%PDF-1.7\nexample"), "report.pdf", "application/pdf");
    expect(file.fileName).toBe("report.pdf"); expect(file.checksum).toHaveLength(64);
    expect(() => validateFile(Buffer.from("plain text"), "fake.pdf", "application/pdf")).toThrow(BadRequestException);
  });

  it("rejects executable signatures even with an allowed declared type", () => {
    expect(() => validateFile(Buffer.from("MZ executable"), "notes.txt", "text/plain")).toThrow(BadRequestException);
    expect(() => validateFile(Buffer.from("#!/bin/sh"), "notes.txt", "text/plain")).toThrow(BadRequestException);
  });
});
