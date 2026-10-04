import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";
import { CreateActivityDto, CreateContactDto } from "../src/crm/crm.dto.js";
import { AddProjectMemberDto, CreateTaskCommentDto } from "../src/projects/projects.dto.js";

describe("CRM and project input contracts", () => {
  it("accepts governed CRM activity/contact input and rejects unknown activity types", async () => {
    expect(await validate(plainToInstance(CreateContactDto, { name: "أحمد", email: "ahmed@example.com" }))).toHaveLength(0);
    expect(await validate(plainToInstance(CreateActivityDto, { type: "NOTE", subject: "متابعة العرض" }))).toHaveLength(0);
    expect(await validate(plainToInstance(CreateActivityDto, { type: "SCRIPT", subject: "غير مسموح" }))).not.toHaveLength(0);
  });

  it("requires valid project members and bounded task comments", async () => {
    expect(await validate(plainToInstance(AddProjectMemberDto, { userId: "not-a-uuid", role: "OWNER" }))).not.toHaveLength(0);
    expect(await validate(plainToInstance(CreateTaskCommentDto, { content: "تم إنهاء الجزء الأول" }))).toHaveLength(0);
    expect(await validate(plainToInstance(CreateTaskCommentDto, { content: "" }))).not.toHaveLength(0);
  });
});
