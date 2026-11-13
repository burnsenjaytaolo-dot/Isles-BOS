import React, { useState } from 'react';
import { Product } from '../../types';
import { X } from 'lucide-react';

interface AddProductModalProps {
  currency: string;
  categories?: string[];
  onClose: () => void;
  onSaveProduct: (product: Omit<Product, 'id'>) => void;
}

export const AddProductModal: React.FC<AddProductModalProps> = ({
  currency,
  categories: customCategories,
  onClose,
  onSaveProduct,
}) => {
  const categories =
    customCategories && customCategories.length > 0
      ? customCategories
      : ['Groceries', 'Hardware', 'Fuel', 'Utilities', 'Services', 'Drinks', 'Other'];

  const [name, setName] = useState('');
  const [sku, setSku] = useState('SKU-' + Math.floor(1000 + Math.random() * 9000));
  const [category, setCategory] = useState(categories[0]);
  const [costPrice, setCostPrice] = useState<number>(0);
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(50);
  const [minStockAlert, setMinStockAlert] = useState<number>(10);
  const [unit, setUnit] = useState('pcs');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || sellingPrice <= 0) {
      setErrorMsg('Please enter a product name and a selling price greater than 0.');
      return;
    }

    onSaveProduct({
      name: name.trim(),
      sku: sku.trim(),
      category,
      costPrice: Number(costPrice) || 0,
      sellingPrice: Number(sellingPrice) || 0,
      quantity: Number(quantity) || 0,
      minStockAlert: Number(minStockAlert) || 5,
      unit: unit.trim() || 'pcs',
    });
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-[1px] z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-product-title"
    >
      <div className="bg-white rounded-lg border border-[#E2E8F0] max-w-lg w-full shadow-xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between shrink-0">
          <div>
            <h3 id="add-product-title" className="text-base font-bold text-[#111827]">
              Add New Product
            </h3>
            <p className="text-xs text-[#64748B]">Create a new item in store inventory</p>
          </div>
          <button
            type="button"
            aria-label="Close add product modal"
            onClick={onClose}
            className="w-8 h-8 rounded-md hover:bg-slate-100 text-[#64748B] flex items-center justify-center"
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
              htmlFor="product-name"
              className="block text-xs font-semibold text-[#111827] mb-1.5"
            >
              Product Name
            </label>
            <input
              id="product-name"
              type="text"
              placeholder="e.g. Solomon Blue Tuna 425g"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setErrorMsg('');
              }}
              className="w-full h-10 px-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md text-[13px]"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="product-sku"
                className="block text-xs font-semibold text-[#111827] mb-1.5"
              >
                SKU / Code
              </label>
              <input
                id="product-sku"
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="w-full h-10 px-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md text-[13px] font-mono"
                required
              />
            </div>

            <div>
              <label
                htmlFor="product-category"
                className="block text-xs font-semibold text-[#111827] mb-1.5"
              >
                Category
              </label>
              <select
                id="product-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-10 px-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md text-[13px] font-medium"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="product-cost"
                className="block text-xs font-semibold text-[#111827] mb-1.5"
              >
                Cost Price ({currency})
              </label>
              <input
                id="product-cost"
                type="number"
                min="0"
                step="0.01"
                value={costPrice || ''}
                onChange={(e) => setCostPrice(parseFloat(e.target.value) || 0)}
                className="w-full h-10 px-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md text-[13px] font-semibold tabular-nums"
              />
            </div>

            <div>
              <label
                htmlFor="product-price"
                className="block text-xs font-semibold text-[#111827] mb-1.5"
              >
                Selling Price ({currency})
              </label>
              <input
                id="product-price"
                type="number"
                min="0"
                step="0.01"
                value={sellingPrice || ''}
                onChange={(e) => {
                  setSellingPrice(parseFloat(e.target.value) || 0);
                  setErrorMsg('');
                }}
                className="w-full h-10 px-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md text-[13px] font-semibold tabular-nums"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label
                htmlFor="product-qty"
                className="block text-xs font-semibold text-[#111827] mb-1.5"
              >
                Quantity
              </label>
              <input
                id="product-qty"
                type="number"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 0)}
                className="w-full h-10 px-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md text-[13px] font-semibold tabular-nums"
              />
            </div>

            <div>
              <label
                htmlFor="product-alert"
                className="block text-xs font-semibold text-[#111827] mb-1.5"
              >
                Min Alert
              </label>
              <input
                id="product-alert"
                type="number"
                min="0"
                value={minStockAlert}
                onChange={(e) => setMinStockAlert(parseInt(e.target.value, 10) || 0)}
                className="w-full h-10 px-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md text-[13px] font-semibold tabular-nums"
              />
            </div>

            <div>
              <label
                htmlFor="product-unit"
                className="block text-xs font-semibold text-[#111827] mb-1.5"
              >
                Unit
              </label>
              <input
                id="product-unit"
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full h-10 px-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md text-[13px]"
                placeholder="pcs, bag, kg"
              />
            </div>
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
              Save Product
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
