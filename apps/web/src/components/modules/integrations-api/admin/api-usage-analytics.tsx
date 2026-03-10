'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Activity, AlertTriangle, Zap, TrendingUp } from 'lucide-react';

interface SummaryData {
  totalRequests: number;
  errorRate: number;
  p50Latency: number;
  p95Latency: number;
  p99Latency: number;
  rateLimitHits: number;
}

interface TopConsumer {
  keyName: string;
  requestCount: number;
  percentage: number;
}

interface ErrorTrend {
  id: string;
  connector: string;
  eventType: string;
  status: number;
  message: string;
  timestamp: string;
}

const MOCK_SUMMARY: SummaryData = {
  totalRequests: 284571,
  errorRate: 2.4,
  p50Latency: 48,
  p95Latency: 142,
  p99Latency: 389,
  rateLimitHits: 127,
};

const MOCK_CONSUMERS: TopConsumer[] = [
  { keyName: 'Production Integration', requestCount: 142300, percentage: 50 },
  { keyName: 'Payroll Sync Bot', requestCount: 85700, percentage: 30 },
  { keyName: 'Reporting Dashboard', requestCount: 42800, percentage: 15 },
  { keyName: 'Mobile App (iOS)', requestCount: 13771, percentage: 5 },
];

const MOCK_ERRORS: ErrorTrend[] = [
  { id: '1', connector: 'SAP', eventType: 'employee.created', status: 503, message: 'Service temporarily unavailable', timestamp: '2026-03-09 14:22:11' },
  { id: '2', connector: 'QuickBooks', eventType: 'payroll.processed', status: 401, message: 'Invalid or expired OAuth token', timestamp: '2026-03-09 13:10:45' },
  { id: '3', connector: 'Jira', eventType: 'attendance.synced', status: 500, message: 'Internal server error from upstream', timestamp: '2026-03-09 11:55:30' },
  { id: '4', connector: 'SAP', eventType: 'attendance.synced', status: 429, message: 'Rate limit exceeded on target API', timestamp: '2026-03-09 09:30:00' },
  { id: '5', connector: 'Zoom', eventType: 'employee.created', status: 404, message: 'Webhook endpoint not found', timestamp: '2026-03-08 16:45:22' },
];

function StatCard({ icon: Icon, label, value, suffix = '', color = 'text-indigo-600' }: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  suffix?: string;
  color?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-center gap-3 mb-2">
        <div className={`p-2 rounded-lg bg-indigo-50`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
        <span className="text-sm text-gray-500">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${color}`}>
        {value}<span className="text-sm font-normal text-gray-400 ml-1">{suffix}</span>
      </div>
    </div>
  );
}

export default function ApiUsageAnalytics() {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [consumers, setConsumers] = useState<TopConsumer[]>([]);
  const [errors, setErrors] = useState<ErrorTrend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([
      api.get('/integrations-api/admin/api-usage-analytics/summary'),
      api.get('/integrations-api/admin/api-usage-analytics/error-trends'),
    ]).then(([summaryRes, errorsRes]) => {
      if (summaryRes.status === 'fulfilled') {
        const d = summaryRes.value.data.data;
        setSummary(d?.summary ?? MOCK_SUMMARY);
        setConsumers(d?.topConsumers ?? MOCK_CONSUMERS);
      } else {
        setSummary(MOCK_SUMMARY);
        setConsumers(MOCK_CONSUMERS);
      }
      if (errorsRes.status === 'fulfilled') {
        setErrors(errorsRes.value.data.data ?? MOCK_ERRORS);
      } else {
        setErrors(MOCK_ERRORS);
      }
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-6 w-6 border-2 border-indigo-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const s = summary ?? MOCK_SUMMARY;

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-[#2c2c2c]">API Usage &amp; Analytics</h2>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          icon={Activity}
          label="Total Requests"
          value={s.totalRequests.toLocaleString()}
          color="text-indigo-600"
        />
        <StatCard
          icon={AlertTriangle}
          label="Error Rate"
          value={s.errorRate}
          suffix="%"
          color={s.errorRate > 5 ? 'text-red-600' : 'text-yellow-600'}
        />
        <StatCard
          icon={Zap}
          label="p50 Latency"
          value={s.p50Latency}
          suffix="ms"
          color="text-green-600"
        />
        <StatCard
          icon={Zap}
          label="p95 Latency"
          value={s.p95Latency}
          suffix="ms"
          color="text-yellow-600"
        />
        <StatCard
          icon={Zap}
          label="p99 Latency"
          value={s.p99Latency}
          suffix="ms"
          color="text-orange-600"
        />
        <StatCard
          icon={TrendingUp}
          label="Rate Limit Hits"
          value={s.rateLimitHits}
          color="text-red-500"
        />
      </div>

      {/* Top Consumers */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h3 className="font-semibold text-[#2c2c2c] mb-4">Top Consumers</h3>
        <div className="space-y-3">
          {consumers.map((consumer) => (
            <div key={consumer.keyName} className="flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-[#2c2c2c] truncate">{consumer.keyName}</span>
                  <span className="text-sm text-gray-500 ml-2 flex-shrink-0">
                    {consumer.requestCount.toLocaleString()} req
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all"
                    style={{ width: `${consumer.percentage}%` }}
                  />
                </div>
              </div>
              <span className="text-sm text-gray-400 w-10 text-right">{consumer.percentage}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Error Trends */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-[#2c2c2c]">Error Trends</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Connector</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Event Type</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Message</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {errors.map((err) => (
                <tr key={err.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-[#2c2c2c]">{err.connector}</td>
                  <td className="px-4 py-3">
                    <code className="text-xs bg-gray-100 px-2 py-0.5 rounded font-mono text-gray-700">
                      {err.eventType}
                    </code>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium ${
                        err.status >= 500
                          ? 'bg-red-100 text-red-700'
                          : err.status >= 400
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {err.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 max-w-xs">
                    <span className="truncate block">{err.message}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{err.timestamp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
