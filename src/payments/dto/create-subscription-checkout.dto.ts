import { IsUUID } from 'class-validator';

export class CreateSubscriptionCheckoutDto {
  @IsUUID()
  creatorId!: string;
}
