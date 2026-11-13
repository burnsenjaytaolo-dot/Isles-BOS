import React, { useState } from 'react';
import { InventoryMovement, PermissionSet, Product } from '../types';
import { formatSBD, getLowStockProducts } from '../utils/analytics';
import { Plus, Search, PackagePlus, AlertTriangle, History } from 'lucide-react';

interface StockTabProps {
  products: Product[];
  inventoryMovements: InventoryMovement[];
  currency: string;
  onOpenAddProduct: () => void;
  onOpenReceiveStock: (product?: Product) => void;
  permissions: PermissionSet;
}

export const StockTab: React.FC<StockTabProps> = ({
  products,
  inventoryMovements,
  currency,
  onOpenAddProduct,
  onOpenReceiveStock,
  permissions,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = ['All', ...Array.from(new Set(products.map((p) => p.category)))];

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const physicalProducts = products.filter((p) => p.category !== 'Services' && p.quantity < 999);
  const totalCostValue = physicalProducts.reduce((s, p) => s + p.costPrice * p.quantity, 0);
  const lowStockCount = getLowStockProducts(products).length;

  return (
    <div className="space-y-5">
      {/* Compact Stock KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-4 min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
            Total Inventory Cost Value
          </div>
          <div className="mt-1.5 text-xl sm:text-2xl font-bold text-[#111827] tabular-nums break-words">
            {formatSBD(totalCostValue, currency)}
          </div>
          <div className="text-[12px] text-[#64748B] mt-1">
            Across {physicalProducts.length} physical SKUs
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-lg p-4 min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
            Catalogue Items
          </div>
          <div className="mt-1.5 text-xl sm:text-2xl font-bold text-[#111827] tabular-nums">
            {products.length}
          </div>
          <div className="text-[12px] text-[#64748B] mt-1">
            Products &amp; billable services
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-lg p-4 min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
            Low Stock Alerts
          </div>
          <div
            className={`mt-1.5 text-xl sm:text-2xl font-bold tabular-nums ${
              lowStockCount > 0 ? 'text-[#DC2626]' : 'text-[#16A34A]'
            }`}
          >
            {lowStockCount}
          </div>
          <div className="text-[12px] text-[#64748B] mt-1">
            Items at or below threshold
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white border border-[#E2E8F0] rounded-lg p-3.5 flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3">
        <div className="relative flex-1 min-w-0 xl:max-w-md">
          <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            aria-label="Search inventory"
            placeholder="Search by product name or SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-9 pl-9 pr-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md text-[13px] text-[#111827] placeholder:text-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/25 focus:border-[#2563EB]"
          />
        </div>

        <div className="flex items-center justify-between xl:justify-end gap-2.5 flex-wrap min-w-0 max-w-full">
          <div className="flex items-center p-0.5 bg-[#F3F6FA] border border-[#E2E8F0] rounded-md overflow-x-auto max-w-full">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-white text-[#111827] shadow-2xs border border-[#E2E8F0]'
                    : 'text-[#64748B] hover:text-[#111827]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {permissions.canManageStock && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => onOpenReceiveStock()}
                className="h-9 px-3 rounded-md border border-[#E2E8F0] bg-white hover:bg-slate-50 text-[#111827] text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
              >
                <PackagePlus className="w-3.5 h-3.5 text-[#2563EB]" />
                <span>Receive Stock</span>
              </button>
              <button
                type="button"
                onClick={onOpenAddProduct}
                className="h-9 px-3.5 rounded-md bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Product</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden min-w-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-4">SKU</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Cost Price</th>
                <th className="py-3 px-4 text-right">Selling Price</th>
                <th className="py-3 px-4 text-right">In Stock</th>
                <th className="py-3 px-4 text-right">Alert Min</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-[13px]">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-[#64748B]">
                    No products match your search criteria.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((prod) => {
                  const isService = prod.category === 'Services' || prod.quantity >= 999;
                  const isLowStock = !isService && prod.quantity <= prod.minStockAlert;

                  return (
                    <tr key={prod.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-2.5 px-4 font-semibold text-[#111827]">
                        {prod.name}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-xs text-[#64748B] whitespace-nowrap">
                        {prod.sku}
                      </td>
                      <td className="py-2.5 px-4 text-xs text-[#64748B] whitespace-nowrap">
                        {prod.category}
                      </td>
                      <td className="py-2.5 px-4 text-right text-[#64748B] whitespace-nowrap tabular-nums">
                        {formatSBD(prod.costPrice, currency)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-semibold text-[#111827] whitespace-nowrap tabular-nums">
                        {formatSBD(prod.sellingPrice, currency)}
                      </td>
                      <td className="py-2.5 px-4 text-right whitespace-nowrap tabular-nums">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <span
                            className={`font-semibold ${
                              isLowStock ? 'text-[#DC2626]' : 'text-[#111827]'
                            }`}
                          >
                            {isService ? 'Service' : `${prod.quantity} ${prod.unit}`}
                          </span>
                          {isLowStock && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-red-200 bg-red-50 text-[#DC2626] text-[10px] font-semibold">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              Low
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-right text-xs text-[#64748B] tabular-nums">
                        {isService ? '—' : prod.minStockAlert}
                      </td>
                      <td className="py-2.5 px-4 text-right whitespace-nowrap">
                        {permissions.canManageStock ? (
                          <button
                            type="button"
                            onClick={() => onOpenReceiveStock(prod)}
                            className="h-7 px-2.5 rounded border border-[#E2E8F0] bg-white hover:bg-[#2563EB] hover:text-white hover:border-[#2563EB] text-[#111827] text-xs font-medium inline-flex items-center gap-1 transition-colors"
                          >
                            <PackagePlus className="w-3 h-3" />
                            <span>Restock</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-[#64748B]">View only</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Immutable Inventory Movement History */}
      <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden min-w-0">
        <div className="px-4 py-3.5 border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <History className="w-4 h-4 text-[#2563EB] shrink-0" />
            <div className="min-w-0">
              <h2 className="text-[14px] font-semibold text-[#111827]">Stock Movement Ledger</h2>
              <p className="text-[12px] text-[#64748B]">
                Recent restocks, invoice deductions, and stock adjustments
              </p>
            </div>
          </div>
          <span className="text-xs text-[#64748B] tabular-nums shrink-0">
            Latest {Math.min(inventoryMovements.length, 15)} movements
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                <th className="py-2.5 px-4">Product</th>
                <th className="py-2.5 px-4">Type</th>
                <th className="py-2.5 px-4">Reason</th>
                <th className="py-2.5 px-4 text-right">Change</th>
                <th className="py-2.5 px-4 text-right">Balance After</th>
                <th className="py-2.5 px-4 text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-xs">
              {inventoryMovements.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-7 text-center text-[#64748B]">
                    No stock movements recorded yet.
                  </td>
                </tr>
              ) : (
                inventoryMovements.slice(0, 15).map((mov) => (
                  <tr key={mov.id} className="hover:bg-[#F8FAFC]">
                    <td className="py-2.5 px-4 font-semibold text-[#111827]">{mov.productName}</td>
                    <td className="py-2.5 px-4 uppercase font-mono text-[11px] text-[#64748B]">
                      {mov.type}
                    </td>
                    <td className="py-2.5 px-4 text-[#64748B]">{mov.reason || '—'}</td>
                    <td
                      className={`py-2.5 px-4 text-right font-semibold tabular-nums ${
                        mov.quantityDelta >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'
                      }`}
                    >
                      {mov.quantityDelta >= 0 ? `+${mov.quantityDelta}` : mov.quantityDelta}
                    </td>
                    <td className="py-2.5 px-4 text-right font-medium text-[#111827] tabular-nums">
                      {mov.newQty}
                    </td>
                    <td className="py-2.5 px-4 text-right text-[#64748B] whitespace-nowrap tabular-nums">
                      {new Date(mov.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
