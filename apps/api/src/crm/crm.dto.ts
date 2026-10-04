import { IsEmail, IsIn, IsInt, IsISO8601, IsOptional, IsString, IsUrl, IsUUID, MaxLength, Min, MinLength } from "class-validator";

export class ListCompaniesDto {
  @IsOptional() @IsString() @MaxLength(120) search?: string;
  @IsOptional() @IsIn(["PROSPECT", "ACTIVE", "INACTIVE"]) status?: "PROSPECT" | "ACTIVE" | "INACTIVE";
}

export class CreateCompanyDto {
  @IsString() @MinLength(2) @MaxLength(180) name!: string;
  @IsOptional() @IsEmail() @MaxLength(320) email?: string;
  @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @IsOptional() @IsUrl({ require_protocol: true }) @MaxLength(300) website?: string;
  @IsOptional() @IsIn(["PROSPECT", "ACTIVE", "INACTIVE"]) status?: "PROSPECT" | "ACTIVE" | "INACTIVE";
}

export class UpdateCompanyDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(180) name?: string;
  @IsOptional() @IsEmail() @MaxLength(320) email?: string;
  @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @IsOptional() @IsIn(["PROSPECT", "ACTIVE", "INACTIVE"]) status?: "PROSPECT" | "ACTIVE" | "INACTIVE";
}

export class CreateLeadDto {
  @IsString() @MinLength(2) @MaxLength(180) title!: string;
  @IsOptional() @IsUUID() companyId?: string;
  @IsOptional() @IsIn(["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "WON", "LOST"]) status?: "NEW" | "CONTACTED" | "QUALIFIED" | "PROPOSAL" | "WON" | "LOST";
  @IsOptional() @IsInt() @Min(0) valueMinor?: number;
  @IsOptional() @IsString() @MinLength(3) @MaxLength(3) currency?: string;
}

export class CreateContactDto {
  @IsString() @MinLength(2) @MaxLength(180) name!: string;
  @IsOptional() @IsEmail() @MaxLength(320) email?: string;
  @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @IsOptional() @IsString() @MaxLength(120) jobTitle?: string;
}

export class CreateActivityDto {
  @IsIn(["NOTE", "CALL", "EMAIL", "MEETING", "TASK"])
  type!: "NOTE" | "CALL" | "EMAIL" | "MEETING" | "TASK";
  @IsString() @MinLength(2) @MaxLength(200) subject!: string;
  @IsOptional() @IsString() @MaxLength(8000) notes?: string;
  @IsOptional() @IsISO8601() occurredAt?: string;
  @IsOptional() @IsUUID() contactId?: string;
  @IsOptional() @IsUUID() leadId?: string;
}

export class UpdateLeadStatusDto {
  @IsIn(["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "WON", "LOST"])
  status!: "NEW" | "CONTACTED" | "QUALIFIED" | "PROPOSAL" | "WON" | "LOST";
}
