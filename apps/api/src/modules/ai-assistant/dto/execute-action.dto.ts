import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';

export class ExecuteActionDto {
  @IsString()
  @IsNotEmpty()
  actionName!: string;

  @IsObject()
  parameters!: Record<string, any>;

  @IsString()
  @IsOptional()
  conversationId?: string;
}
