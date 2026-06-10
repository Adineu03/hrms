/**
 * Org Design Studio "planning scenarios" have NO dedicated table.
 * They are stored as workforce_headcount_plans rows tagged with
 * metadata.type === 'scenario' (the table's jsonb `metadata` column also
 * carries description / assumptions / impact / orgStructure / createdBy,
 * since the table has no created_by column).
 *
 * Every feature that reads workforce_headcount_plans must use isScenarioRow()
 * so scenario rows never leak into real headcount plans/aggregates,
 * and real plans never leak into the scenario list.
 */

export interface ScenarioStructureUnit {
  name?: string;
  headcount?: number;
  change?: string;
}

export interface ScenarioMetadata {
  type?: string;
  createdBy?: string;
  description?: string;
  assumptions?: unknown;
  impact?: {
    headcountDelta?: unknown;
    costImpactAnnual?: unknown;
    costImpactLabel?: unknown;
  };
  orgStructure?: {
    units?: ScenarioStructureUnit[];
  };
}

export function isScenarioRow(row: { metadata: unknown }): boolean {
  const meta = row.metadata as ScenarioMetadata | null | undefined;
  return typeof meta === 'object' && meta !== null && meta.type === 'scenario';
}
