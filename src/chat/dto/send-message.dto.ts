import { IsArray, IsBoolean, IsEnum, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';
import { MessageType } from '@prisma/client';

export class SendMessageDto {
  @IsUUID()
  conversationId!: string;

  @IsEnum(MessageType)
  @IsOptional()
  type?: MessageType;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  body?: string;

  @IsInt()
  @Min(100)
  @IsOptional()
  priceCents?: number;

  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  mediaIds?: string[];

  @IsBoolean()
  @IsOptional()
  isVanishing?: boolean;

  @IsUUID()
  @IsOptional()
  replyToId?: string;
}
