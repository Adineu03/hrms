import { Body, Controller, Post } from '@nestjs/common';
import { IsNotEmpty, IsString } from 'class-validator';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { ReceiptScannerService } from './receipt-scanner.service';

class ScanReceiptDto {
  // base64 string or a full data URL (data:image/...;base64,...)
  @IsString()
  @IsNotEmpty()
  image!: string;
}

@Roles('super_admin', 'admin', 'manager', 'employee')
@Controller('expense-management/employee')
export class ReceiptScannerController {
  constructor(private readonly service: ReceiptScannerService) {}

  @Post('scan-receipt')
  async scan(@Body() dto: ScanReceiptDto) {
    return this.service.scan(dto.image);
  }
}
