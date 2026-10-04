import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class CreateConversationDto {
  @IsString() @MinLength(2) @MaxLength(180) title!: string;
}

export class SendMessageDto {
  @IsString() @MinLength(2) @MaxLength(10000) content!: string;
  @IsOptional() @IsString() knowledgeBaseId?: string;
}
