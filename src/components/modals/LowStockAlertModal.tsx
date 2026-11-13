import React from 'react';
import { Product } from '../../types';
import { getLowStockProducts } from '../../utils/analytics';
import { AlertTriangle, PackagePlus, CheckCircle2, X } from 'lucide-react';

interface LowStockAlertModalProps {
  products: Product[];
  currency: string;
  onClose: () => void;
  onRestockProduct: (product: Product) => void;
}

export const LowStockAlertModal: React.FC<LowStockAlertModalProps> = ({
  products,
  onClose,
  onRestockProduct,
}) => {
  const lowStockItems = getLowStockProducts(products);

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-[1px] z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="low-stock-modal-title"
    >
      <div className="bg-white rounded-lg border border-[#E2E8F0] max-w-lg w-full shadow-xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between shrink-0">
          <div>
            <h3 id="low-stock-modal-title" className="text-base font-bold text-[#111827]">
              Low Stock Alerts ({lowStockItems.length})
            </h3>
            <p className="text-xs text-[#64748B]">
              Products currently at or below their minimum stock threshold
            </p>
          </div>
          <button
            type="button"
            aria-label="Close low stock alerts modal"
            onClick={onClose}
            className="w-8 h-8 rounded-md hover:bg-slate-100 text-[#64748B] flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-3">
          {lowStockItems.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-[#16A34A] mx-auto" />
              <div className="text-sm font-semibold text-[#111827]">
                All products are well-stocked
              </div>
              <p className="text-xs text-[#64748B]">
                No items have fallen below their user-defined minimum thresholds.
              </p>
            </div>
          ) : (
            lowStockItems.map((prod) => (
              <div
                key={prod.id}
                className="p-3.5 rounded-md border border-red-200 bg-red-50/50 flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-[#DC2626] shrink-0" />
                    <h4 className="font-semibold text-[#111827] text-[13px] truncate">
                      {prod.name}
                    </h4>
                  </div>
                  <p className="text-xs text-[#64748B] mt-1 tabular-nums">
                    Remaining:{' '}
                    <strong className="text-[#DC2626]">
                      {prod.quantity} {prod.unit}
                    </strong>{' '}
                    · Min threshold: {prod.minStockAlert} ·{' '}
                    <span className="font-mono">{prod.sku}</span>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onRestockProduct(prod);
                  }}
                  className="h-8 px-3 rounded-md bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                >
                  <PackagePlus className="w-3.5 h-3.5" />
                  <span>Restock</span>
                </button>
              </div>
            ))
          )}
        </div>

        <div className="px-5 py-3.5 border-t border-[#E2E8F0] flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 rounded-md border border-[#E2E8F0] bg-white hover:bg-slate-50 text-[#111827] text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
