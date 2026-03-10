'use client';
import { useAuthStore } from '@/lib/auth-store';
import AdminDashboard from './admin-dashboard';
import ManagerDashboard from './manager-dashboard';
import EmployeeDashboard from './employee-dashboard';

interface Props { moduleId: string; }

export default function WorkforcePlanningFeatureMode({ moduleId: _moduleId }: Props) {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'super_admin' || user?.role === 'admin';
  const isManager = user?.role === 'manager';
  if (isAdmin) return <AdminDashboard />;
  if (isManager) return <ManagerDashboard />;
  return <EmployeeDashboard />;
}
