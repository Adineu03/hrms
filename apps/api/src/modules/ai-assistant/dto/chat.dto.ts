import { IsString, IsOptional, ValidateNested, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class PageContextDto {
  @IsOptional()
  moduleId!: string | null;

  @IsOptional()
  moduleName!: string | null;

  @IsOptional()
  activeTab!: string | null;

  @IsString()
  userRole!: string;

  @IsString()
  pathname!: string;
}

export class ChatRequestDto {
  @IsString()
  @IsNotEmpty()
  message!: string;

  @IsOptional()
  @IsString()
  conversationId?: string;

  @ValidateNested()
  @Type(() => PageContextDto)
  pageContext!: PageContextDto;

  @IsOptional()
  @IsString()
  pageSnapshotText?: string;

  @IsOptional()
  @IsString()
  screenshot?: string;
}
