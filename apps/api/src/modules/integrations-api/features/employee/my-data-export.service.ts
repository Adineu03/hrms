import { Injectable } from '@nestjs/common';

@Injectable()
export class MyDataExportService {
  async getExportHistory(orgId: string, userId: string) {
    return { data: [], meta: { total: 0 } };
  }

  async requestDataExport(orgId: string, userId: string, dto: { categories: string[] }) {
    return { data: { status: 'queued', message: 'Your data export will be ready within 24 hours' } };
  }
}
