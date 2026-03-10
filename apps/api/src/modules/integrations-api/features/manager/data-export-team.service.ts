import { Injectable } from '@nestjs/common';

@Injectable()
export class DataExportTeamService {
  async getExportHistory(orgId: string) {
    return { data: [], meta: { total: 0 } };
  }

  async requestExport(
    orgId: string,
    dto: { dataType: string; dateFrom: string; dateTo: string; fields: string[] },
  ) {
    return { data: { status: 'queued', message: 'Export will be ready shortly' } };
  }
}
