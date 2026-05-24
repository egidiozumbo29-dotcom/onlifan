import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateCreatorDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bannerUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(100)
  subscriptionPriceCents?: number;
}
