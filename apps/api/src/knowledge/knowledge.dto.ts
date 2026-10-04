import { IsString, MaxLength, MinLength } from "class-validator";

export class CreateKnowledgeBaseDto {
  @IsString() @MinLength(2) @MaxLength(180) name!: string;
  @IsString() @MaxLength(2000) description!: string;
}

export class AddTextDocumentDto {
  @IsString() @MinLength(2) @MaxLength(240) title!: string;
  @IsString() @MinLength(20) @MaxLength(500000) content!: string;
}

export class SearchKnowledgeDto {
  @IsString() @MinLength(2) @MaxLength(1000) query!: string;
}
