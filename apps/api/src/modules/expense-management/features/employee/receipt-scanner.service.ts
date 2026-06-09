import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { AiCoreService } from '../../../../shared/ai/ai-core.service';

// Must match the category options the expense form offers.
export const EXPENSE_CATEGORIES = [
  'travel',
  'food',
  'communication',
  'accommodation',
  'fuel',
  'equipment',
  'training',
  'medical',
  'other',
] as const;

const ReceiptSchema = z.object({
  isReceipt: z.boolean().describe('True only if the image is actually a receipt/invoice/bill.'),
  vendor: z.string().describe('Merchant / vendor name. Empty string if not visible.'),
  date: z.string().describe('Transaction date in YYYY-MM-DD. Empty string if not found.'),
  amount: z.number().describe('Grand total amount as a number (no currency symbol). 0 if not found.'),
  currency: z.string().describe('ISO currency code if shown (e.g. INR, USD). Empty string if unknown.'),
  category: z.enum(EXPENSE_CATEGORIES).describe('Best-fit expense category from the allowed list.'),
  description: z.string().describe('Short human description of the expense (a few words).'),
});

export type ReceiptExtraction = z.infer<typeof ReceiptSchema>;

const INSTRUCTIONS = `You extract structured expense data from a photo or scan of a receipt, invoice, or bill.

Rules:
- Read ONLY what is visibly present. Never invent a vendor, date, or amount that is not in the image.
- "amount" is the FINAL grand total the customer paid (after tax/tip), as a plain number.
- "date" must be ISO format YYYY-MM-DD. If the receipt shows a date in another format, convert it. If no date is visible, use an empty string.
- "category" must be the closest match from the allowed list for the kind of merchant/expense (e.g. a restaurant → food, a cab → travel, a hotel → accommodation, a petrol bill → fuel).
- "description" is a brief few-word summary (e.g. "Dinner at Olive Bistro").
- If the image is NOT a receipt/invoice/bill (e.g. a random photo, a screenshot, a document), set isReceipt=false and leave the other fields empty/0.`;

@Injectable()
export class ReceiptScannerService {
  private readonly logger = new Logger(ReceiptScannerService.name);

  constructor(private readonly ai: AiCoreService) {}

  async scan(image: string): Promise<
    | { ok: true; receipt: ReceiptExtraction }
    | { ok: false; message: string }
  > {
    if (!this.ai.isReady()) {
      return { ok: false, message: 'Receipt scanning is not configured on this server.' };
    }
    if (!image || image.length < 32) {
      return { ok: false, message: 'No image was provided.' };
    }

    try {
      const receipt = await this.ai.extractStructured<ReceiptExtraction>({
        name: 'ReceiptScanner',
        schema: ReceiptSchema,
        instructions: INSTRUCTIONS,
        text: 'Extract the expense details from this receipt image.',
        imageDataUrl: AiCoreService.toDataUrl(image),
      });
      return { ok: true, receipt };
    } catch (err: any) {
      this.logger.error('Receipt scan failed', err?.message || err);
      return { ok: false, message: 'Could not read the receipt. Please try a clearer photo or enter the details manually.' };
    }
  }
}
