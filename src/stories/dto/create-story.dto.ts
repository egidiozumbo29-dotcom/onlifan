import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateStoryDto {
  @IsUUID()
  @IsOptional()
  mediaId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  text?: string;
}
