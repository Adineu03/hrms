// Integrations & API Platform module types

export interface IntegrationConnectorData {
  id: string;
  connectorKey: string;
  connectorName: string;
  category: string; // 'hrms' | 'payroll' | 'erp' | 'communication' | 'other'
  description: string | null;
  logoUrl: string | null;
  isEnabled: boolean;
  isAuthenticated: boolean;
  authType: string | null; // 'oauth' | 'api_key' | 'basic'
  lastSyncAt: string | null;
  healthStatus: string; // 'healthy' | 'degraded' | 'error' | 'unknown'
  healthCheckedAt: string | null;
  errorMessage: string | null;
  usageCount: number;
  config: Record<string, unknown> | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IntegrationLogData {
  id: string;
  connectorId: string;
  connectorName?: string;
  eventType: string; // 'sync' | 'auth' | 'error' | 'webhook'
  status: string; // 'success' | 'failure' | 'partial'
  message: string | null;
  durationMs: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiKeyData {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  expiresAt: string | null;
  rateLimitPerMin: number;
  ipWhitelist: string[] | null;
  lastUsedAt: string | null;
  usageCount: number;
  rotationReminderDays: number;
  revokedAt: string | null;
  revokedBy: string | null;
  createdBy: string;
  status: string; // 'active' | 'revoked' | 'expired'
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookData {
  id: string;
  name: string;
  endpointUrl: string;
  eventType: string;
  payloadFormat: string; // 'json' | 'form'
  isEnabled: boolean;
  retryPolicy: { maxRetries: number; backoffSeconds: number[] } | null;
  lastDeliveryAt: string | null;
  lastDeliveryStatus: string | null;
  successCount: number;
  failureCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OAuthAppData {
  id: string;
  appName: string;
  clientId: string;
  redirectUris: string[];
  scopes: string[];
  description: string | null;
  logoUrl: string | null;
  ownerEmail: string | null;
  isPublic: boolean;
  authorizedUserCount: number;
  lastUsedAt: string | null;
  status: string; // 'active' | 'suspended' | 'revoked'
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DataSyncConfigData {
  id: string;
  connectorId: string | null;
  syncName: string;
  sourceType: string; // 'connector' | 'csv' | 'excel' | 'api'
  targetType: string; // 'employees' | 'attendance' | 'payroll'
  frequency: string; // 'realtime' | 'hourly' | 'daily' | 'weekly' | 'manual'
  fieldMapping: Record<string, string> | null;
  filterCriteria: Record<string, unknown> | null;
  isEnabled: boolean;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
  lastSyncRecordCount: number | null;
  nextSyncAt: string | null;
  errorMessage: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiUsageSummary {
  totalRequests: number;
  errorRate: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  topConsumers: { keyName: string; requests: number }[];
  rateLimitHits: number;
}

export interface TeamIntegrationStatusData {
  connectorKey: string;
  connectorName: string;
  category: string;
  isEnabled: boolean;
  healthStatus: string;
  lastSyncAt: string | null;
  errorMessage: string | null;
}

export interface EmployeeConnectedAppData {
  id: string;
  appName: string;
  scopes: string[];
  lastAccessAt: string | null;
  authorizedAt: string;
}
