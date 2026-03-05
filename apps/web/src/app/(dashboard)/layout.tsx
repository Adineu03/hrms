'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
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
  Lock,
  type LucideIcon,
} from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { useModuleStore } from '@/lib/module-store';
import type { ModuleWithStatus } from '@hrms/shared';
import ModuleActivationDialog from '@/components/module-activation-dialog';

const MODULE_ICONS: Record<string, LucideIcon> = {
  Rocket, Users, Clock, CalendarOff, ClipboardList, UserPlus,
  ArrowRightLeft, TrendingUp, GraduationCap, Trophy, Heart,
  Layout, Wallet, Receipt, ShieldCheck, Network, Plug,
  BarChart3, FlaskConical,
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading: authLoading, loadFromStorage, logout } = useAuthStore();
  const { modules, isLoading: modulesLoading, fetchModules } = useModuleStore();
  const [dialogModule, setDialogModule] = useState<ModuleWithStatus | null>(null);

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchModules();
    }
  }, [isAuthenticated, fetchModules]);

  // Show nothing while checking auth
  if (authLoading || !isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-text-muted">Loading...</p>
      </div>
    );
  }

  const isAdmin = user.role === 'super_admin' || user.role === 'admin';

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

  const handleModuleClick = (mod: ModuleWithStatus) => {
    if (mod.activationStatus === 'locked') {
      // Locked modules: show activation dialog for admins so they see the lock reason
      if (isAdmin) {
        setDialogModule(mod);
      }
      return;
    }

    if (mod.activationStatus === 'inactive') {
      // Inactive modules: admins get the activation dialog
      if (isAdmin) {
        setDialogModule(mod);
      }
      return;
    }

    // Active modules: navigate to the module page
    router.push(`/dashboard/modules/${mod.id}`);
  };

  const isModuleActive = (moduleId: string) =>
    pathname === `/dashboard/modules/${moduleId}`;

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
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-text hover:bg-background transition-colors font-medium text-sm ${
              pathname === '/dashboard' ? 'bg-background' : ''
            }`}
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

          {modulesLoading ? (
            // Skeleton loading state
            <div className="space-y-1">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-3 py-2"
                >
                  <div className="h-4 w-4 rounded bg-border animate-pulse" />
                  <div className="h-3.5 rounded bg-border animate-pulse flex-1" />
                </div>
              ))}
            </div>
          ) : (
            modules.map((mod) => {
              const Icon = MODULE_ICONS[mod.icon];
              const isLocked = mod.activationStatus === 'locked';
              const isInactive = mod.activationStatus === 'inactive';
              const isSetupIncomplete = mod.isActive && mod.setupStatus !== 'completed';
              const isCurrentModule = isModuleActive(mod.id);

              return (
                <button
                  key={mod.id}
                  onClick={() => handleModuleClick(mod)}
                  title={isLocked && mod.lockReason ? mod.lockReason : mod.name}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-left ${
                    isCurrentModule
                      ? 'bg-background font-medium'
                      : 'hover:bg-background'
                  } ${isLocked || isInactive ? 'opacity-50' : ''} ${
                    !isAdmin && (isLocked || isInactive) ? 'cursor-default' : 'cursor-pointer'
                  }`}
                >
                  {/* Icon */}
                  <span className="relative shrink-0">
                    {isLocked ? (
                      <Lock className="h-4 w-4 text-text-muted" />
                    ) : Icon ? (
                      <Icon
                        className={`h-4 w-4 ${
                          isInactive ? 'text-text-muted' : 'text-primary'
                        }`}
                      />
                    ) : (
                      <span className="h-4 w-4" />
                    )}
                    {/* Setup incomplete dot indicator */}
                    {isSetupIncomplete && (
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-yellow-400 rounded-full border border-card" />
                    )}
                  </span>

                  {/* Name */}
                  <span
                    className={`truncate ${
                      isLocked || isInactive
                        ? 'text-text-muted'
                        : 'text-text'
                    }`}
                  >
                    {mod.name}
                  </span>
                </button>
              );
            })
          )}
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

      {/* Module Activation Dialog */}
      {dialogModule && (
        <ModuleActivationDialog
          module={dialogModule}
          onClose={() => setDialogModule(null)}
        />
      )}
    </div>
  );
}
