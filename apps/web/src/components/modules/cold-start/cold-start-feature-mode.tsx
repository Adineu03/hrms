'use client';

import { useAuthStore } from '@/lib/auth-store';
import AdminSettingsDashboard from './admin-settings-dashboard';
import ManagerDashboard from './manager-dashboard';
import EmployeeDashboard from './employee-dashboard';

interface Props {
  moduleId: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function ColdStartFeatureMode({ moduleId }: Props) {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'super_admin' || user?.role === 'admin';
  const isManager = user?.role === 'manager';

  if (isAdmin) return <AdminSettingsDashboard />;
  if (isManager) return <ManagerDashboard />;
  return <EmployeeDashboard />;
}
