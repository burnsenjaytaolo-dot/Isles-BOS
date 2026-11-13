import React, { useState } from 'react';
import { Sale, Product, Customer, Expense, DebtPayment, PermissionSet } from '../types';
import {
  DateRangeFilter,
  computeDashboardMetrics,
  buildSalesChartSeries,
  computeInvoiceStatusBreakdown,
  formatSBD,
  filterByDateRange,
} from '../utils/analytics';
import {
  SalesOverviewChart,
  SalesByPeriodChart,
  BusinessStatusPanel,
} from './charts/SalesCharts';
import {
  TrendingUp,
  Users,
  Package,
  Wallet,
  Plus,
  ArrowDownLeft,
  Receipt,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { TabId } from './Sidebar';

interface HomeTabProps {
  sales: Sale[];
  products: Product[];
  customers: Customer[];
  expenses: Expense[];
  debtPayments: DebtPayment[];
  currency: string;
  dateRange: DateRangeFilter;
  setActiveTab: (tab: TabId) => void;
  onOpenNewSale: () => void;
  onOpenReceivePayment: () => void;
  onOpenAddExpense: () => void;
  onRestockProduct: (product: Product) => void;
  onMarkSalePaid: (saleId: string, total: number) => void;
  permissions: PermissionSet;
}

export const HomeTab: React.FC<HomeTabProps> = ({
  sales,
  products,
  customers,
  expenses,
  debtPayments,
  currency,
  dateRange,
  setActiveTab,
  onOpenNewSale,
  onOpenReceivePayment,
  onOpenAddExpense,
  onRestockProduct,
  onMarkSalePaid,
  permissions,
}) => {
  const [barPeriod, setBarPeriod] = useState<DateRangeFilter>('7d');

  const metrics = computeDashboardMetrics(
    sales,
    products,
    customers,
    expenses,
    debtPayments,
    dateRange
  );

  const overviewSeries = buildSalesChartSeries(
    sales,
    dateRange === 'today' ? '7d' : dateRange
  );
  const barSeries = buildSalesChartSeries(sales, barPeriod);
  const filteredSales = filterByDateRange(sales, dateRange);
  const statusBreakdown = computeInvoiceStatusBreakdown(filteredSales);

  // Recent combined activity sorted newest first
  const recentActivity = [
    ...sales.map((s) => ({
      id: s.id,
      kind: 'Sale' as const,
      title: `Invoice ${s.invoiceNo}`,
      subtitle: s.customerName,
      amount: s.total,
      status: s.status,
      date: new Date(s.date),
      isOutflow: false,
    })),
    ...debtPayments.map((p) => ({
      id: p.id,
      kind: 'Payment' as const,
      title: `Credit Payment`,
      subtitle: p.customerName,
      amount: p.amount,
      status: p.method,
      date: new Date(p.date),
      isOutflow: false,
    })),
    ...expenses.map((e) => ({
      id: e.id,
      kind: 'Expense' as const,
      title: e.category,
      subtitle: e.description.trim(),
      amount: e.amount,
      status: 'Expense',
      date: new Date(e.date),
      isOutflow: true,
    })),
  ]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 7);

  const rangeLabel =
    dateRange === 'today'
      ? 'Today'
      : dateRange === '7d'
      ? 'Last 7 days'
      : dateRange === '30d'
      ? 'Last 30 days'
      : 'All recorded periods';

  return (
    <div className="space-y-5">
      {/* Row 1: Four KPI Cards */}
      <section
        aria-label="Key business metrics"
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-5"
      >
        {/* 1. Total Sales */}
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-4 lg:p-5 flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
              Total Sales
            </span>
            <TrendingUp className="w-4 h-4 text-[#2563EB] shrink-0" />
          </div>
          <div className="mt-2.5 text-2xl xl:text-[25px] 2xl:text-[28px] font-bold text-[#111827] leading-tight tabular-nums break-words">
            {formatSBD(metrics.totalSales, currency)}
          </div>
          <div className="mt-2 text-[12px] text-[#64748B] flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
            <span>{metrics.invoiceCount} {metrics.invoiceCount === 1 ? 'invoice' : 'invoices'}</span>
            <span>{rangeLabel}</span>
          </div>
        </div>

        {/* 2. Outstanding Customer Credit */}
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-4 lg:p-5 flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
              Outstanding Customer Credit
            </span>
            <Users className="w-4 h-4 text-[#F59E0B] shrink-0" />
          </div>
          <div className="mt-2.5 text-2xl xl:text-[25px] 2xl:text-[28px] font-bold text-[#111827] leading-tight tabular-nums break-words">
            {formatSBD(metrics.outstandingCredit, currency)}
          </div>
          <div className="mt-2 text-[12px] flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
            <span className="text-[#64748B]">
              {metrics.creditAccountsCount} {metrics.creditAccountsCount === 1 ? 'account' : 'accounts'} owing
            </span>
            {metrics.outstandingCredit > 0 ? (
              <span className="text-[#F59E0B] font-semibold">Pending</span>
            ) : (
              <span className="text-[#16A34A] font-semibold">Cleared</span>
            )}
          </div>
        </div>

        {/* 3. Inventory Value */}
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-4 lg:p-5 flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
              Inventory Value
            </span>
            <Package className="w-4 h-4 text-[#2563EB] shrink-0" />
          </div>
          <div className="mt-2.5 text-2xl xl:text-[25px] 2xl:text-[28px] font-bold text-[#111827] leading-tight tabular-nums break-words">
            {formatSBD(metrics.inventoryValue, currency)}
          </div>
          <div className="mt-2 text-[12px] flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
            <span className="text-[#64748B]">{metrics.physicalSkuCount} stocked SKUs</span>
            {metrics.lowStockProducts.length > 0 ? (
              <span className="text-[#DC2626] font-semibold">
                {metrics.lowStockProducts.length} low stock
              </span>
            ) : (
              <span className="text-[#16A34A] font-semibold">Stock healthy</span>
            )}
          </div>
        </div>

        {/* 4. Net Balance */}
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-4 lg:p-5 flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
              Net Balance
            </span>
            <Wallet className="w-4 h-4 text-[#16A34A] shrink-0" />
          </div>
          <div
            className={`mt-2.5 text-2xl xl:text-[25px] 2xl:text-[28px] font-bold leading-tight tabular-nums break-words ${
              metrics.netBalance < 0 ? 'text-[#DC2626]' : 'text-[#111827]'
            }`}
          >
            {formatSBD(metrics.netBalance, currency)}
          </div>
          <div className="mt-2 text-[12px] text-[#64748B] flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 tabular-nums">
            <span>Received: {formatSBD(metrics.moneyReceived, currency)}</span>
            <span>Exp: {formatSBD(metrics.totalExpenses, currency)}</span>
          </div>
        </div>
      </section>

      {/* Row 2: Three Analytics Panels */}
      <section
        aria-label="Business analytics"
        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4 lg:gap-5 items-stretch"
      >
        <div className="md:col-span-1 xl:col-span-5 min-w-0">
          <SalesOverviewChart data={overviewSeries} currency={currency} />
        </div>
        <div className="md:col-span-1 xl:col-span-4 min-w-0">
          <SalesByPeriodChart
            data={barSeries}
            period={barPeriod}
            onChangePeriod={setBarPeriod}
            currency={currency}
          />
        </div>
        <div className="md:col-span-2 xl:col-span-3 min-w-0">
          <BusinessStatusPanel
            breakdown={statusBreakdown}
            lowStockCount={metrics.lowStockProducts.length}
            creditAccountsCount={metrics.creditAccountsCount}
            currency={currency}
            onOpenSales={() => setActiveTab('sales')}
            onOpenStock={() => setActiveTab('stock')}
          />
        </div>
      </section>

      {/* Row 3: Recent Business Activity & Needs Attention */}
      <section
        aria-label="Detailed business operations"
        className="grid grid-cols-1 xl:grid-cols-12 gap-4 lg:gap-5 items-start"
      >
        {/* Left: Recent Business Activity */}
        <div className="xl:col-span-7 bg-white border border-[#E2E8F0] rounded-lg overflow-hidden min-w-0">
          <div className="px-4 lg:px-5 py-3.5 border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <h2 className="text-[14px] font-semibold text-[#111827]">
                Recent Business Activity
              </h2>
              <p className="text-[12px] text-[#64748B]">
                Latest invoices, customer payments, and expenses
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {permissions.canCreateSale && (
                <button
                  type="button"
                  onClick={onOpenNewSale}
                  className="h-8 px-2.5 rounded-md bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-medium inline-flex items-center gap-1 transition-colors whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Sale</span>
                </button>
              )}
              {permissions.canRecordPayment && (
                <button
                  type="button"
                  onClick={onOpenReceivePayment}
                  className="h-8 px-2.5 rounded-md border border-[#E2E8F0] bg-white hover:bg-slate-50 text-[#111827] text-xs font-medium inline-flex items-center gap-1 transition-colors whitespace-nowrap"
                >
                  <ArrowDownLeft className="w-3.5 h-3.5 text-[#16A34A]" />
                  <span>Payment</span>
                </button>
              )}
              {permissions.canManageExpenses && (
                <button
                  type="button"
                  onClick={onOpenAddExpense}
                  className="h-8 px-2.5 rounded-md border border-[#E2E8F0] bg-white hover:bg-slate-50 text-[#111827] text-xs font-medium inline-flex items-center gap-1 transition-colors whitespace-nowrap"
                >
                  <Receipt className="w-3.5 h-3.5 text-[#64748B]" />
                  <span>Expense</span>
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                  <th className="py-2.5 px-4">Activity</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-[13px]">
                {recentActivity.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-[#64748B]">
                      No recent business activity recorded.
                    </td>
                  </tr>
                ) : (
                  recentActivity.map((item) => {
                    const statusStyle =
                      item.status === 'Paid'
                        ? 'text-[#16A34A] bg-emerald-50 border-emerald-200'
                        : item.status === 'Part paid'
                        ? 'text-[#D97706] bg-amber-50 border-amber-200'
                        : item.status === 'Pay later'
                        ? 'text-[#DC2626] bg-red-50 border-red-200'
                        : item.status === 'Expense'
                        ? 'text-[#64748B] bg-slate-100 border-slate-200'
                        : 'text-[#2563EB] bg-blue-50 border-blue-200';

                    return (
                      <tr key={`${item.kind}-${item.id}`} className="hover:bg-[#F8FAFC] transition-colors">
                        <td className="py-2.5 px-4">
                          <div className="font-semibold text-[#111827]">{item.title}</div>
                          <div className="text-[11px] text-[#64748B] truncate max-w-[220px]">
                            {item.subtitle}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-[12px] text-[#64748B] whitespace-nowrap tabular-nums">
                          {item.date.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span
                            className={`inline-block px-2 py-0.5 rounded border text-[11px] font-semibold ${statusStyle}`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td
                          className={`py-2.5 px-4 text-right font-semibold whitespace-nowrap tabular-nums ${
                            item.isOutflow ? 'text-[#DC2626]' : 'text-[#111827]'
                          }`}
                        >
                          {item.isOutflow ? '-' : ''}
                          {formatSBD(item.amount, currency)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-2.5 border-t border-[#E2E8F0] bg-[#F8FAFC] flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-[#64748B]">Showing latest {recentActivity.length} entries</span>
            <button
              type="button"
              onClick={() => setActiveTab('sales')}
              className="font-semibold text-[#2563EB] hover:text-[#1D4ED8] inline-flex items-center gap-1"
            >
              <span>View all sales</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right: Needs Attention */}
        <div className="xl:col-span-5 bg-white border border-[#E2E8F0] rounded-lg overflow-hidden min-w-0">
          <div className="px-4 lg:px-5 py-3.5 border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <h2 className="text-[14px] font-semibold text-[#111827] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#F59E0B] shrink-0" />
                <span>Needs Attention</span>
              </h2>
              <p className="text-[12px] text-[#64748B]">
                Low-stock items and pending invoice balances
              </p>
            </div>
            <span className="text-[12px] font-semibold text-[#111827] tabular-nums shrink-0">
              {metrics.lowStockProducts.length + metrics.unpaidInvoices.length} alerts
            </span>
          </div>

          <div className="divide-y divide-[#E2E8F0]">
            {/* Low Stock Products */}
            {metrics.lowStockProducts.map((prod) => (
              <div
                key={prod.id}
                className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-[#F8FAFC] transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="text-[11px] font-semibold text-[#DC2626]">Low Stock</span>
                    <span className="text-[#CBD5E1]" aria-hidden="true">·</span>
                    <span className="text-[11px] font-mono text-[#64748B] truncate">{prod.sku}</span>
                  </div>
                  <div className="text-[13px] font-semibold text-[#111827] truncate mt-0.5">
                    {prod.name}
                  </div>
                  <div className="text-[12px] text-[#64748B] tabular-nums">
                    {prod.quantity} {prod.unit} left (min {prod.minStockAlert})
                  </div>
                </div>

                {permissions.canManageStock && (
                  <button
                    type="button"
                    onClick={() => onRestockProduct(prod)}
                    className="h-8 px-3 rounded-md bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
                  >
                    Restock
                  </button>
                )}
              </div>
            ))}

            {/* Unpaid / Part-Paid Invoices */}
            {metrics.unpaidInvoices.map((sale) => {
              const owed = Math.max(0, sale.total - sale.amountPaid);
              return (
                <div
                  key={sale.id}
                  className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-[#F8FAFC] transition-colors"
                >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span
                      className={`text-[11px] font-semibold ${
                        sale.status === 'Pay later' ? 'text-[#DC2626]' : 'text-[#D97706]'
                      }`}
                    >
                      {sale.status}
                    </span>
                    <span className="text-[#CBD5E1]" aria-hidden="true">·</span>
                    <span className="text-[11px] font-mono text-[#64748B] truncate">{sale.invoiceNo}</span>
                  </div>
                  <div className="text-[13px] font-semibold text-[#111827] truncate mt-0.5">
                    {sale.customerName}
                  </div>
                  <div className="text-[12px] text-[#64748B] tabular-nums">
                    Balance due: <strong className="text-[#111827]">{formatSBD(owed, currency)}</strong>
                  </div>
                </div>

                {permissions.canRecordPayment && (
                  <button
                    type="button"
                    onClick={() => onMarkSalePaid(sale.id, sale.total)}
                    className="h-8 px-3 rounded-md border border-[#E2E8F0] bg-white hover:bg-slate-50 text-[#111827] text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
                  >
                    Mark Paid
                  </button>
                )}
              </div>
            );
          })}

            {/* Empty Attention State */}
            {metrics.lowStockProducts.length === 0 && metrics.unpaidInvoices.length === 0 && (
              <div className="p-8 text-center space-y-2">
                <CheckCircle2 className="w-7 h-7 text-[#16A34A] mx-auto" />
                <div className="text-[13px] font-semibold text-[#111827]">
                  All operations up to date
                </div>
                <p className="text-[12px] text-[#64748B]">
                  No low-stock products or unpaid invoices require immediate action.
                </p>
              </div>
            )}
          </div>

          <div className="px-4 py-2.5 border-t border-[#E2E8F0] bg-[#F8FAFC] flex flex-wrap items-center justify-between gap-2 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('stock')}
              className="font-semibold text-[#2563EB] hover:text-[#1D4ED8]"
            >
              Manage Stock →
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('customers')}
              className="font-semibold text-[#2563EB] hover:text-[#1D4ED8]"
            >
              Customer Balances →
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
