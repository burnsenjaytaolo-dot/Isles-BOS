import React from 'react';
import {
  LayoutDashboard,
  FileText,
  Package,
  Users,
  Wallet,
  Settings,
  Cloud,
  X,
} from 'lucide-react';
import { PermissionSet, UserRole } from '../types';

export type TabId = 'home' | 'sales' | 'stock' | 'customers' | 'money' | 'settings';

interface SidebarProps {
  activeTab: TabId;
  onSelectTab: (tab: TabId) => void;
  isOpenDesktop?: boolean;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  recordCounts: {
    sales: number;
    products: number;
    customers: number;
  };
  lowStockCount: number;
  unpaidCount: number;
  permissions: PermissionSet;
  businessName: string;
  userRole?: UserRole | null;
  syncError?: string | null;
}

export const NAV_ITEMS: {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  permKey: keyof PermissionSet;
}[] = [
  { id: 'home', label: 'Dashboard', icon: LayoutDashboard, permKey: 'canViewDashboard' },
  { id: 'sales', label: 'Sales & Invoices', icon: FileText, permKey: 'canViewSales' },
  { id: 'stock', label: 'Stock & Inventory', icon: Package, permKey: 'canViewStock' },
  { id: 'customers', label: 'Customers', icon: Users, permKey: 'canViewCustomers' },
  { id: 'money', label: 'Money & Expenses', icon: Wallet, permKey: 'canViewMoney' },
  { id: 'settings', label: 'Settings & Team', icon: Settings, permKey: 'canViewSettings' },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  isOpenDesktop = true,
  isOpenMobile,
  onCloseMobile,
  recordCounts,
  lowStockCount,
  unpaidCount,
  permissions,
  businessName,
  userRole,
  syncError,
}) => {
  const handleSelect = (id: TabId) => {
    onSelectTab(id);
    onCloseMobile();
  };

  const visibleItems = NAV_ITEMS.filter((item) => permissions[item.permKey]);

  const sidebarContent = (
    <div className="flex flex-col h-full w-60 bg-[#0F172A] text-slate-200 select-none">
      {/* Brand Header */}
      <div className="h-16 px-5 flex items-center justify-between border-b border-slate-800/80 shrink-0">
        <div>
          <div className="text-[15px] font-bold tracking-wider text-white leading-tight">
            ISLES BOS
          </div>
          <div className="text-[11px] text-slate-400 font-medium leading-tight mt-0.5">
            Business Operating System
          </div>
        </div>
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Close navigation menu"
          className="lg:hidden p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-[#1E293B] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation Links */}
      <nav aria-label="Primary navigation" className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-2.5 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Operations
        </div>
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const badge =
            item.id === 'stock' && lowStockCount > 0
              ? { count: lowStockCount, tone: 'bg-amber-500/20 text-amber-300' }
              : item.id === 'sales' && unpaidCount > 0
              ? { count: unpaidCount, tone: 'bg-slate-700 text-slate-200' }
              : null;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelect(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`w-full h-10 px-3 rounded-lg flex items-center justify-between text-[13px] font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-[#1E293B] text-white border border-[#2563EB]/60'
                  : 'text-slate-400 border border-transparent hover:bg-[#1E293B]/60 hover:text-slate-100'
              }`}
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-[#60A5FA]' : 'text-slate-400'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </span>
              {badge && (
                <span
                  className={`ml-2 px-1.5 py-0.5 rounded text-[11px] font-semibold tabular-nums shrink-0 ${badge.tone}`}
                >
                  {badge.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Cloud Tenant Status Panel */}
      <div className="p-3 border-t border-slate-800/80 shrink-0">
        <div className="bg-[#1E293B] border border-slate-700/70 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-200 min-w-0">
              <Cloud
                className={`w-3.5 h-3.5 shrink-0 ${
                  syncError ? 'text-[#F59E0B]' : 'text-[#60A5FA]'
                }`}
              />
              <span className="truncate">{businessName || 'Workspace'}</span>
            </div>
            {userRole && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 shrink-0">
                {userRole}
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-400 leading-relaxed tabular-nums">
            {recordCounts.sales} invoices · {recordCounts.products} items · {recordCounts.customers}{' '}
            customers
          </div>
          {permissions.canViewSettings && (
            <button
              type="button"
              onClick={() => handleSelect('settings')}
              className="w-full py-1.5 px-2.5 rounded-md bg-slate-800 hover:bg-slate-700 text-[11px] font-medium text-slate-200 border border-slate-700 transition-colors text-center"
            >
              Settings, Team &amp; Export
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside
        className={`${
          isOpenDesktop ? 'hidden lg:block' : 'hidden'
        } fixed inset-y-0 left-0 z-30 w-60 border-r border-slate-800`}
      >
        {sidebarContent}
      </aside>

      {/* Tablet / Mobile Drawer */}
      {isOpenMobile && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-[1px]"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative z-10 h-full w-60 shadow-xl">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
};
