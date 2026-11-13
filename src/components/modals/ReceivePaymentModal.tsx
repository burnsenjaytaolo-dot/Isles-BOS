import React, { useState } from 'react';
import { Customer, PaymentMethod } from '../../types';
import { formatSBD } from '../../utils/analytics';
import { X } from 'lucide-react';

interface ReceivePaymentModalProps {
  customers: Customer[];
  preselectedCustomer?: Customer | null;
  currency: string;
  onClose: () => void;
  onSavePayment: (payment: {
    customerId: string;
    amount: number;
    method: PaymentMethod;
    note?: string;
  }) => void;
}

export const ReceivePaymentModal: React.FC<ReceivePaymentModalProps> = ({
  customers,
  preselectedCustomer,
  currency,
  onClose,
  onSavePayment,
}) => {
  const [customerId, setCustomerId] = useState(
    preselectedCustomer?.id ||
      customers.find((c) => c.balance > 0)?.id ||
      customers[0]?.id ||
      ''
  );
  const [amount, setAmount] = useState<number>(
    preselectedCustomer?.balance ||
      customers.find((c) => c.balance > 0)?.balance ||
      0
  );
  const [method, setMethod] = useState<PaymentMethod>('Cash');
  const [note, setNote] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const selectedCustomer = customers.find((c) => c.id === customerId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      setErrorMsg('Please enter a valid payment amount greater than 0.');
      return;
    }

    onSavePayment({
      customerId,
      amount: Number(amount),
      method,
      note,
    });
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-[1px] z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="receive-payment-title"
    >
      <div className="bg-white rounded-lg border border-[#E2E8F0] max-w-md w-full shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <h3 id="receive-payment-title" className="text-base font-bold text-[#111827]">
              Receive Customer Payment
            </h3>
            <p className="text-xs text-[#64748B]">Record settlement against customer balance</p>
          </div>
          <button
            type="button"
            aria-label="Close receive payment modal"
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
              htmlFor="payment-customer"
              className="block text-xs font-semibold text-[#111827] mb-1.5"
            >
              Customer Account
            </label>
            <select
              id="payment-customer"
              value={customerId}
              onChange={(e) => {
                setCustomerId(e.target.value);
                const c = customers.find((cust) => cust.id === e.target.value);
                if (c) setAmount(c.balance);
              }}
              className="w-full h-10 px-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md text-[13px] font-medium text-[#111827]"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.balance > 0 ? `(Owes ${formatSBD(c.balance, currency)})` : ''}
                </option>
              ))}
            </select>
          </div>

          {selectedCustomer && (
            <div className="p-3 rounded-md bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between text-xs">
              <span className="text-[#64748B]">Outstanding Balance</span>
              <span className="font-bold text-[#D97706] tabular-nums">
                {formatSBD(selectedCustomer.balance, currency)}
              </span>
            </div>
          )}

          <div>
            <label
              htmlFor="payment-amount"
              className="block text-xs font-semibold text-[#111827] mb-1.5"
            >
              Amount Received ({currency})
            </label>
            <input
              id="payment-amount"
              type="number"
              min="1"
              step="0.01"
              value={amount || ''}
              onChange={(e) => {
                setAmount(parseFloat(e.target.value) || 0);
                setErrorMsg('');
              }}
              className="w-full h-10 px-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md text-sm font-bold text-[#111827] tabular-nums"
              required
            />
          </div>

          <div>
            <label
              htmlFor="payment-method"
              className="block text-xs font-semibold text-[#111827] mb-1.5"
            >
              Payment Method
            </label>
            <select
              id="payment-method"
              value={method}
              onChange={(e) => setMethod(e.target.value as PaymentMethod)}
              className="w-full h-10 px-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md text-[13px] font-medium text-[#111827]"
            >
              <option value="Cash">Cash</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Mobile Money">Mobile Money</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="payment-note"
              className="block text-xs font-semibold text-[#111827] mb-1.5"
            >
              Reference / Note (Optional)
            </label>
            <input
              id="payment-note"
              type="text"
              placeholder="Receipt # or bank transfer ref"
              value={note}
              onChange={(e) => setNote(e.target.value)}
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
              Confirm Payment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
