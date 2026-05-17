import { IsEnum, IsInt, IsString, Min } from 'class-validator';
import { MediaType } from '@prisma/client';

export class CreateUploadUrlDto {
  @IsEnum(MediaType)
  type!: MediaType;

  @IsString()
  mimeType!: string;

  @IsInt()
  @Min(1)
  sizeBytes!: number;
}
