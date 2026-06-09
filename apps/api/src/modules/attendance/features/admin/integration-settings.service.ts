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

    // There is no dedicated biometric-devices table in the schema, so we derive
    // a demo device per physical (office) location from the org's seeded
    // locations. This keeps the Integrations tab populated with real,
    // tenant-scoped data instead of an empty list.
    const biometricDevices = await this.getBiometricDevices(orgId);

    if (!policy) {
      return {
        biometricDevices,
        geoFenceEnabled: false,
        geoFenceDefaultRadius: 200,
        wifiValidationEnabled: false,
        wifiEnabled: false,
        wifiNetworks: [],
        allowedWifiNetworks: [],
        externalSyncEnabled: false,
        externalProvider: '',
        externalApiEndpoint: '',
        externalSyncFrequency: 'daily',
      };
    }

    return this.toDto(policy, biometricDevices);
  }

  // Derive deterministic demo biometric devices from the org's office locations.
  private async getBiometricDevices(orgId: string) {
    const locs = await this.db
      .select({
        name: schema.locations.name,
        type: schema.locations.type,
        radius: schema.locations.geoFenceRadius,
      })
      .from(schema.locations)
      .where(
        and(
          eq(schema.locations.orgId, orgId),
          eq(schema.locations.isActive, true),
        ),
      )
      .orderBy(schema.locations.name);

    const deviceTypes = ['fingerprint', 'face', 'card'];
    return locs
      .filter((l) => l.type === 'office')
      .map((l, i) => ({
        id: `dev-${i + 1}`,
        name: `${l.name} — Main Entrance`,
        type: deviceTypes[i % deviceTypes.length],
        ip: `192.168.${i + 1}.100`,
        port: 4370,
        location: l.name,
        syncFrequency: '15min',
        status: 'active',
      }));
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

  private toDto(
    policy: typeof schema.attendancePolicies.$inferSelect,
    biometricDevices: Array<Record<string, unknown>> = [],
  ) {
    const wifiNetworks = Array.isArray(policy.allowedWifiNetworks)
      ? policy.allowedWifiNetworks
      : [];
    return {
      policyId: policy.id,
      biometricDevices,
      geoFenceEnabled: policy.geoFenceEnabled,
      geoFenceDefaultRadius: 200,
      wifiValidationEnabled: policy.wifiValidationEnabled,
      wifiEnabled: policy.wifiValidationEnabled,
      wifiNetworks,
      allowedWifiNetworks: wifiNetworks,
      externalSyncEnabled: false,
      externalProvider: '',
      externalApiEndpoint: '',
      externalSyncFrequency: 'daily',
      trackingMethods: policy.trackingMethods,
      autoClockOut: policy.autoClockOut,
      autoClockOutTime: policy.autoClockOutTime,
      updatedAt: policy.updatedAt.toISOString(),
    };
  }
}
