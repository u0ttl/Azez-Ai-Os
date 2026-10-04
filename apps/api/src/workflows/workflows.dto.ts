import { IsIn, IsInt, IsObject, IsOptional, IsString, MaxLength, Min, MinLength } from "class-validator";

export class CreateWorkflowDto {
  @IsString() @MinLength(2) @MaxLength(180) name!: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
}

export class AddWorkflowStepDto {
  @IsString() @MinLength(2) @MaxLength(180) name!: string;
  @IsInt() @Min(0) position!: number;
  @IsIn(["CREATE_TASK", "CREATE_LEAD", "HUMAN_APPROVAL"])
  actionType!: "CREATE_TASK" | "CREATE_LEAD" | "HUMAN_APPROVAL";
  @IsObject() config!: Record<string, unknown>;
}

export class UpdateWorkflowStatusDto {
  @IsIn(["DRAFT", "ACTIVE", "PAUSED", "ARCHIVED"])
  status!: "DRAFT" | "ACTIVE" | "PAUSED" | "ARCHIVED";
}

export class RunWorkflowDto {
  @IsOptional() @IsObject() input?: Record<string, unknown>;
}

export class DecideApprovalDto {
  @IsIn(["APPROVED", "REJECTED"]) decision!: "APPROVED" | "REJECTED";
  @IsOptional() @IsString() @MaxLength(1000) comment?: string;
}
