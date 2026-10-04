import { BadRequestException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { validateWorkflowConfig } from "../src/workflows/workflow-executor.service.js";

describe("workflow action allowlist", () => {
  it("accepts the required fields for an allowed task action", () => {
    expect(validateWorkflowConfig("CREATE_TASK", { projectId: "project-1", title: "متابعة العميل" })).toMatchObject({ projectId: "project-1" });
  });

  it("rejects incomplete action configuration", () => {
    expect(() => validateWorkflowConfig("CREATE_TASK", { title: "مهمة بلا مشروع" })).toThrow(BadRequestException);
  });
});
