import { IsIn } from "class-validator";

export class SelectPlanDto {
  @IsIn(["FREE", "GROWTH", "ENTERPRISE"])
  planCode!: "FREE" | "GROWTH" | "ENTERPRISE";
}
