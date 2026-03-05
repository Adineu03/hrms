import * as XLSX from 'xlsx';

export class ExcelParser {
  static parse(buffer: Buffer): { headers: string[]; rows: Record<string, string>[] } {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '' });
    const headers = jsonData.length > 0 ? Object.keys(jsonData[0]) : [];
    return { headers, rows: jsonData };
  }

  static generateTemplate(columns: { field: string; label: string }[]): Buffer {
    const workbook = XLSX.utils.book_new();
    const headers = columns.map(c => c.label);
    const worksheet = XLSX.utils.aoa_to_sheet([headers]);
    // Set column widths
    worksheet['!cols'] = headers.map(() => ({ wch: 20 }));
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }
}
