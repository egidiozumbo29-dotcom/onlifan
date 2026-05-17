import { IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateRefundDto {
  @IsUUID()
  paymentId!: string;

  @IsInt()
  @Min(1)
  amountCents!: number;

  @IsOptional()
  @IsString()
  reason?: string;
}
