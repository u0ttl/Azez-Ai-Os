import { IsIn, IsInt, IsISO8601, IsOptional, IsString, IsUUID, MaxLength, Min, MinLength } from "class-validator";

export class ListProjectsDto {
  @IsOptional() @IsString() @MaxLength(120) search?: string;
  @IsOptional() @IsIn(["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"]) status?: "PLANNING" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "CANCELLED";
}

export class CreateProjectDto {
  @IsString() @MinLength(2) @MaxLength(180) name!: string;
  @IsOptional() @IsString() @MaxLength(4000) description?: string;
  @IsOptional() @IsIn(["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"]) status?: "PLANNING" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "CANCELLED";
  @IsOptional() @IsISO8601() dueAt?: string;
}

export class CreateTaskDto {
  @IsString() @MinLength(2) @MaxLength(240) title!: string;
  @IsOptional() @IsString() @MaxLength(4000) description?: string;
  @IsOptional() @IsIn(["LOW", "MEDIUM", "HIGH", "URGENT"]) priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  @IsOptional() @IsISO8601() dueAt?: string;
  @IsOptional() @IsUUID() assigneeUserId?: string;
  @IsOptional() @IsInt() @Min(0) position?: number;
}

export class UpdateTaskDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(240) title?: string;
  @IsOptional() @IsString() @MaxLength(4000) description?: string;
  @IsOptional() @IsIn(["TODO", "IN_PROGRESS", "REVIEW", "DONE", "BLOCKED"]) status?: "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE" | "BLOCKED";
  @IsOptional() @IsIn(["LOW", "MEDIUM", "HIGH", "URGENT"]) priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  @IsOptional() @IsISO8601() dueAt?: string;
  @IsOptional() @IsUUID() assigneeUserId?: string;
  @IsOptional() @IsInt() @Min(0) position?: number;
}

export class AddProjectMemberDto {
  @IsUUID() userId!: string;
  @IsOptional() @IsIn(["MANAGER", "MEMBER", "VIEWER"]) role?: "MANAGER" | "MEMBER" | "VIEWER";
}

export class CreateTaskCommentDto {
  @IsString() @MinLength(1) @MaxLength(4000) content!: string;
}
