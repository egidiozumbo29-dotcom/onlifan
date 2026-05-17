import { IsString, IsUUID } from 'class-validator';

export class RefreshTokenDto {
  @IsUUID()
  sessionId!: string;

  @IsString()
  refreshToken!: string;
}
