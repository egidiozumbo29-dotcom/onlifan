import { IsInt, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

export class CreateTipDto {
  @IsUUID()
  creatorId!: string;

  @IsInt()
  @Min(100)
  amountCents!: number;

  @IsUUID()
  @IsOptional()
  postId?: string;

  @IsUUID()
  @IsOptional()
  messageId?: string;

  @IsUUID()
  @IsOptional()
  liveStreamId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  note?: string;
}
