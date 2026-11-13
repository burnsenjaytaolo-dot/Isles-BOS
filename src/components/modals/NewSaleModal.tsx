import React, { useState } from 'react';
import { Customer, Product, Sale, SaleItem, PaymentStatus, PaymentMethod } from '../../types';
import { formatSBD } from '../../utils/analytics';
import { Trash2, X } from 'lucide-react';

interface NewSaleModalProps {
  customers: Customer[];
  products: Product[];
  currency: string;
  onClose: () => void;
  onSaveSale: (sale: Omit<Sale, 'id' | 'invoiceNo'>) => void;
}

export const NewSaleModal: React.FC<NewSaleModalProps> = ({
  customers,
  products,
  currency,
  onClose,
  onSaveSale,
}) => {
  const [selectedCustomerId, setSelectedCustomerId] = useState(customers[0]?.id || '');
  const [cartItems, setCartItems] = useState<{ product: Product; quantity: number; price: number }[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('Paid');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleAddProduct = (prodId: string) => {
    const prod = products.find((p) => p.id === prodId);
    if (!prod) return;
    setErrorMsg('');

    const existingIndex = cartItems.findIndex((i) => i.product.id === prodId);
    if (existingIndex > -1) {
      const updated = [...cartItems];
      updated[existingIndex].quantity += 1;
      setCartItems(updated);
    } else {
      setCartItems([...cartItems, { product: prod, quantity: 1, price: prod.sellingPrice }]);
    }
    setSelectedProductId('');
  };

  const handleUpdateQty = (index: number, newQty: number) => {
    if (newQty <= 0) {
      setCartItems(cartItems.filter((_, i) => i !== index));
    } else {
      const updated = [...cartItems];
      updated[index].quantity = newQty;
      setCartItems(updated);
    }
  };

  const handleUpdatePrice = (index: number, newPrice: number) => {
    const updated = [...cartItems];
    updated[index].price = newPrice;
    setCartItems(updated);
  };

  const subtotal = cartItems.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const total = Math.max(0, subtotal - discount);

  const handleCompleteSale = (e: React.FormEvent) => {
    e.preventDefault();
    if (cartItems.length === 0) {
      setErrorMsg('Please select at least one product or service to include in this sale.');
      return;
    }

    const customer = customers.find((c) => c.id === selectedCustomerId) || customers[0];

    let finalAmountPaid = total;
    if (paymentStatus === 'Pay later') finalAmountPaid = 0;
    else if (paymentStatus === 'Part paid') finalAmountPaid = Math.min(total, Number(amountPaid) || 0);

    const saleItems: SaleItem[] = cartItems.map((i) => ({
      productId: i.product.id,
      name: i.product.name,
      quantity: i.quantity,
      price: i.price,
      costPrice: i.product.costPrice,
    }));

    onSaveSale({
      customerId: customer.id,
      customerName: customer.name,
      date: new Date().toISOString(),
      items: saleItems,
      subtotal,
      discount,
      total,
      status: paymentStatus,
      amountPaid: finalAmountPaid,
      paymentMethod,
      type: 'sale',
      notes,
    });
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-[1px] z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-sale-title"
    >
      <div className="bg-white rounded-lg border border-[#E2E8F0] max-w-2xl w-full shadow-xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between shrink-0">
          <div>
            <h3 id="new-sale-title" className="text-base font-bold text-[#111827]">
              New Sale & Invoice
            </h3>
            <p className="text-xs text-[#64748B]">
              Select customer, add items, and choose payment terms
            </p>
          </div>
          <button
            type="button"
            aria-label="Close new sale modal"
            onClick={onClose}
            className="w-8 h-8 rounded-md hover:bg-slate-100 text-[#64748B] flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleCompleteSale} className="p-5 space-y-4 overflow-y-auto">
          {errorMsg && (
            <div
              role="alert"
              className="p-3 rounded-md bg-red-50 border border-red-200 text-xs font-medium text-[#DC2626]"
            >
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="sale-customer"
                className="block text-xs font-semibold text-[#111827] mb-1.5"
              >
                Customer
              </label>
              <select
                id="sale-customer"
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full h-10 px-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md text-[13px] font-medium text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/25 focus:border-[#2563EB]"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.balance > 0 ? `(Owes ${formatSBD(c.balance, currency)})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="sale-add-product"
                className="block text-xs font-semibold text-[#111827] mb-1.5"
              >
                Add Product or Service
              </label>
              <select
                id="sale-add-product"
                value={selectedProductId}
                onChange={(e) => {
                  if (e.target.value) handleAddProduct(e.target.value);
                }}
                className="w-full h-10 px-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md text-[13px] text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/25 focus:border-[#2563EB]"
              >
                <option value="">Select product to add...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {formatSBD(p.sellingPrice, currency)} ({p.quantity} {p.unit})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Cart Items */}
          <div>
            <div className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-1.5">
              Line Items ({cartItems.length})
            </div>
            <div className="border border-[#E2E8F0] rounded-md overflow-hidden divide-y divide-[#E2E8F0]">
              {cartItems.length === 0 ? (
                <p className="text-xs text-[#64748B] py-6 text-center bg-[#F8FAFC]">
                  No items added yet. Choose a product from the dropdown above.
                </p>
              ) : (
                cartItems.map((item, index) => (
                  <div
                    key={item.product.id}
                    className="p-3 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 bg-white"
                  >
                    <div className="flex-1 min-w-[160px]">
                      <div className="font-semibold text-[#111827] text-[13px]">
                        {item.product.name}
                      </div>
                      <div className="text-[11px] text-[#64748B]">
                        {item.product.quantity} {item.product.unit} available
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        aria-label={`Unit price for ${item.product.name}`}
                        min="0"
                        step="0.01"
                        value={item.price}
                        onChange={(e) => handleUpdatePrice(index, parseFloat(e.target.value) || 0)}
                        className="w-24 h-8 px-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded text-xs text-right font-semibold tabular-nums"
                      />
                      <span className="text-xs text-[#64748B]">×</span>
                      <input
                        type="number"
                        aria-label={`Quantity for ${item.product.name}`}
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleUpdateQty(index, parseInt(e.target.value, 10) || 0)}
                        className="w-16 h-8 px-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded text-xs text-center font-semibold tabular-nums"
                      />
                    </div>

                    <div className="w-24 text-right text-[13px] font-bold text-[#111827] tabular-nums">
                      {formatSBD(item.price * item.quantity, currency)}
                    </div>

                    <button
                      type="button"
                      aria-label={`Remove ${item.product.name}`}
                      onClick={() => handleUpdateQty(index, 0)}
                      className="text-[#64748B] hover:text-[#DC2626] p-1 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Totals */}
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-3.5 rounded-md space-y-2 text-[13px]">
            <div className="flex justify-between text-[#64748B]">
              <span>Subtotal</span>
              <span className="font-semibold text-[#111827] tabular-nums">
                {formatSBD(subtotal, currency)}
              </span>
            </div>
            <div className="flex justify-between items-center text-[#64748B]">
              <label htmlFor="sale-discount">Discount ({currency})</label>
              <input
                id="sale-discount"
                type="number"
                min="0"
                value={discount}
                onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                className="w-28 h-8 px-2 bg-white border border-[#E2E8F0] rounded text-right font-semibold text-[#111827] tabular-nums"
              />
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-[#E2E8F0]">
              <span className="font-bold text-[#111827]">Total Due</span>
              <span className="text-lg font-bold text-[#2563EB] tabular-nums">
                {formatSBD(total, currency)}
              </span>
            </div>
          </div>

          {/* Payment Terms */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label
                htmlFor="sale-status"
                className="block text-xs font-semibold text-[#111827] mb-1.5"
              >
                Payment Status
              </label>
              <select
                id="sale-status"
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                className="w-full h-10 px-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md text-[13px] font-medium text-[#111827]"
              >
                <option value="Paid">Paid</option>
                <option value="Part paid">Part paid</option>
                <option value="Pay later">Pay later</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="sale-method"
                className="block text-xs font-semibold text-[#111827] mb-1.5"
              >
                Payment Method
              </label>
              <select
                id="sale-method"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full h-10 px-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md text-[13px] font-medium text-[#111827]"
              >
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Mobile Money">Mobile Money</option>
                <option value="Credit">Credit</option>
              </select>
            </div>

            {paymentStatus === 'Part paid' && (
              <div>
                <label
                  htmlFor="sale-part-paid"
                  className="block text-xs font-semibold text-[#111827] mb-1.5"
                >
                  Amount Paid Now
                </label>
                <input
                  id="sale-part-paid"
                  type="number"
                  min="0"
                  max={total}
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                  className="w-full h-10 px-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md text-[13px] font-bold tabular-nums"
                  required
                />
              </div>
            )}
          </div>

          <div>
            <label
              htmlFor="sale-notes"
              className="block text-xs font-semibold text-[#111827] mb-1.5"
            >
              Notes (Optional)
            </label>
            <input
              id="sale-notes"
              type="text"
              placeholder="Delivery instructions or reference..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full h-10 px-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md text-[13px]"
            />
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
              Save & Print Receipt
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
