export type SetupStatus = 'not_started' | 'in_progress' | 'completed';

export interface OrgModule {
  id: string;
  orgId: string;
  moduleId: string;
  isActive: boolean;
  setupStatus: SetupStatus;
  setupProgress: Record<string, any>;
  config: Record<string, any>;
  activatedAt: string | null;
  setupCompletedAt: string | null;
}
