'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  LogOut,
  LayoutDashboard,
  Rocket,
  Users,
  Clock,
  CalendarOff,
  ClipboardList,
  UserPlus,
  ArrowRightLeft,
  TrendingUp,
  GraduationCap,
  Trophy,
  Heart,
  Layout,
  Wallet,
  Receipt,
  ShieldCheck,
  Network,
  Plug,
  BarChart3,
  FlaskConical,
  type LucideIcon,
} from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { MODULE_LIST } from '@hrms/shared';

const MODULE_ICONS: Record<string, LucideIcon> = {
  Rocket, Users, Clock, CalendarOff, ClipboardList, UserPlus,
  ArrowRightLeft, TrendingUp, GraduationCap, Trophy, Heart,
  Layout, Wallet, Receipt, ShieldCheck, Network, Plug,
  BarChart3, FlaskConical,
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, loadFromStorage, logout } = useAuthStore();

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  // Show nothing while checking auth
  if (isLoading || !isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-text-muted">Loading...</p>
      </div>
    );
  }

  const roleBadgeColor: Record<string, string> = {
    super_admin: 'bg-purple-100 text-purple-700',
    admin: 'bg-blue-100 text-blue-700',
    manager: 'bg-green-100 text-green-700',
    employee: 'bg-gray-100 text-gray-700',
  };

  const roleLabel: Record<string, string> = {
    super_admin: 'Super Admin',
    admin: 'Admin',
    manager: 'Manager',
    employee: 'Employee',
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r border-border flex flex-col fixed inset-y-0 left-0 z-10">
        {/* Org Name */}
        <div className="p-4 border-b border-border">
          <h2 className="font-bold text-text text-lg truncate">{user.orgName}</h2>
          <p className="text-xs text-text-muted mt-0.5">HRMS Platform</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {/* Dashboard Link */}
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-text hover:bg-background transition-colors font-medium text-sm"
          >
            <LayoutDashboard className="h-4 w-4 text-text-muted" />
            Dashboard
          </Link>

          {/* Divider */}
          <div className="border-t border-border my-3" />

          {/* Module List */}
          <p className="px-3 py-1 text-xs font-semibold text-text-muted uppercase tracking-wider">
            Modules
          </p>
          {MODULE_LIST.map((mod) => (
            <Link
              key={mod.id}
              href="/dashboard"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-text hover:bg-background transition-colors text-sm"
            >
              {(() => {
                const Icon = MODULE_ICONS[mod.icon];
                return Icon ? <Icon className="h-4 w-4 text-text-muted shrink-0" /> : <span className="h-4 w-4" />;
              })()}
              <span className="truncate">{mod.name}</span>
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 ml-64 flex flex-col">
        {/* Top Bar */}
        <header className="h-14 bg-card border-b border-border flex items-center justify-between px-6 sticky top-0 z-10">
          <div />
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-text">
                {user.firstName} {user.lastName}
              </span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleBadgeColor[user.role] || 'bg-gray-100 text-gray-700'}`}
              >
                {roleLabel[user.role] || user.role}
              </span>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
