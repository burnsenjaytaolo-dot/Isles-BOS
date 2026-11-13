import React, { useState, useRef, useEffect } from 'react';
import {
  Menu,
  Bell,
  Building2,
  Plus,
  Download,
  Calendar,
  ChevronDown,
  Check,
  User as UserIcon,
  Mail,
} from 'lucide-react';
import {
  BusinessMembershipIndex,
  BusinessSettings,
  Invitation,
  PermissionSet,
} from '../types';
import { DateRangeFilter } from '../utils/analytics';
import { TabId, NAV_ITEMS } from './Sidebar';

interface TopHeaderProps {
  activeTab: TabId;
  onSelectTab?: (tab: TabId) => void;
  isDesktopSidebarOpen?: boolean;
  settings: BusinessSettings;
  dateRange: DateRangeFilter;
  onChangeDateRange: (range: DateRangeFilter) => void;
  lowStockCount: number;
  onOpenMobileMenu: () => void;
  onOpenNotifications: () => void;
  onPrimaryAction: () => void;
  memberships: BusinessMembershipIndex[];
  activeBusinessId: string | null;
  pendingInvites: Invitation[];
  onSwitchBusiness: (businessId: string) => void;
  onOpenCreateBusiness: () => void;
  onAcceptInvite: (inviteId: string) => Promise<void>;
  onOpenAccountModal: () => void;
  userDisplayName: string;
  permissions: PermissionSet;
}

const PAGE_META: Record<
  TabId,
  {
    title: string;
    subtitle: string;
    primaryLabel: string;
    showDateFilter: boolean;
    permKey?: keyof PermissionSet;
  }
> = {
  home: {
    title: 'Business Dashboard',
    subtitle: 'Overview of sales performance, customer credit, stock alerts, and net balance.',
    primaryLabel: '+ New Sale',
    showDateFilter: true,
    permKey: 'canCreateSale',
  },
  sales: {
    title: 'Sales & Invoices',
    subtitle: 'Create invoices, manage payment statuses, and print customer receipts.',
    primaryLabel: '+ New Sale',
    showDateFilter: true,
    permKey: 'canCreateSale',
  },
  stock: {
    title: 'Stock & Inventory',
    subtitle: 'Manage products, restock quantities, unit costs, and alert thresholds.',
    primaryLabel: '+ Add Product',
    showDateFilter: false,
    permKey: 'canManageStock',
  },
  customers: {
    title: 'Customers',
    subtitle: 'Directory of customer accounts, credit balances, and payment statements.',
    primaryLabel: '+ Add Customer',
    showDateFilter: false,
    permKey: 'canManageCustomers',
  },
  money: {
    title: 'Money & Expenses',
    subtitle: 'Track revenue, operating expenses, payment methods, and net cash position.',
    primaryLabel: '+ Add Expense',
    showDateFilter: true,
    permKey: 'canManageExpenses',
  },
  settings: {
    title: 'Settings & Team',
    subtitle: 'Configure business profile, staff RBAC roles, invitations, and backups.',
    primaryLabel: 'Export Backup',
    showDateFilter: false,
    permKey: 'canExportData',
  },
};

export const TopHeader: React.FC<TopHeaderProps> = ({
  activeTab,
  onSelectTab,
  isDesktopSidebarOpen = true,
  settings,
  dateRange,
  onChangeDateRange,
  lowStockCount,
  onOpenMobileMenu,
  onOpenNotifications,
  onPrimaryAction,
  memberships,
  activeBusinessId,
  pendingInvites,
  onSwitchBusiness,
  onOpenCreateBusiness,
  onAcceptInvite,
  onOpenAccountModal,
  userDisplayName,
  permissions,
}) => {
  const meta = PAGE_META[activeTab];
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [acceptingInviteId, setAcceptingInviteId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setSwitcherOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const canRunPrimary = meta.permKey ? permissions[meta.permKey] : true;

  const visibleTabs = NAV_ITEMS.filter((item) => permissions[item.permKey]);

  return (
    <header className="sticky top-0 z-20 bg-white border-b border-[#E2E8F0]">
      <div className="px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Navigation Toggle + Page Title */}
        <div className="flex items-center gap-3 min-w-0 flex-1 basis-56">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            aria-label="Toggle navigation menu"
            className="h-9 w-9 rounded-lg border border-[#E2E8F0] bg-white hover:bg-slate-50 text-slate-700 flex items-center justify-center shrink-0 transition-colors"
          >
            <Menu className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <h1 className="text-[18px] sm:text-[20px] font-bold text-[#111827] leading-tight truncate">
              {meta.title}
            </h1>
            <p className="text-[12px] text-[#64748B] leading-snug truncate hidden xl:block">
              {meta.subtitle}
            </p>
          </div>
        </div>

        {/* Right: Multi-Business Switcher, Date Filter, Alerts, Account, Primary Action */}
        <div className="flex flex-wrap items-center gap-2 min-w-0 max-w-full">
          {/* Multi-Business Switcher */}
          <div className="relative min-w-0 max-w-full" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setSwitcherOpen((o) => !o)}
              aria-expanded={switcherOpen}
              aria-label="Switch business"
              className="flex items-center gap-2 h-9 px-3 rounded-lg border border-[#E2E8F0] bg-white hover:bg-slate-50 text-xs font-semibold text-[#111827] max-w-[180px] sm:max-w-[220px] transition-colors"
            >
              <Building2 className="w-3.5 h-3.5 text-[#2563EB] shrink-0" />
              <span className="truncate">{settings.businessName}</span>
              {pendingInvites.length > 0 && (
                <span className="px-1.5 py-0.5 rounded bg-[#2563EB] text-white text-[10px] font-bold leading-none shrink-0">
                  {pendingInvites.length}
                </span>
              )}
              <ChevronDown className="w-3.5 h-3.5 text-[#64748B] shrink-0" />
            </button>

            {switcherOpen && (
              <div className="absolute left-0 lg:left-auto lg:right-0 mt-1.5 w-72 max-w-[calc(100vw-2rem)] bg-white border border-[#E2E8F0] rounded-xl shadow-lg z-40 overflow-hidden">
                <div className="px-3.5 py-2.5 bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                  Authorized Businesses ({memberships.length})
                </div>

                <div className="max-h-60 overflow-y-auto divide-y divide-[#E2E8F0]">
                  {memberships.map((m) => {
                    const isActive = m.businessId === activeBusinessId;
                    return (
                      <button
                        key={m.businessId}
                        type="button"
                        onClick={() => {
                          onSwitchBusiness(m.businessId);
                          setSwitcherOpen(false);
                        }}
                        className={`w-full px-3.5 py-2.5 text-left flex items-center justify-between gap-2 transition-colors ${
                          isActive ? 'bg-blue-50/60' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-[#111827] truncate">
                            {m.businessName}
                          </div>
                          <div className="text-[11px] text-[#64748B] truncate">
                            {m.businessType} · <span className="font-semibold">{m.role}</span>
                          </div>
                        </div>
                        {isActive && <Check className="w-4 h-4 text-[#2563EB] shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                {pendingInvites.length > 0 && (
                  <div className="border-t border-[#E2E8F0] bg-blue-50/60 p-3 space-y-2">
                    <div className="text-[11px] font-bold text-[#1D4ED8] flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5" />
                      <span>Pending Invitations</span>
                    </div>
                    {pendingInvites.map((inv) => (
                      <div
                        key={inv.id}
                        className="bg-white border border-blue-200 rounded p-2 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-[#111827] truncate">
                            {inv.businessName}
                          </div>
                          <div className="text-[10px] text-[#64748B]">Role: {inv.role}</div>
                        </div>
                        <button
                          type="button"
                          disabled={acceptingInviteId === inv.id}
                          onClick={async () => {
                            setAcceptingInviteId(inv.id);
                            try {
                              await onAcceptInvite(inv.id);
                              setSwitcherOpen(false);
                            } finally {
                              setAcceptingInviteId(null);
                            }
                          }}
                          className="h-7 px-2.5 rounded bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[11px] font-semibold shrink-0"
                        >
                          {acceptingInviteId === inv.id ? '...' : 'Join'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="p-2 border-t border-[#E2E8F0] bg-[#F8FAFC]">
                  <button
                    type="button"
                    onClick={() => {
                      setSwitcherOpen(false);
                      onOpenCreateBusiness();
                    }}
                    className="w-full h-8 px-3 rounded-md bg-white hover:bg-slate-50 border border-[#E2E8F0] text-xs font-semibold text-[#2563EB] inline-flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create New Business</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Date Range Selector */}
          {meta.showDateFilter && (
            <div className="relative flex items-center">
              <Calendar className="w-3.5 h-3.5 text-[#64748B] absolute left-2.5 pointer-events-none" />
              <select
                aria-label="Date range filter"
                value={dateRange}
                onChange={(e) => onChangeDateRange(e.target.value as DateRangeFilter)}
                className="h-9 pl-8 pr-7 rounded-lg border border-[#E2E8F0] bg-white hover:bg-slate-50 text-xs font-medium text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] cursor-pointer"
              >
                <option value="all">All Time</option>
                <option value="30d">Last 30 Days</option>
                <option value="7d">Last 7 Days</option>
                <option value="today">Today</option>
              </select>
            </div>
          )}

          {/* Notifications Button */}
          <button
            type="button"
            onClick={onOpenNotifications}
            aria-label={`Low stock notifications (${lowStockCount} active)`}
            className="relative h-9 px-2.5 rounded-lg border border-[#E2E8F0] bg-white hover:bg-slate-50 text-[#111827] flex items-center gap-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0"
          >
            <Bell className={`w-4 h-4 ${lowStockCount > 0 ? 'text-[#F59E0B]' : 'text-[#64748B]'}`} />
            <span className="hidden sm:inline">Alerts</span>
            {lowStockCount > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-[#DC2626] text-white text-[10px] font-bold leading-none tabular-nums">
                {lowStockCount}
              </span>
            )}
          </button>

          {/* Account Menu Button */}
          <button
            type="button"
            onClick={onOpenAccountModal}
            aria-label="User account settings"
            className="h-9 px-2.5 rounded-lg border border-[#E2E8F0] bg-white hover:bg-slate-50 text-[#111827] flex items-center gap-1.5 text-xs font-medium transition-colors max-w-[140px]"
          >
            <UserIcon className="w-3.5 h-3.5 text-[#64748B] shrink-0" />
            <span className="hidden md:inline truncate">{userDisplayName}</span>
          </button>

          {/* Primary Action */}
          {canRunPrimary && (
            <button
              type="button"
              onClick={onPrimaryAction}
              className="h-9 px-3.5 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
            >
              {activeTab === 'settings' ? (
                <Download className="w-3.5 h-3.5" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              <span>{meta.primaryLabel.replace(/^\+\s*/, '')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Horizontal Tab Strip when Desktop Sidebar is Collapsed */}
      {!isDesktopSidebarOpen && onSelectTab && (
        <nav
          aria-label="Horizontal workspace tabs"
          className="hidden lg:flex items-center gap-1 px-4 sm:px-6 py-2 bg-[#F8FAFC] border-t border-[#E2E8F0] overflow-x-auto"
        >
          {visibleTabs.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`h-8 px-3 rounded-md inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-[#2563EB] text-white'
                    : 'text-[#64748B] hover:text-[#111827] hover:bg-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      )}
    </header>
  );
};
