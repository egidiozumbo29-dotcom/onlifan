import { IsInt, IsOptional, IsString, Matches, Min } from 'class-validator';

export class ApplyCreatorDto {
  @IsString()
  @Matches(/^[a-zA-Z0-9_]{3,30}$/)
  username!: string;

  @IsString()
  displayName!: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsInt()
  @Min(100)
  subscriptionPriceCents!: number;
}
