import { IsArray, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { PostVisibility } from '@prisma/client';

export class CreatePostDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsEnum(PostVisibility)
  visibility!: PostVisibility;

  @IsOptional()
  @IsInt()
  @Min(1)
  priceCents?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsArray()
  mediaIds?: string[];
}
