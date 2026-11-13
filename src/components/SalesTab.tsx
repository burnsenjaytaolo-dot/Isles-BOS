import React, { useState } from 'react';
import { Sale, PaymentStatus, PermissionSet } from '../types';
import { DateRangeFilter, filterByDateRange, formatSBD } from '../utils/analytics';
import { Plus, Search, Printer, Eye, X, CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface SalesTabProps {
  sales: Sale[];
  currency: string;
  dateRange: DateRangeFilter;
  onOpenNewSale: () => void;
  onSelectSaleForReceipt: (sale: Sale) => void;
  onUpdateSaleStatus: (saleId: string, newStatus: PaymentStatus, amountPaid?: number) => void;
  permissions: PermissionSet;
}

export const SalesTab: React.FC<SalesTabProps> = ({
  sales,
  currency,
  dateRange,
  onOpenNewSale,
  onSelectSaleForReceipt,
  onUpdateSaleStatus,
  permissions,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [selectedSaleDetail, setSelectedSaleDetail] = useState<Sale | null>(null);

  const periodSales = filterByDateRange(sales, dateRange);

  const filteredSales = periodSales.filter((s) => {
    const matchesSearch =
      s.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.customerName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'All'
        ? true
        : statusFilter === 'Unpaid'
        ? s.status !== 'Paid'
        : s.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const totalVolume = filteredSales.reduce((sum, s) => sum + s.total, 0);
  const totalCollected = filteredSales.reduce((sum, s) => sum + s.amountPaid, 0);
  const totalOutstanding = Math.max(0, totalVolume - totalCollected);

  return (
    <div className="space-y-5">
      {/* Compact Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-4 min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
            Filtered Invoices
          </div>
          <div className="mt-1.5 text-xl sm:text-2xl font-bold text-[#111827] tabular-nums break-words">
            {formatSBD(totalVolume, currency)}
          </div>
          <div className="text-[12px] text-[#64748B] mt-1 tabular-nums">
            {filteredSales.length} {filteredSales.length === 1 ? 'record' : 'records'}
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-lg p-4 min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
            Amount Collected
          </div>
          <div className="mt-1.5 text-xl sm:text-2xl font-bold text-[#16A34A] tabular-nums break-words">
            {formatSBD(totalCollected, currency)}
          </div>
          <div className="text-[12px] text-[#64748B] mt-1">Settled cash &amp; transfers</div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-lg p-4 min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
            Balance Due
          </div>
          <div
            className={`mt-1.5 text-xl sm:text-2xl font-bold tabular-nums break-words ${
              totalOutstanding > 0 ? 'text-[#F59E0B]' : 'text-[#111827]'
            }`}
          >
            {formatSBD(totalOutstanding, currency)}
          </div>
          <div className="text-[12px] text-[#64748B] mt-1">Pending customer payments</div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white border border-[#E2E8F0] rounded-lg p-3.5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 min-w-0 md:max-w-md">
          <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            aria-label="Search invoices"
            placeholder="Search invoice # or customer name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-9 pl-9 pr-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md text-[13px] text-[#111827] placeholder:text-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/25 focus:border-[#2563EB]"
          />
        </div>

        <div className="flex items-center justify-between md:justify-end gap-3 flex-wrap min-w-0 max-w-full">
          <div className="flex items-center p-0.5 bg-[#F3F6FA] border border-[#E2E8F0] rounded-md overflow-x-auto max-w-full">
            {['All', 'Paid', 'Part paid', 'Pay later', 'Unpaid'].map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setStatusFilter(filter)}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                  statusFilter === filter
                    ? 'bg-white text-[#111827] shadow-2xs border border-[#E2E8F0]'
                    : 'text-[#64748B] hover:text-[#111827]'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          {permissions.canCreateSale && (
            <button
              type="button"
              onClick={onOpenNewSale}
              className="h-9 px-3.5 rounded-md bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Sale</span>
            </button>
          )}
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden min-w-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                <th className="py-3 px-4">Invoice</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Items</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Paid</th>
                <th className="py-3 px-4 text-right">Total</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-[13px]">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-[#64748B]">
                    <div>No invoices match your current filter.</div>
                    {permissions.canCreateSale && (
                      <button
                        type="button"
                        onClick={onOpenNewSale}
                        className="mt-3 h-8 px-3 rounded-md bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold"
                      >
                        Create First Sale
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => {
                  const statusClasses =
                    sale.status === 'Paid'
                      ? 'text-[#16A34A] bg-emerald-50 border-emerald-200'
                      : sale.status === 'Part paid'
                      ? 'text-[#D97706] bg-amber-50 border-amber-200'
                      : 'text-[#DC2626] bg-red-50 border-red-200';

                  return (
                    <tr key={sale.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-2.5 px-4 font-mono text-xs font-semibold text-[#111827] whitespace-nowrap">
                        {sale.invoiceNo}
                      </td>
                      <td className="py-2.5 px-4 font-medium text-[#111827]">
                        {sale.customerName}
                      </td>
                      <td className="py-2.5 px-4 text-xs text-[#64748B] whitespace-nowrap tabular-nums">
                        {new Date(sale.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-2.5 px-4 text-xs text-[#64748B]">
                        <span className="block truncate max-w-[240px]">
                          {sale.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-semibold ${statusClasses}`}
                        >
                          {sale.status === 'Paid' && <CheckCircle className="w-3 h-3" />}
                          {sale.status === 'Part paid' && <Clock className="w-3 h-3" />}
                          {sale.status === 'Pay later' && <AlertCircle className="w-3 h-3" />}
                          <span>{sale.status}</span>
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right text-xs text-[#64748B] whitespace-nowrap tabular-nums">
                        {formatSBD(sale.amountPaid, currency)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-semibold text-[#111827] whitespace-nowrap tabular-nums">
                        {formatSBD(sale.total, currency)}
                      </td>
                      <td className="py-2.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onSelectSaleForReceipt(sale)}
                            className="h-7 px-2.5 rounded border border-[#E2E8F0] bg-white hover:bg-slate-50 text-[#111827] text-xs font-medium inline-flex items-center gap-1 transition-colors"
                          >
                            <Printer className="w-3 h-3 text-[#64748B]" />
                            <span>Receipt</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedSaleDetail(sale)}
                            className="h-7 px-2.5 rounded border border-[#2563EB]/30 bg-blue-50/50 hover:bg-blue-50 text-[#2563EB] text-xs font-medium inline-flex items-center gap-1 transition-colors"
                          >
                            <Eye className="w-3 h-3" />
                            <span>View</span>
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

      {/* Sale Detail Modal */}
      {selectedSaleDetail && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-[1px] z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="invoice-detail-title"
        >
          <div className="bg-white rounded-lg border border-[#E2E8F0] max-w-lg w-full shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between gap-3 shrink-0">
              <div className="min-w-0">
                <h3 id="invoice-detail-title" className="text-base font-bold text-[#111827] truncate">
                  Invoice {selectedSaleDetail.invoiceNo}
                </h3>
                <p className="text-xs text-[#64748B]">
                  {new Date(selectedSaleDetail.date).toLocaleString()}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close invoice details"
                onClick={() => setSelectedSaleDetail(null)}
                className="w-8 h-8 rounded-md hover:bg-slate-100 text-[#64748B] flex items-center justify-center shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
              <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-md p-3.5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[#64748B] block">Customer</span>
                  <span className="font-semibold text-[#111827]">{selectedSaleDetail.customerName}</span>
                </div>
                <div>
                  <span className="text-[#64748B] block">Status</span>
                  <span className="font-semibold text-[#111827]">{selectedSaleDetail.status}</span>
                </div>
                <div>
                  <span className="text-[#64748B] block">Amount Paid</span>
                  <span className="font-semibold text-[#16A34A] tabular-nums">
                    {formatSBD(selectedSaleDetail.amountPaid, currency)}
                  </span>
                </div>
                <div>
                  <span className="text-[#64748B] block">Method</span>
                  <span className="font-semibold text-[#111827]">{selectedSaleDetail.paymentMethod}</span>
                </div>
              </div>

              <div className="border border-[#E2E8F0] rounded-md overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] font-semibold">
                      <th className="py-2 px-3">Item</th>
                      <th className="py-2 px-3 text-right">Qty</th>
                      <th className="py-2 px-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {selectedSaleDetail.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-2 px-3 font-medium text-[#111827]">
                          {item.name}
                          <span className="block text-[11px] text-[#64748B] tabular-nums">
                            @ {formatSBD(item.price, currency)}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums text-[#64748B]">
                          {item.quantity}
                        </td>
                        <td className="py-2 px-3 text-right font-semibold text-[#111827] tabular-nums">
                          {formatSBD(item.quantity * item.price, currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#E2E8F0]">
                <span className="text-sm font-semibold text-[#64748B]">Invoice Total</span>
                <span className="text-xl font-bold text-[#111827] tabular-nums">
                  {formatSBD(selectedSaleDetail.total, currency)}
                </span>
              </div>

              <div className="flex flex-wrap sm:flex-nowrap gap-2.5 pt-2">
                {selectedSaleDetail.status !== 'Paid' && permissions.canRecordPayment && (
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateSaleStatus(selectedSaleDetail.id, 'Paid', selectedSaleDetail.total);
                      setSelectedSaleDetail(null);
                    }}
                    className="flex-1 h-9 rounded-md bg-[#16A34A] hover:bg-emerald-700 text-white text-xs font-semibold transition-colors"
                  >
                    Mark as Paid
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    onSelectSaleForReceipt(selectedSaleDetail);
                    setSelectedSaleDetail(null);
                  }}
                  className="flex-1 h-9 rounded-md bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Receipt</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
