import { BadRequestException } from "@nestjs/common";
import { createHash } from "node:crypto";
import { basename } from "node:path";

const allowedTypes = new Set(["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "image/jpeg", "image/png", "text/plain"]);

export interface ValidatedFile {
  fileName: string;
  mimeType: string;
  checksum: string;
  sizeBytes: number;
}

export function validateFile(buffer: Buffer, originalName: string, mimeType: string, maximumBytes = 10 * 1024 * 1024): ValidatedFile {
  if (!buffer.length) throw new BadRequestException({ code: "FILE_EMPTY" });
  if (buffer.length > maximumBytes) throw new BadRequestException({ code: "FILE_TOO_LARGE", maximumBytes });
  if (!allowedTypes.has(mimeType)) throw new BadRequestException({ code: "FILE_TYPE_NOT_ALLOWED" });
  if (isExecutable(buffer)) throw new BadRequestException({ code: "EXECUTABLE_FILE_REJECTED" });
  if (!matchesDeclaredType(buffer, mimeType, originalName)) throw new BadRequestException({ code: "FILE_SIGNATURE_MISMATCH" });
  const fileName = sanitizeFileName(originalName);
  return { fileName, mimeType, sizeBytes: buffer.length, checksum: createHash("sha256").update(buffer).digest("hex") };
}

function matchesDeclaredType(buffer: Buffer, mimeType: string, fileName: string): boolean {
  if (mimeType === "application/pdf") return buffer.subarray(0, 5).toString("ascii") === "%PDF-";
  if (mimeType === "image/png") return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (mimeType === "image/jpeg") return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return /\.docx$/i.test(fileName) && buffer[0] === 0x50 && buffer[1] === 0x4b && buffer.includes(Buffer.from("[Content_Types].xml")) && buffer.includes(Buffer.from("word/"));
  if (mimeType === "text/plain") return !buffer.subarray(0, Math.min(buffer.length, 8192)).includes(0);
  return false;
}

function isExecutable(buffer: Buffer): boolean {
  const firstFour = buffer.subarray(0, 4);
  return buffer.subarray(0, 2).toString("ascii") === "MZ"
    || firstFour.equals(Buffer.from([0x7f, 0x45, 0x4c, 0x46]))
    || firstFour.equals(Buffer.from([0xcf, 0xfa, 0xed, 0xfe]))
    || firstFour.equals(Buffer.from([0xfe, 0xed, 0xfa, 0xcf]))
    || buffer.subarray(0, 2).toString("ascii") === "#!";
}

function sanitizeFileName(value: string): string {
  const normalized = basename(value.replace(/\\/g, "/")).normalize("NFKC");
  const clean = [...normalized].map((character) => {
    const code = character.charCodeAt(0);
    return code < 32 || code === 127 || character === "/" || character === "\\" ? "_" : character;
  }).join("").replace(/\s+/g, " ").trim();
  if (!clean) throw new BadRequestException({ code: "FILE_NAME_INVALID" });
  return clean.slice(0, 255);
}
