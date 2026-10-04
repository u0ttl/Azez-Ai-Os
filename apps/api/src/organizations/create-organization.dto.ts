import { IsIn, IsString, Matches, MaxLength, MinLength } from "class-validator";

export class CreateOrganizationDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name!: string;

  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  @MinLength(2)
  @MaxLength(80)
  slug!: string;

  @IsIn(["ar", "en"])
  locale!: "ar" | "en";
}
