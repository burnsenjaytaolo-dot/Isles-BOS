import React from 'react';
import { Sale, BusinessSettings } from '../../types';
import { formatSBD } from '../../utils/analytics';
import { Printer, X } from 'lucide-react';

interface PrintReceiptModalProps {
  sale: Sale;
  settings: BusinessSettings;
  currency: string;
  onClose: () => void;
}

export const PrintReceiptModal: React.FC<PrintReceiptModalProps> = ({
  sale,
  settings,
  currency,
  onClose,
}) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-[1px] z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="receipt-preview-title"
    >
      <div className="bg-white rounded-lg border border-[#E2E8F0] max-w-md w-full shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-[#2563EB]" />
            <h3 id="receipt-preview-title" className="text-base font-bold text-[#111827]">
              Receipt Preview · {sale.invoiceNo}
            </h3>
          </div>
          <button
            type="button"
            aria-label="Close receipt preview"
            onClick={onClose}
            className="w-8 h-8 rounded-md hover:bg-slate-100 text-[#64748B] flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto">
          {/* Printable Receipt Container */}
          <div className="bg-[#F8FAFC] p-5 rounded-md border border-[#E2E8F0] font-mono text-xs text-[#111827] space-y-4">
            <div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-300">
              <h2 className="text-sm font-bold text-[#111827]">{settings.businessName}</h2>
              <p className="text-[#64748B]">{settings.address}</p>
              <p className="text-[#64748B]">Tel: {settings.phone}</p>
            </div>

            <div className="space-y-1 pb-3 border-b border-dashed border-slate-300">
              <div className="flex justify-between">
                <span className="text-[#64748B]">Invoice:</span>
                <span className="font-bold">{sale.invoiceNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Date:</span>
                <span>{new Date(sale.date).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Customer:</span>
                <span className="font-bold">{sale.customerName}</span>
              </div>
            </div>

            <div className="space-y-2 pb-3 border-b border-dashed border-slate-300">
              <div className="grid grid-cols-12 font-bold text-[#64748B] pb-1 border-b border-[#E2E8F0]">
                <span className="col-span-6">Item</span>
                <span className="col-span-2 text-center">Qty</span>
                <span className="col-span-4 text-right">Amount</span>
              </div>
              {sale.items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 items-center">
                  <span className="col-span-6 truncate">{item.name}</span>
                  <span className="col-span-2 text-center tabular-nums">{item.quantity}</span>
                  <span className="col-span-4 text-right font-semibold tabular-nums">
                    {formatSBD(item.quantity * item.price, currency)}
                  </span>
                </div>
              ))}
            </div>

            <div className="space-y-1 pb-3 border-b border-dashed border-slate-300 tabular-nums">
              <div className="flex justify-between">
                <span className="text-[#64748B]">Subtotal:</span>
                <span>{formatSBD(sale.subtotal, currency)}</span>
              </div>
              {sale.discount > 0 && (
                <div className="flex justify-between text-[#DC2626]">
                  <span>Discount:</span>
                  <span>-{formatSBD(sale.discount, currency)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold pt-1">
                <span>TOTAL:</span>
                <span>{formatSBD(sale.total, currency)}</span>
              </div>
              <div className="flex justify-between pt-1 text-[11px]">
                <span className="text-[#64748B]">Status ({sale.paymentMethod}):</span>
                <span className="font-bold">
                  {sale.status} ({formatSBD(sale.amountPaid, currency)} paid)
                </span>
              </div>
            </div>

            <div className="text-center text-[#64748B] pt-1 space-y-1 text-[11px]">
              <p>{settings.receiptFooter}</p>
              <p className="text-[10px]">Isles BOS Receipt</p>
            </div>
          </div>
        </div>

        <div className="px-5 py-3.5 border-t border-[#E2E8F0] flex gap-2.5 shrink-0 print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-9 rounded-md border border-[#E2E8F0] bg-white hover:bg-slate-50 text-[#111827] text-xs font-semibold transition-colors"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 h-9 rounded-md bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Receipt</span>
          </button>
        </div>
      </div>
    </div>
  );
};
