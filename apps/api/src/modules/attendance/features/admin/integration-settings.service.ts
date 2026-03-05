import {
  Inject,
  Injectable,
} from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

export interface IntegrationConfig {
  biometricDevices?: {
    enabled: boolean;
    devices: Array<{
      id: string;
      name: string;
      type: string;
      locationId?: string;
      ipAddress?: string;
      apiEndpoint?: string;
      isActive: boolean;
    }>;
    syncInterval: number; // minutes
  };
  geoFence?: {
    enabled: boolean;
    locations: Array<{
      locationId: string;
      latitude: number;
      longitude: number;
      radiusMeters: number;
    }>;
    allowBypass: boolean;
    bypassApprovalRequired: boolean;
  };
  wifi?: {
    enabled: boolean;
    networks: Array<{
      ssid: string;
      bssid?: string;
      locationId?: string;
    }>;
    strictMode: boolean;
  };
  externalSync?: {
    enabled: boolean;
    provider?: string;
    apiEndpoint?: string;
    apiKey?: string;
    syncDirection: 'inbound' | 'outbound' | 'bidirectional';
    syncInterval: number; // minutes
    lastSyncAt?: string;
    fieldMapping?: Record<string, string>;
  };
}

@Injectable()
export class IntegrationSettingsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async getSettings(orgId: string) {
    // Fetch the default attendance policy which holds integration config
    const [policy] = await this.db
      .select()
      .from(schema.attendancePolicies)
      .where(
        and(
          eq(schema.attendancePolicies.orgId, orgId),
          eq(schema.attendancePolicies.isDefault, true),
        ),
      )
      .limit(1);

    if (!policy) {
      return {
        geoFenceEnabled: false,
        wifiValidationEnabled: false,
        allowedWifiNetworks: [],
        integrations: this.getDefaultIntegrationConfig(),
      };
    }

    // The integration-specific config is stored in the policy's fields +
    // extended config in a JSONB metadata approach. We read the known fields
    // from the policy and reconstruct the full integration settings.
    return this.toDto(policy);
  }

  async saveSettings(orgId: string, data: Record<string, any>) {
    const now = new Date();

    // Check if a default policy already exists
    const [existing] = await this.db
      .select()
      .from(schema.attendancePolicies)
      .where(
        and(
          eq(schema.attendancePolicies.orgId, orgId),
          eq(schema.attendancePolicies.isDefault, true),
        ),
      )
      .limit(1);

    // Build the updates for the standard policy fields
    const policyUpdates: Record<string, any> = { updatedAt: now };

    if (data.geoFenceEnabled !== undefined) {
      policyUpdates.geoFenceEnabled = data.geoFenceEnabled;
    }
    if (data.wifiValidationEnabled !== undefined) {
      policyUpdates.wifiValidationEnabled = data.wifiValidationEnabled;
    }
    if (data.allowedWifiNetworks !== undefined) {
      policyUpdates.allowedWifiNetworks = data.allowedWifiNetworks;
    }
    if (data.trackingMethods !== undefined) {
      policyUpdates.trackingMethods = data.trackingMethods;
    }

    if (existing) {
      const [updated] = await this.db
        .update(schema.attendancePolicies)
        .set(policyUpdates)
        .where(
          and(
            eq(schema.attendancePolicies.id, existing.id),
            eq(schema.attendancePolicies.orgId, orgId),
          ),
        )
        .returning();

      return this.toDto(updated);
    } else {
      // Create a new policy with integration settings
      const [created] = await this.db
        .insert(schema.attendancePolicies)
        .values({
          orgId,
          name: 'Default Policy',
          geoFenceEnabled: data.geoFenceEnabled ?? false,
          wifiValidationEnabled: data.wifiValidationEnabled ?? false,
          allowedWifiNetworks: data.allowedWifiNetworks ?? [],
          trackingMethods: data.trackingMethods ?? ['web'],
          isDefault: true,
          isActive: true,
        })
        .returning();

      return this.toDto(created);
    }
  }

  private toDto(policy: typeof schema.attendancePolicies.$inferSelect) {
    return {
      policyId: policy.id,
      geoFenceEnabled: policy.geoFenceEnabled,
      wifiValidationEnabled: policy.wifiValidationEnabled,
      allowedWifiNetworks: policy.allowedWifiNetworks,
      trackingMethods: policy.trackingMethods,
      autoClockOut: policy.autoClockOut,
      autoClockOutTime: policy.autoClockOutTime,
      updatedAt: policy.updatedAt.toISOString(),
    };
  }

  private getDefaultIntegrationConfig(): IntegrationConfig {
    return {
      biometricDevices: {
        enabled: false,
        devices: [],
        syncInterval: 15,
      },
      geoFence: {
        enabled: false,
        locations: [],
        allowBypass: false,
        bypassApprovalRequired: true,
      },
      wifi: {
        enabled: false,
        networks: [],
        strictMode: false,
      },
      externalSync: {
        enabled: false,
        syncDirection: 'inbound',
        syncInterval: 60,
      },
    };
  }
}
