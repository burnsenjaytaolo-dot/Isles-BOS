import React, { useState } from 'react';
import { Expense, Sale, DebtPayment, PermissionSet } from '../types';
import { DateRangeFilter, filterByDateRange, formatSBD } from '../utils/analytics';
import { Plus, TrendingUp, TrendingDown, Wallet } from 'lucide-react';

interface MoneyTabProps {
  expenses: Expense[];
  sales: Sale[];
  debtPayments: DebtPayment[];
  currency: string;
  dateRange: DateRangeFilter;
  onOpenAddExpense: () => void;
  permissions: PermissionSet;
}

export const MoneyTab: React.FC<MoneyTabProps> = ({
  expenses,
  sales,
  debtPayments,
  currency,
  dateRange,
  onOpenAddExpense,
  permissions,
}) => {
  const [categoryFilter, setCategoryFilter] = useState('All');

  const periodSales = filterByDateRange(sales, dateRange);
  const periodExpenses = filterByDateRange(expenses, dateRange);
  const periodPayments = filterByDateRange(debtPayments, dateRange);

  const totalSalesRevenue = periodSales.reduce((sum, s) => sum + s.total, 0);
  const totalExpenses = periodExpenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = totalSalesRevenue - totalExpenses;
  const cashCollected =
    periodSales.reduce((sum, s) => sum + s.amountPaid, 0) +
    periodPayments.reduce((sum, p) => sum + p.amount, 0);

  const categories = ['All', ...Array.from(new Set(expenses.map((e) => e.category)))];

  const filteredExpenses = periodExpenses.filter((e) =>
    categoryFilter === 'All' ? true : e.category === categoryFilter
  );

  // Category breakdown summary from real period expenses
  const categoryTotals = Array.from(
    periodExpenses.reduce((map, exp) => {
      map.set(exp.category, (map.get(exp.category) || 0) + exp.amount);
      return map;
    }, new Map<string, number>())
  ).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-5">
      {/* Financial Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-4 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
              Sales Revenue
            </span>
            <TrendingUp className="w-4 h-4 text-[#2563EB] shrink-0" />
          </div>
          <div className="mt-1.5 text-xl lg:text-2xl font-bold text-[#111827] tabular-nums break-words">
            {formatSBD(totalSalesRevenue, currency)}
          </div>
          <div className="text-[12px] text-[#64748B] mt-1">
            {periodSales.length} invoiced sales
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-lg p-4 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
              Cash &amp; Bank Collected
            </span>
            <Wallet className="w-4 h-4 text-[#16A34A] shrink-0" />
          </div>
          <div className="mt-1.5 text-xl lg:text-2xl font-bold text-[#16A34A] tabular-nums break-words">
            {formatSBD(cashCollected, currency)}
          </div>
          <div className="text-[12px] text-[#64748B] mt-1">
            Sales paid + credit receipts
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-lg p-4 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
              Total Expenses
            </span>
            <TrendingDown className="w-4 h-4 text-[#DC2626] shrink-0" />
          </div>
          <div className="mt-1.5 text-xl lg:text-2xl font-bold text-[#DC2626] tabular-nums break-words">
            {formatSBD(totalExpenses, currency)}
          </div>
          <div className="text-[12px] text-[#64748B] mt-1">
            {periodExpenses.length} recorded bills
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-lg p-4 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
              Net Balance
            </span>
            <Wallet className="w-4 h-4 text-[#2563EB] shrink-0" />
          </div>
          <div
            className={`mt-1.5 text-xl lg:text-2xl font-bold tabular-nums break-words ${
              netProfit >= 0 ? 'text-[#111827]' : 'text-[#DC2626]'
            }`}
          >
            {formatSBD(netProfit, currency)}
          </div>
          <div className="text-[12px] text-[#64748B] mt-1">Revenue minus expenses</div>
        </div>
      </div>

      {/* Category Breakdown + Expenses Table */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* Expense Breakdown */}
        <div className="xl:col-span-4 bg-white border border-[#E2E8F0] rounded-lg p-4 lg:p-5 space-y-4 min-w-0">
          <div>
            <h2 className="text-[14px] font-semibold text-[#111827]">Expense Breakdown</h2>
            <p className="text-[12px] text-[#64748B]">Spending distribution by category</p>
          </div>

          {categoryTotals.length === 0 ? (
            <p className="text-xs text-[#64748B] py-6 text-center border border-dashed border-[#E2E8F0] rounded-md">
              No expenses recorded for this period.
            </p>
          ) : (
            <div className="space-y-3">
              {categoryTotals.map(([cat, amt]) => {
                const pct = totalExpenses > 0 ? Math.round((amt / totalExpenses) * 100) : 0;
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex items-center justify-between gap-2 text-xs min-w-0">
                      <span className="font-medium text-[#111827] truncate">{cat}</span>
                      <span className="font-semibold text-[#111827] tabular-nums shrink-0">
                        {formatSBD(amt, currency)} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-[#F3F6FA] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#2563EB] rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Expenses Table */}
        <div className="xl:col-span-8 bg-white border border-[#E2E8F0] rounded-lg overflow-hidden min-w-0">
          <div className="px-4 py-3.5 border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-[14px] font-semibold text-[#111827]">
                Business Expenses &amp; Supplier Bills
              </h2>
              <p className="text-[12px] text-[#64748B]">
                Filter by expense category or log a new payment
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap min-w-0 max-w-full">
              <div className="flex items-center p-0.5 bg-[#F3F6FA] border border-[#E2E8F0] rounded-md overflow-x-auto max-w-full">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                      categoryFilter === cat
                        ? 'bg-white text-[#111827] shadow-2xs border border-[#E2E8F0]'
                        : 'text-[#64748B] hover:text-[#111827]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {permissions.canManageExpenses && (
                <button
                  type="button"
                  onClick={onOpenAddExpense}
                  className="h-8 px-3 rounded-md bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold inline-flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Expense</span>
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-[13px]">
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-[#64748B]">
                      No expenses recorded in this category.
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-2.5 px-4 font-medium text-[#111827]">
                        {exp.description.trim()}
                        {exp.reference && (
                          <span className="block text-[11px] text-[#64748B] font-mono">
                            Ref: {exp.reference}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-xs text-[#64748B] whitespace-nowrap">
                        {exp.category}
                      </td>
                      <td className="py-2.5 px-4 text-xs text-[#64748B] whitespace-nowrap tabular-nums">
                        {new Date(exp.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-2.5 px-4 text-xs text-[#64748B] whitespace-nowrap">
                        {exp.paymentMethod}
                      </td>
                      <td className="py-2.5 px-4 text-right font-semibold text-[#DC2626] whitespace-nowrap tabular-nums">
                        -{formatSBD(exp.amount, currency)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
