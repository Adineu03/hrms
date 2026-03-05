'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  Plus,
  Trash2,
  Check,
  AlertCircle,
  Save,
  Settings,
  Wifi,
  MapPin,
  Link2,
  Monitor,
} from 'lucide-react';

const inputClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary';
const selectClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary appearance-none';

interface BiometricDevice {
  id?: string;
  name: string;
  type: string;
  ip: string;
  port: number;
  location: string;
  syncFrequency: string;
  status: string;
}

interface IntegrationSettings {
  biometricDevices: BiometricDevice[];
  geoFenceEnabled: boolean;
  geoFenceDefaultRadius: number;
  wifiEnabled: boolean;
  wifiNetworks: string;
  externalSyncEnabled: boolean;
  externalProvider: string;
  externalApiEndpoint: string;
  externalSyncFrequency: string;
}

const DEVICE_TYPES = [
  { value: 'fingerprint', label: 'Fingerprint' },
  { value: 'face', label: 'Face Recognition' },
  { value: 'card', label: 'Card Reader' },
  { value: 'iris', label: 'Iris Scanner' },
  { value: 'multi', label: 'Multi-Modal' },
];

const SYNC_FREQUENCIES = [
  { value: '5min', label: 'Every 5 minutes' },
  { value: '15min', label: 'Every 15 minutes' },
  { value: '30min', label: 'Every 30 minutes' },
  { value: '1hour', label: 'Every hour' },
  { value: '6hours', label: 'Every 6 hours' },
  { value: 'daily', label: 'Daily' },
];

const emptyDevice: BiometricDevice = {
  name: '',
  type: 'fingerprint',
  ip: '',
  port: 4370,
  location: '',
  syncFrequency: '15min',
  status: 'active',
};

const defaultSettings: IntegrationSettings = {
  biometricDevices: [],
  geoFenceEnabled: false,
  geoFenceDefaultRadius: 200,
  wifiEnabled: false,
  wifiNetworks: '',
  externalSyncEnabled: false,
  externalProvider: '',
  externalApiEndpoint: '',
  externalSyncFrequency: 'daily',
};

export default function IntegrationSettingsTab() {
  const [settings, setSettings] = useState<IntegrationSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Add device form
  const [showAddDevice, setShowAddDevice] = useState(false);
  const [newDevice, setNewDevice] = useState<BiometricDevice>(emptyDevice);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await api.get('/attendance/admin/integrations');
      const data = res.data?.data || res.data;
      if (data) {
        setSettings({
          ...defaultSettings,
          ...data,
          biometricDevices: Array.isArray(data.biometricDevices) ? data.biometricDevices : [],
          wifiNetworks: Array.isArray(data.wifiNetworks)
            ? data.wifiNetworks.join(', ')
            : data.wifiNetworks || '',
        });
      }
    } catch {
      // No settings yet, use defaults
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setError(null);
    setSuccessMsg(null);
    setIsSaving(true);
    try {
      const payload = {
        ...settings,
        wifiNetworks: settings.wifiNetworks
          ? settings.wifiNetworks.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
      };
      await api.post('/attendance/admin/integrations', payload);
      setSuccessMsg('Integration settings saved successfully.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch {
      setError('Failed to save integration settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const addDevice = () => {
    if (!newDevice.name.trim() || !newDevice.ip.trim()) {
      setError('Device name and IP are required.');
      return;
    }
    setError(null);
    setSettings((prev) => ({
      ...prev,
      biometricDevices: [...prev.biometricDevices, { ...newDevice, id: `temp-${Date.now()}` }],
    }));
    setNewDevice(emptyDevice);
    setShowAddDevice(false);
  };

  const removeDevice = (index: number) => {
    setSettings((prev) => ({
      ...prev,
      biometricDevices: prev.biometricDevices.filter((_, i) => i !== index),
    }));
  };

  const renderToggle = (
    checked: boolean,
    onChange: (val: boolean) => void,
    label: string,
  ) => (
    <label className="flex items-center gap-2 cursor-pointer">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-9 h-5 rounded-full transition-colors ${
          checked ? 'bg-primary' : 'bg-gray-300'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
            checked ? 'translate-x-4' : ''
          }`}
        />
      </button>
      <span className="text-sm text-text">{label}</span>
    </label>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading integration settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-text flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Integration Settings
        </h2>
        <p className="text-sm text-text-muted">
          Configure biometric devices, geo-fence, WiFi, and external system integrations.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <Check className="h-4 w-4 flex-shrink-0" />
          {successMsg}
        </div>
      )}

      <div className="space-y-6">
        {/* Biometric Devices */}
        <div className="bg-card border border-border rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              Biometric Devices ({settings.biometricDevices.length})
            </h3>
            <button
              type="button"
              onClick={() => {
                setShowAddDevice(!showAddDevice);
                setNewDevice(emptyDevice);
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-primary text-white hover:bg-primary-hover transition-colors"
            >
              <Plus className="h-3 w-3" />
              Add Device
            </button>
          </div>

          {/* Add Device Form */}
          {showAddDevice && (
            <div className="bg-background border border-border rounded-lg p-3 space-y-3">
              <h4 className="text-xs font-semibold text-text">New Device</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Name *</label>
                  <input
                    type="text"
                    value={newDevice.name}
                    onChange={(e) => setNewDevice({ ...newDevice, name: e.target.value })}
                    placeholder="Device name"
                    className={`${inputClassName} text-sm`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Type</label>
                  <select
                    value={newDevice.type}
                    onChange={(e) => setNewDevice({ ...newDevice, type: e.target.value })}
                    className={`${selectClassName} text-sm`}
                  >
                    {DEVICE_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">IP Address *</label>
                  <input
                    type="text"
                    value={newDevice.ip}
                    onChange={(e) => setNewDevice({ ...newDevice, ip: e.target.value })}
                    placeholder="192.168.1.100"
                    className={`${inputClassName} text-sm`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Port</label>
                  <input
                    type="number"
                    value={newDevice.port}
                    onChange={(e) => setNewDevice({ ...newDevice, port: parseInt(e.target.value) || 4370 })}
                    className={`${inputClassName} text-sm`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Location</label>
                  <input
                    type="text"
                    value={newDevice.location}
                    onChange={(e) => setNewDevice({ ...newDevice, location: e.target.value })}
                    placeholder="Main entrance"
                    className={`${inputClassName} text-sm`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Sync Frequency</label>
                  <select
                    value={newDevice.syncFrequency}
                    onChange={(e) => setNewDevice({ ...newDevice, syncFrequency: e.target.value })}
                    className={`${selectClassName} text-sm`}
                  >
                    {SYNC_FREQUENCIES.map((f) => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={addDevice}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover transition-colors"
                >
                  <Check className="h-3.5 w-3.5" />
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddDevice(false);
                    setNewDevice(emptyDevice);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Devices List */}
          {settings.biometricDevices.length > 0 ? (
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-background border-b border-border">
                    <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-3 py-2">
                      Name
                    </th>
                    <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-3 py-2">
                      Type
                    </th>
                    <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-3 py-2">
                      IP:Port
                    </th>
                    <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-3 py-2">
                      Location
                    </th>
                    <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-3 py-2">
                      Sync
                    </th>
                    <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-3 py-2">
                      Status
                    </th>
                    <th className="text-right text-xs font-semibold text-text-muted uppercase tracking-wider px-3 py-2 w-16">
                      Remove
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {settings.biometricDevices.map((device, idx) => (
                    <tr key={device.id || idx} className="bg-card hover:bg-background/50 transition-colors">
                      <td className="px-3 py-2 text-sm text-text font-medium">{device.name}</td>
                      <td className="px-3 py-2 text-sm text-text-muted">
                        {DEVICE_TYPES.find((t) => t.value === device.type)?.label || device.type}
                      </td>
                      <td className="px-3 py-2 text-sm text-text-muted font-mono">
                        {device.ip}:{device.port}
                      </td>
                      <td className="px-3 py-2 text-sm text-text-muted">{device.location || '--'}</td>
                      <td className="px-3 py-2 text-sm text-text-muted">
                        {SYNC_FREQUENCIES.find((f) => f.value === device.syncFrequency)?.label || device.syncFrequency}
                      </td>
                      <td className="px-3 py-2 text-sm">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            device.status === 'active'
                              ? 'bg-green-50 text-green-700'
                              : 'bg-red-50 text-red-700'
                          }`}
                        >
                          {device.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => removeDevice(idx)}
                          className="p-1 rounded-lg text-text-muted hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Remove"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-text-muted py-2">
              No biometric devices configured. Click &quot;Add Device&quot; to add one.
            </p>
          )}
        </div>

        {/* Geo-Fence Settings */}
        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold text-text flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Geo-Fence Settings
          </h3>
          {renderToggle(
            settings.geoFenceEnabled,
            (v) => setSettings({ ...settings, geoFenceEnabled: v }),
            'Enable Geo-Fence',
          )}
          {settings.geoFenceEnabled && (
            <div className="pt-2">
              <label className="block text-xs font-medium text-text-muted mb-1">Default Radius (meters)</label>
              <input
                type="number"
                value={settings.geoFenceDefaultRadius}
                onChange={(e) =>
                  setSettings({ ...settings, geoFenceDefaultRadius: parseInt(e.target.value) || 0 })
                }
                className={`${inputClassName} text-sm w-40`}
              />
            </div>
          )}
        </div>

        {/* WiFi Settings */}
        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold text-text flex items-center gap-2">
            <Wifi className="h-4 w-4" />
            WiFi Settings
          </h3>
          {renderToggle(
            settings.wifiEnabled,
            (v) => setSettings({ ...settings, wifiEnabled: v }),
            'Enable WiFi Validation',
          )}
          {settings.wifiEnabled && (
            <div className="pt-2">
              <label className="block text-xs font-medium text-text-muted mb-1">Allowed WiFi Networks (comma separated)</label>
              <textarea
                value={settings.wifiNetworks}
                onChange={(e) => setSettings({ ...settings, wifiNetworks: e.target.value })}
                rows={3}
                placeholder="Office-WiFi-5G, Office-WiFi-2.4G"
                className={`${inputClassName} text-sm`}
              />
            </div>
          )}
        </div>

        {/* External System Sync */}
        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold text-text flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            External System Sync
          </h3>
          {renderToggle(
            settings.externalSyncEnabled,
            (v) => setSettings({ ...settings, externalSyncEnabled: v }),
            'Enable External Sync',
          )}
          {settings.externalSyncEnabled && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Provider Name</label>
                <input
                  type="text"
                  value={settings.externalProvider}
                  onChange={(e) => setSettings({ ...settings, externalProvider: e.target.value })}
                  placeholder="e.g. SAP, ADP"
                  className={`${inputClassName} text-sm`}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">API Endpoint</label>
                <input
                  type="text"
                  value={settings.externalApiEndpoint}
                  onChange={(e) => setSettings({ ...settings, externalApiEndpoint: e.target.value })}
                  placeholder="https://api.example.com/sync"
                  className={`${inputClassName} text-sm`}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Sync Frequency</label>
                <select
                  value={settings.externalSyncFrequency}
                  onChange={(e) => setSettings({ ...settings, externalSyncFrequency: e.target.value })}
                  className={`${selectClassName} text-sm`}
                >
                  {SYNC_FREQUENCIES.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Save Button */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover transition-colors disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
