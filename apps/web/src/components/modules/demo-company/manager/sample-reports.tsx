'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { FileText, Download, Users, Calendar, Clock, Star } from 'lucide-react';

interface SampleReport {
  id: string;
  name: string;
  description: string;
  type: 'headcount' | 'leave' | 'attendance' | 'performance';
  lastUpdated: string;
}

const REPORT_ICONS: Record<SampleReport['type'], React.ElementType> = {
  headcount: Users,
  leave: Calendar,
  attendance: Clock,
  performance: Star,
};

const REPORT_COLORS: Record<SampleReport['type'], { icon: string; badge: string }> = {
  headcount: { icon: 'text-indigo-600 bg-indigo-50', badge: 'bg-indigo-100 text-indigo-700' },
  leave: { icon: 'text-amber-600 bg-amber-50', badge: 'bg-amber-100 text-amber-700' },
  attendance: { icon: 'text-green-600 bg-green-50', badge: 'bg-green-100 text-green-700' },
  performance: { icon: 'text-purple-600 bg-purple-50', badge: 'bg-purple-100 text-purple-700' },
};

const REPORT_TYPE_LABELS: Record<SampleReport['type'], string> = {
  headcount: 'Team Headcount',
  leave: 'Leave Summary',
  attendance: 'Attendance Rate',
  performance: 'Performance Distribution',
};

const FALLBACK_REPORTS: SampleReport[] = [
  {
    id: 'headcount',
    name: 'Team Headcount',
    description: 'Current headcount breakdown by department, designation, and employment type with monthly trends.',
    type: 'headcount',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'leave',
    name: 'Leave Summary',
    description: 'Leave balance utilization, pending approvals, and leave type distribution across your team.',
    type: 'leave',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'attendance',
    name: 'Attendance Rate',
    description: 'Daily attendance rates, late arrivals, early departures, and absenteeism patterns.',
    type: 'attendance',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'performance',
    name: 'Performance Distribution',
    description: 'Performance rating distribution, goal completion rates, and top performers in your team.',
    type: 'performance',
    lastUpdated: new Date().toISOString(),
  },
];

export default function SampleReports() {
  const [reports, setReports] = useState<SampleReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState<{ id: string; format: 'pdf' | 'csv' } | null>(null);

  useEffect(() => {
    api.get('/demo-company/manager/sample-reports')
      .then((r) => setReports(r.data.data ?? FALLBACK_REPORTS))
      .catch(() => {
        setReports(FALLBACK_REPORTS);
        setError('');
      })
      .finally(() => setLoading(false));
  }, []);

  const handleDownload = async (reportId: string, format: 'pdf' | 'csv') => {
    setDownloading({ id: reportId, format });
    try {
      const res = await api.get(
        `/demo-company/manager/sample-reports/${reportId}/download`,
        { params: { format }, responseType: 'blob' }
      );
      const report = reports.find((r) => r.id === reportId);
      const ext = format === 'pdf' ? 'pdf' : 'csv';
      const filename = `${report?.name.replace(/\s+/g, '-').toLowerCase() ?? reportId}.${ext}`;
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      // silently ignore download errors
    } finally {
      setDownloading(null);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center text-gray-400 text-sm">
        Loading sample reports...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-[#2c2c2c]">Sample Reports</h2>
        <p className="text-sm text-gray-500 mt-0.5">Pre-generated reports with realistic demo data — download as PDF or CSV</p>
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700">
          Using cached report list. Some live data may be unavailable.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {reports.map((report) => {
          const Icon = REPORT_ICONS[report.type] ?? FileText;
          const colors = REPORT_COLORS[report.type] ?? REPORT_COLORS.headcount;
          const isPdfLoading = downloading?.id === report.id && downloading.format === 'pdf';
          const isCsvLoading = downloading?.id === report.id && downloading.format === 'csv';

          return (
            <div key={report.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className={`p-3 rounded-xl flex-shrink-0 ${colors.icon}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-[#2c2c2c]">{report.name}</h3>
                    <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${colors.badge}`}>
                      {REPORT_TYPE_LABELS[report.type]}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">Updated {formatDate(report.lastUpdated)}</p>
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-5">{report.description}</p>

              <div className="flex gap-3">
                <button
                  onClick={() => handleDownload(report.id, 'pdf')}
                  disabled={!!downloading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  {isPdfLoading ? 'Downloading...' : 'Download PDF'}
                </button>
                <button
                  onClick={() => handleDownload(report.id, 'csv')}
                  disabled={!!downloading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  <FileText className="h-4 w-4" />
                  {isCsvLoading ? 'Downloading...' : 'Download CSV'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
        <p className="text-sm text-indigo-700">
          <span className="font-semibold">Note:</span> These reports are generated from demo seed data and are for illustrative purposes only. They show what real reports look like in production.
        </p>
      </div>
    </div>
  );
}
