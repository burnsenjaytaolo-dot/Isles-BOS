import React, { useState, useEffect } from 'react';
import { Product } from '../../types';
import { X } from 'lucide-react';

interface ReceiveStockModalProps {
  products: Product[];
  preselectedProduct?: Product | null;
  currency: string;
  onClose: () => void;
  onRestock: (
    productId: string,
    addQuantity: number,
    newCostPrice?: number,
    newSellingPrice?: number,
    newMinStockAlert?: number
  ) => void;
}

export const ReceiveStockModal: React.FC<ReceiveStockModalProps> = ({
  products,
  preselectedProduct,
  currency,
  onClose,
  onRestock,
}) => {
  const [productId, setProductId] = useState(
    preselectedProduct?.id || products[0]?.id || ''
  );
  const [addQty, setAddQty] = useState<number>(10);
  const [costPrice, setCostPrice] = useState<number>(
    preselectedProduct?.costPrice || products[0]?.costPrice || 0
  );
  const [sellingPrice, setSellingPrice] = useState<number>(
    preselectedProduct?.sellingPrice || products[0]?.sellingPrice || 0
  );
  const [minStockAlert, setMinStockAlert] = useState<number>(
    preselectedProduct?.minStockAlert || products[0]?.minStockAlert || 10
  );
  const [errorMsg, setErrorMsg] = useState('');

  const selectedProd = products.find((p) => p.id === productId);

  useEffect(() => {
    if (selectedProd) {
      setCostPrice(selectedProd.costPrice);
      setSellingPrice(selectedProd.sellingPrice);
      setMinStockAlert(selectedProd.minStockAlert);
    }
  }, [productId, products]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (addQty <= 0) {
      setErrorMsg('Please enter a valid quantity greater than 0.');
      return;
    }

    onRestock(
      productId,
      Number(addQty),
      costPrice !== undefined ? Number(costPrice) : undefined,
      sellingPrice !== undefined ? Number(sellingPrice) : undefined,
      minStockAlert !== undefined ? Number(minStockAlert) : undefined
    );
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-[1px] z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="receive-stock-title"
    >
      <div className="bg-white rounded-lg border border-[#E2E8F0] max-w-md w-full shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <h3 id="receive-stock-title" className="text-base font-bold text-[#111827]">
              Receive Stock &amp; Threshold
            </h3>
            <p className="text-xs text-[#64748B]">
              Add received inventory and adjust low-stock alert limit
            </p>
          </div>
          <button
            type="button"
            aria-label="Close receive stock modal"
            onClick={onClose}
            className="w-8 h-8 rounded-md hover:bg-slate-100 text-[#64748B] flex items-center justify-center shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          {errorMsg && (
            <div
              role="alert"
              className="p-3 rounded-md bg-red-50 border border-red-200 text-xs font-medium text-[#DC2626]"
            >
              {errorMsg}
            </div>
          )}

          <div>
            <label
              htmlFor="restock-product"
              className="block text-xs font-semibold text-[#111827] mb-1.5"
            >
              Product
            </label>
            <select
              id="restock-product"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="w-full h-10 px-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md text-[13px] font-medium text-[#111827]"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (Current: {p.quantity} {p.unit})
                </option>
              ))}
            </select>
          </div>

          {selectedProd && (
            <div className="p-3 rounded-md bg-[#F8FAFC] border border-[#E2E8F0] flex justify-between text-xs text-[#64748B]">
              <span>
                In Stock:{' '}
                <strong className="text-[#111827] tabular-nums">
                  {selectedProd.quantity} {selectedProd.unit}
                </strong>
              </span>
              <span className="font-mono">SKU: {selectedProd.sku}</span>
            </div>
          )}

          <div>
            <label
              htmlFor="restock-qty"
              className="block text-xs font-semibold text-[#111827] mb-1.5"
            >
              Quantity to Add
            </label>
            <input
              id="restock-qty"
              type="number"
              min="1"
              value={addQty}
              onChange={(e) => {
                setAddQty(parseInt(e.target.value, 10) || 0);
                setErrorMsg('');
              }}
              className="w-full h-10 px-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md text-sm font-bold tabular-nums"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="restock-cost"
                className="block text-xs font-semibold text-[#111827] mb-1.5"
              >
                Cost Price ({currency})
              </label>
              <input
                id="restock-cost"
                type="number"
                min="0"
                step="0.01"
                value={costPrice}
                onChange={(e) => setCostPrice(parseFloat(e.target.value) || 0)}
                className="w-full h-10 px-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md text-[13px] font-semibold tabular-nums"
              />
            </div>

            <div>
              <label
                htmlFor="restock-price"
                className="block text-xs font-semibold text-[#111827] mb-1.5"
              >
                Selling Price ({currency})
              </label>
              <input
                id="restock-price"
                type="number"
                min="0"
                step="0.01"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(parseFloat(e.target.value) || 0)}
                className="w-full h-10 px-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md text-[13px] font-semibold tabular-nums"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="restock-threshold"
              className="block text-xs font-semibold text-[#111827] mb-1.5"
            >
              Low Stock Alert Threshold
            </label>
            <input
              id="restock-threshold"
              type="number"
              min="0"
              value={minStockAlert}
              onChange={(e) => setMinStockAlert(parseInt(e.target.value, 10) || 0)}
              className="w-full h-10 px-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md text-[13px] font-semibold text-[#D97706] tabular-nums"
            />
            <p className="text-[11px] text-[#64748B] mt-1">
              Alert triggers when stock falls to or below this quantity.
            </p>
          </div>

          <div className="flex gap-2.5 pt-3 border-t border-[#E2E8F0]">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-10 rounded-md border border-[#E2E8F0] bg-white hover:bg-slate-50 text-[#111827] text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 h-10 rounded-md bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold transition-colors"
            >
              Update Stock
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
