import React, { useState } from 'react';
import { Customer, Sale, DebtPayment, PermissionSet } from '../types';
import { formatSBD } from '../utils/analytics';
import { Plus, Search, ArrowDownLeft, FileText, X } from 'lucide-react';

interface CustomersTabProps {
  customers: Customer[];
  sales: Sale[];
  debtPayments: DebtPayment[];
  currency: string;
  onOpenAddCustomer: () => void;
  onOpenReceivePaymentForCustomer: (customer: Customer) => void;
  permissions: PermissionSet;
}

export const CustomersTab: React.FC<CustomersTabProps> = ({
  customers,
  sales,
  debtPayments,
  currency,
  onOpenAddCustomer,
  onOpenReceivePaymentForCustomer,
  permissions,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'owing'>('all');
  const [selectedCustomerForStatement, setSelectedCustomerForStatement] =
    useState<Customer | null>(null);

  const filteredCustomers = customers.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterMode === 'all' ? true : c.balance > 0;
    return matchesSearch && matchesFilter;
  });

  const totalOwed = customers.reduce((sum, c) => sum + c.balance, 0);
  const totalLifetimeSpend = customers.reduce((sum, c) => sum + c.totalSpent, 0);
  const owingCount = customers.filter((c) => c.balance > 0).length;

  return (
    <div className="space-y-5">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-4 min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
            Total Customer Accounts
          </div>
          <div className="mt-1.5 text-xl sm:text-2xl font-bold text-[#111827] tabular-nums">
            {customers.length}
          </div>
          <div className="text-[12px] text-[#64748B] mt-1">
            {owingCount} with outstanding credit
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-lg p-4 min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
            Total Outstanding Credit
          </div>
          <div
            className={`mt-1.5 text-xl sm:text-2xl font-bold tabular-nums break-words ${
              totalOwed > 0 ? 'text-[#F59E0B]' : 'text-[#16A34A]'
            }`}
          >
            {formatSBD(totalOwed, currency)}
          </div>
          <div className="text-[12px] text-[#64748B] mt-1">Receivable customer balances</div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-lg p-4 min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
            Cumulative Customer Spend
          </div>
          <div className="mt-1.5 text-xl sm:text-2xl font-bold text-[#111827] tabular-nums break-words">
            {formatSBD(totalLifetimeSpend, currency)}
          </div>
          <div className="text-[12px] text-[#64748B] mt-1">Across all saved contacts</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white border border-[#E2E8F0] rounded-lg p-3.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 min-w-0 sm:max-w-md">
          <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            aria-label="Search customers"
            placeholder="Search customer by name or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-9 pl-9 pr-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md text-[13px] text-[#111827] placeholder:text-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/25 focus:border-[#2563EB]"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2.5 min-w-0 max-w-full">
          <div className="flex items-center p-0.5 bg-[#F3F6FA] border border-[#E2E8F0] rounded-md overflow-x-auto max-w-full">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                filterMode === 'all'
                  ? 'bg-white text-[#111827] shadow-2xs border border-[#E2E8F0]'
                  : 'text-[#64748B] hover:text-[#111827]'
              }`}
            >
              All ({customers.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('owing')}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                filterMode === 'owing'
                  ? 'bg-white text-[#111827] shadow-2xs border border-[#E2E8F0]'
                  : 'text-[#64748B] hover:text-[#111827]'
              }`}
            >
              Owing ({owingCount})
            </button>
          </div>

          {permissions.canManageCustomers && (
            <button
              type="button"
              onClick={onOpenAddCustomer}
              className="h-9 px-3.5 rounded-md bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Customer</span>
            </button>
          )}
        </div>
      </div>

      {/* Customers Directory Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden min-w-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                <th className="py-3 px-4">Customer Name</th>
                <th className="py-3 px-4">Phone</th>
                <th className="py-3 px-4">Location / Address</th>
                <th className="py-3 px-4 text-right">Total Spent</th>
                <th className="py-3 px-4 text-right">Balance Owed</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-[13px]">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-[#64748B]">
                    No customers match your filter.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust) => {
                  const hasBalance = cust.balance > 0;
                  return (
                    <tr key={cust.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-2.5 px-4 font-semibold text-[#111827]">
                        {cust.name}
                        {cust.email && (
                          <span className="block text-[11px] font-normal text-[#64748B]">
                            {cust.email}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-xs text-[#64748B] font-mono whitespace-nowrap">
                        {cust.phone}
                      </td>
                      <td className="py-2.5 px-4 text-xs text-[#64748B]">
                        {cust.address || '—'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-medium text-[#111827] whitespace-nowrap tabular-nums">
                        {formatSBD(cust.totalSpent, currency)}
                      </td>
                      <td className="py-2.5 px-4 text-right whitespace-nowrap tabular-nums">
                        <span
                          className={`font-semibold ${
                            hasBalance ? 'text-[#D97706]' : 'text-[#16A34A]'
                          }`}
                        >
                          {formatSBD(cust.balance, currency)}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {hasBalance && permissions.canRecordPayment && (
                            <button
                              type="button"
                              onClick={() => onOpenReceivePaymentForCustomer(cust)}
                              className="h-7 px-2.5 rounded bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-medium inline-flex items-center gap-1 transition-colors"
                            >
                              <ArrowDownLeft className="w-3 h-3" />
                              <span>Pay</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setSelectedCustomerForStatement(cust)}
                            className="h-7 px-2.5 rounded border border-[#E2E8F0] bg-white hover:bg-slate-50 text-[#111827] text-xs font-medium inline-flex items-center gap-1 transition-colors"
                          >
                            <FileText className="w-3 h-3 text-[#64748B]" />
                            <span>Statement</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Statement Modal */}
      {selectedCustomerForStatement && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-[1px] z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="statement-title"
        >
          <div className="bg-white rounded-lg border border-[#E2E8F0] max-w-xl w-full shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between gap-3 shrink-0">
              <div className="min-w-0">
                <h3 id="statement-title" className="text-base font-bold text-[#111827] truncate">
                  Account Statement · {selectedCustomerForStatement.name}
                </h3>
                <p className="text-xs text-[#64748B] truncate">
                  {selectedCustomerForStatement.phone} ·{' '}
                  {selectedCustomerForStatement.address || 'Honiara'}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close statement"
                onClick={() => setSelectedCustomerForStatement(null)}
                className="w-8 h-8 rounded-md hover:bg-slate-100 text-[#64748B] flex items-center justify-center shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-5 overflow-y-auto">
              <div className="p-4 rounded-md bg-[#F8FAFC] border border-[#E2E8F0] flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                    Current Balance Owed
                  </div>
                  <div
                    className={`text-2xl font-bold mt-1 tabular-nums ${
                      selectedCustomerForStatement.balance > 0
                        ? 'text-[#D97706]'
                        : 'text-[#16A34A]'
                    }`}
                  >
                    {formatSBD(selectedCustomerForStatement.balance, currency)}
                  </div>
                </div>
                {selectedCustomerForStatement.balance > 0 && permissions.canRecordPayment && (
                  <button
                    type="button"
                    onClick={() => {
                      const cust = selectedCustomerForStatement;
                      setSelectedCustomerForStatement(null);
                      onOpenReceivePaymentForCustomer(cust);
                    }}
                    className="h-9 px-3.5 rounded-md bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold transition-colors"
                  >
                    Receive Payment
                  </button>
                )}
              </div>

              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">
                  Invoices & Purchases
                </h4>
                <div className="border border-[#E2E8F0] rounded-md overflow-hidden">
                  {sales.filter((s) => s.customerId === selectedCustomerForStatement.id).length ===
                  0 ? (
                    <p className="text-xs text-[#64748B] py-5 text-center">
                      No purchases recorded for this customer.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B]">
                            <th className="py-2 px-3">Invoice</th>
                            <th className="py-2 px-3">Date</th>
                            <th className="py-2 px-3">Status</th>
                            <th className="py-2 px-3 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E2E8F0]">
                          {sales
                            .filter((s) => s.customerId === selectedCustomerForStatement.id)
                            .map((sale) => (
                              <tr key={sale.id}>
                                <td className="py-2 px-3 font-mono font-semibold text-[#111827] whitespace-nowrap">
                                  {sale.invoiceNo}
                                </td>
                                <td className="py-2 px-3 text-[#64748B] tabular-nums whitespace-nowrap">
                                  {new Date(sale.date).toLocaleDateString()}
                                </td>
                                <td className="py-2 px-3 font-medium text-[#111827] whitespace-nowrap">
                                  {sale.status}
                                </td>
                                <td className="py-2 px-3 text-right font-semibold text-[#111827] tabular-nums whitespace-nowrap">
                                  {formatSBD(sale.total, currency)}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">
                  Credit Payment History
                </h4>
                <div className="border border-[#E2E8F0] rounded-md overflow-hidden">
                  {debtPayments.filter((p) => p.customerId === selectedCustomerForStatement.id)
                    .length === 0 ? (
                    <p className="text-xs text-[#64748B] py-5 text-center">
                      No standalone credit payments recorded.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B]">
                            <th className="py-2 px-3">Method</th>
                            <th className="py-2 px-3">Date</th>
                            <th className="py-2 px-3 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E2E8F0]">
                          {debtPayments
                            .filter((p) => p.customerId === selectedCustomerForStatement.id)
                            .map((pay) => (
                              <tr key={pay.id}>
                                <td className="py-2 px-3 font-medium text-[#111827]">
                                  {pay.method}
                                  {pay.note && (
                                    <span className="block text-[11px] text-[#64748B]">{pay.note}</span>
                                  )}
                                </td>
                                <td className="py-2 px-3 text-[#64748B] tabular-nums whitespace-nowrap">
                                  {new Date(pay.date).toLocaleDateString()}
                                </td>
                                <td className="py-2 px-3 text-right font-semibold text-[#16A34A] tabular-nums whitespace-nowrap">
                                  +{formatSBD(pay.amount, currency)}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
