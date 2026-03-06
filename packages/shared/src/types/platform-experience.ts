// Platform & Experience Layer module types

export interface NotificationData {
  id: string;
  userId: string;
  userName?: string;
  type: string;
  channel: string;
  title: string;
  message: string;
  moduleId: string | null;
  referenceId: string | null;
  referenceType: string | null;
  isRead: boolean;
  readAt: string | null;
  sentAt: string | null;
  createdAt: string;
}

export interface NotificationTemplateData {
  id: string;
  name: string;
  eventType: string;
  channel: string;
  subject: string | null;
  bodyTemplate: string;
  variables: string[];
  isEnabled: boolean;
  createdAt: string;
}

export interface CustomDashboardData {
  id: string;
  name: string;
  description: string | null;
  createdById: string;
  createdByName?: string;
  isDefault: boolean;
  isShared: boolean;
  layout: any;
  widgetCount: number;
  createdAt: string;
}

export interface DashboardWidgetData {
  id: string;
  dashboardId: string;
  widgetType: string;
  title: string;
  config: any;
  position: any;
  size: any;
  createdAt: string;
}

export interface UserPreferencesData {
  id: string;
  userId: string;
  theme: string;
  locale: string;
  timezone: string | null;
  dateFormat: string;
  notificationPrefs: any;
  accessibilitySettings: any;
  displayPrefs: any;
  createdAt: string;
}

export interface BookmarkData {
  id: string;
  userId: string;
  title: string;
  moduleId: string | null;
  path: string;
  icon: string | null;
  sortOrder: number;
  createdAt: string;
}

export interface NotificationAnalyticsData {
  totalSent: number;
  totalRead: number;
  readRate: number;
  byChannel: { channel: string; count: number }[];
  byModule: { moduleId: string; count: number }[];
  deliveryRate: number;
}

export interface SearchResultData {
  id: string;
  type: string;
  moduleId: string;
  title: string;
  description: string | null;
  path: string;
  score: number;
}

export interface RecentItemData {
  id: string;
  userId: string;
  moduleId: string;
  title: string;
  path: string;
  accessedAt: string;
}

export interface SystemHealthData {
  status: string;
  uptime: number;
  activeSessions: number;
  dbConnections: number;
  cacheHitRate: number;
  queueSize: number;
  lastCheckedAt: string;
}

export interface AuditLogEntryData {
  id: string;
  userId: string;
  userName?: string;
  action: string;
  resource: string;
  resourceId: string | null;
  details: any;
  ipAddress: string | null;
  createdAt: string;
}

export interface BulkOperationData {
  id: string;
  type: string;
  status: string;
  totalItems: number;
  processedItems: number;
  failedItems: number;
  createdById: string;
  createdByName?: string;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface TeamNotificationPrefsData {
  teamId: string;
  escalationRules: any[];
  notificationPrefs: any;
  announcementDefaults: any;
}

export interface TeamAnnouncementData {
  id: string;
  title: string;
  content: string;
  priority: string;
  createdById: string;
  createdByName?: string;
  readCount: number;
  totalRecipients: number;
  createdAt: string;
}

export interface QuickActionData {
  id: string;
  label: string;
  type: string;
  path: string;
  icon: string | null;
  count: number | null;
}

export interface SelfServiceRequestSummaryData {
  totalRequests: number;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  recentRequests: any[];
}
