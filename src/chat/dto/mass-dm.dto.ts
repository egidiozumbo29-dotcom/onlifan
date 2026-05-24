import { IsArray, IsBoolean, IsEnum, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

export enum MassDmAudience {
  ALL_SUBSCRIBERS = 'ALL_SUBSCRIBERS',
  ACTIVE_SUBSCRIBERS = 'ACTIVE_SUBSCRIBERS',
  EXPIRED_SUBSCRIBERS = 'EXPIRED_SUBSCRIBERS',
  FOLLOWERS = 'FOLLOWERS',
}

export class MassDmDto {
  @IsEnum(MassDmAudience)
  audience!: MassDmAudience;

  @IsString()
  @MaxLength(5000)
  body!: string;

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
}
