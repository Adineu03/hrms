import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';
import { AiCoreService } from '../../../../shared/ai/ai-core.service';

type Severity = 'high' | 'medium' | 'low';
type AnomalyType = 'duplicate' | 'over_limit' | 'outlier' | 'missing_receipt';

export interface ExpenseAnomaly {
  id: string;
  type: AnomalyType;
  severity: Severity;
  reportId: string;
  reportTitle: string;
  employeeName: string;
  category: string | null;
  vendor: string | null;
  amount: number;
  date: string | null;
  fact: string; // deterministic reason (source of truth)
  explanation: string; // plain-English (LLM, or = fact when AI unavailable)
}

const SEVERITY_RANK: Record<Severity, number> = { high: 0, medium: 1, low: 2 };
const MISSING_RECEIPT_MIN = 5000;
const MAX_LLM_EXPLAIN = 30;

const ExplanationSchema = z.object({
  explanations: z.array(z.object({ id: z.string(), explanation: z.string() })),
});

@Injectable()
export class ExpenseAnomalyService {
  private readonly logger = new Logger(ExpenseAnomalyService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly ai: AiCoreService,
  ) {}

  async detect(orgId: string): Promise<{
    summary: { total: number; high: number; medium: number; low: number; aiExplained: boolean };
    anomalies: ExpenseAnomaly[];
  }> {
    const items = await this.db
      .select({
        id: schema.expenseItems.id,
        reportId: schema.expenseItems.reportId,
        categoryId: schema.expenseItems.categoryId,
        date: schema.expenseItems.date,
        amount: schema.expenseItems.amount,
        vendor: schema.expenseItems.vendor,
        receiptUrl: schema.expenseItems.receiptUrl,
        receiptName: schema.expenseItems.receiptName,
      })
      .from(schema.expenseItems)
      .where(and(eq(schema.expenseItems.orgId, orgId), eq(schema.expenseItems.isActive, true)));

    if (items.length === 0) {
      return { summary: { total: 0, high: 0, medium: 0, low: 0, aiExplained: false }, anomalies: [] };
    }

    const reports = await this.db
      .select({ id: schema.expenseReports.id, employeeId: schema.expenseReports.employeeId, title: schema.expenseReports.title })
      .from(schema.expenseReports)
      .where(eq(schema.expenseReports.orgId, orgId));
    const reportMap = new Map(reports.map((r) => [r.id, r]));

    const userIds = [...new Set(reports.map((r) => r.employeeId))];
    const users = userIds.length
      ? await this.db
          .select({ id: schema.users.id, firstName: schema.users.firstName, lastName: schema.users.lastName })
          .from(schema.users)
          .where(eq(schema.users.orgId, orgId))
      : [];
    const userMap = new Map(users.map((u) => [u.id, `${u.firstName} ${u.lastName ?? ''}`.trim()]));

    const categories = await this.db
      .select({ id: schema.expenseCategories.id, name: schema.expenseCategories.name })
      .from(schema.expenseCategories)
      .where(eq(schema.expenseCategories.orgId, orgId));
    const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

    const policies = await this.db
      .select({
        categoryId: schema.expensePolicies.categoryId,
        maxAmountPerClaim: schema.expensePolicies.maxAmountPerClaim,
        name: schema.expensePolicies.name,
      })
      .from(schema.expensePolicies)
      .where(and(eq(schema.expensePolicies.orgId, orgId), eq(schema.expensePolicies.isActive, true)));

    // Normalize items
    const norm = items.map((it) => ({
      ...it,
      amount: Number(it.amount) || 0,
      dateStr: it.date ? new Date(it.date as any).toISOString().split('T')[0] : null,
      vendorKey: (it.vendor || '').trim().toLowerCase(),
    }));

    const anomalies: ExpenseAnomaly[] = [];
    const base = (it: (typeof norm)[number]) => {
      const report = reportMap.get(it.reportId);
      return {
        reportId: it.reportId,
        reportTitle: report?.title ?? 'Expense report',
        employeeName: (report && userMap.get(report.employeeId)) || 'Unknown',
        category: it.categoryId ? categoryMap.get(it.categoryId) ?? null : null,
        vendor: it.vendor || null,
        amount: it.amount,
        date: it.dateStr,
      };
    };

    // ── Rule 1: duplicate claim (same vendor + amount + date) ──
    const dupGroups = new Map<string, typeof norm>();
    for (const it of norm) {
      if (!it.vendorKey || it.amount <= 0 || !it.dateStr) continue;
      const key = `${it.vendorKey}|${it.amount}|${it.dateStr}`;
      if (!dupGroups.has(key)) dupGroups.set(key, []);
      dupGroups.get(key)!.push(it);
    }
    for (const group of dupGroups.values()) {
      if (group.length < 2) continue;
      const it = group[0];
      anomalies.push({
        id: `dup-${it.id}`,
        type: 'duplicate',
        severity: 'high',
        ...base(it),
        fact: `Possible duplicate: ${group.length} expense items of ₹${it.amount} from "${it.vendor}" on ${it.dateStr}.`,
        explanation: '',
      });
    }

    // ── Rule 2: over per-claim policy limit ──
    const limitedPolicies = policies.filter((p) => p.maxAmountPerClaim != null);
    if (limitedPolicies.length) {
      for (const it of norm) {
        const applicable = limitedPolicies
          .filter((p) => p.categoryId == null || p.categoryId === it.categoryId)
          .map((p) => ({ ...p, max: Number(p.maxAmountPerClaim) }))
          .filter((p) => p.max > 0)
          .sort((a, b) => a.max - b.max)[0];
        if (applicable && it.amount > applicable.max) {
          anomalies.push({
            id: `lim-${it.id}`,
            type: 'over_limit',
            severity: 'high',
            ...base(it),
            fact: `Amount ₹${it.amount} exceeds the per-claim limit of ₹${applicable.max} (policy "${applicable.name}").`,
            explanation: '',
          });
        }
      }
    }

    // ── Rule 3: statistical outlier (org-wide, needs a meaningful sample) ──
    const amounts = norm.map((i) => i.amount).filter((a) => a > 0);
    if (amounts.length >= 5) {
      const mean = amounts.reduce((s, a) => s + a, 0) / amounts.length;
      const variance = amounts.reduce((s, a) => s + (a - mean) ** 2, 0) / amounts.length;
      const std = Math.sqrt(variance);
      if (std > 0) {
        const threshold = mean + 3 * std;
        for (const it of norm) {
          if (it.amount > threshold) {
            anomalies.push({
              id: `out-${it.id}`,
              type: 'outlier',
              severity: 'medium',
              ...base(it),
              fact: `Amount ₹${it.amount} is a statistical outlier (org average ₹${Math.round(mean)}, flag threshold ₹${Math.round(threshold)}).`,
              explanation: '',
            });
          }
        }
      }
    }

    // ── Rule 4: high-value expense missing a receipt ──
    for (const it of norm) {
      const hasReceipt = !!(it.receiptUrl || it.receiptName);
      if (it.amount >= MISSING_RECEIPT_MIN && !hasReceipt) {
        anomalies.push({
          id: `rec-${it.id}`,
          type: 'missing_receipt',
          severity: 'low',
          ...base(it),
          fact: `High-value expense (₹${it.amount}) has no receipt attached.`,
          explanation: '',
        });
      }
    }

    anomalies.sort(
      (a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || b.amount - a.amount,
    );

    const aiExplained = await this.explain(anomalies);

    const summary = {
      total: anomalies.length,
      high: anomalies.filter((a) => a.severity === 'high').length,
      medium: anomalies.filter((a) => a.severity === 'medium').length,
      low: anomalies.filter((a) => a.severity === 'low').length,
      aiExplained,
    };
    return { summary, anomalies };
  }

  /**
   * Ask the LLM to phrase a friendly one-sentence explanation for each
   * already-detected anomaly. The LLM never decides what is anomalous — it only
   * narrates the deterministic facts. Falls back to the fact text on any issue.
   */
  private async explain(anomalies: ExpenseAnomaly[]): Promise<boolean> {
    // Default: explanation = deterministic fact (works with AI off).
    for (const a of anomalies) a.explanation = a.fact;
    if (!anomalies.length || !this.ai.isReady()) return false;

    const subset = anomalies.slice(0, MAX_LLM_EXPLAIN);
    try {
      const result = await this.ai.extractStructured<z.infer<typeof ExplanationSchema>>({
        name: 'AnomalyExplainer',
        schema: ExplanationSchema,
        instructions:
          'You explain pre-detected expense anomalies for an HR/finance admin. You are given a list of anomalies, each with an id, a type, and a deterministic "fact". For EACH id, write one clear, friendly sentence explaining why it was flagged and what the admin should check. Do NOT invent new anomalies, amounts, or facts beyond what is given. Return an explanation for every id provided.',
        text: JSON.stringify(subset.map((a) => ({ id: a.id, type: a.type, fact: a.fact }))),
      });
      const byId = new Map(result.explanations.map((e) => [e.id, e.explanation]));
      let used = false;
      for (const a of subset) {
        const ex = byId.get(a.id);
        if (ex && ex.trim()) {
          a.explanation = ex.trim();
          used = true;
        }
      }
      if (anomalies.length > MAX_LLM_EXPLAIN) {
        this.logger.warn(`Explained first ${MAX_LLM_EXPLAIN} of ${anomalies.length} anomalies via AI; rest use deterministic text.`);
      }
      return used;
    } catch (err: any) {
      this.logger.error('Anomaly explanation failed; using deterministic text', err?.message || err);
      return false;
    }
  }
}
