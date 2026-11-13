import React, { useState } from 'react';
import { Expense, PaymentMethod } from '../../types';
import { X } from 'lucide-react';

interface AddExpenseModalProps {
  currency: string;
  categories?: string[];
  onClose: () => void;
  onSaveExpense: (expense: Omit<Expense, 'id'>) => void;
}

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  currency,
  categories: customCategories,
  onClose,
  onSaveExpense,
}) => {
  const categories =
    customCategories && customCategories.length > 0
      ? customCategories
      : [
          'Transport',
          'Logistics',
          'Rent',
          'Utilities',
          'Wages',
          'Stock Purchase',
          'Maintenance',
          'Other',
        ];

  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(categories[0]);
  const [amount, setAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [reference, setReference] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || amount <= 0) {
      setErrorMsg('Please enter an expense description and an amount greater than 0.');
      return;
    }

    onSaveExpense({
      description: description.trim(),
      category,
      amount: Number(amount),
      date: new Date().toISOString(),
      paymentMethod,
      reference: reference.trim() || undefined,
    });
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-[1px] z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-expense-title"
    >
      <div className="bg-white rounded-lg border border-[#E2E8F0] max-w-md w-full shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <h3 id="add-expense-title" className="text-base font-bold text-[#111827]">
              Add Business Expense
            </h3>
            <p className="text-xs text-[#64748B]">Record supplier bill or operating cost</p>
          </div>
          <button
            type="button"
            aria-label="Close add expense modal"
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
              htmlFor="expense-description"
              className="block text-xs font-semibold text-[#111827] mb-1.5"
            >
              Description
            </label>
            <input
              id="expense-description"
              type="text"
              placeholder="e.g. Fuel for delivery truck"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setErrorMsg('');
              }}
              className="w-full h-10 px-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md text-[13px]"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="expense-category"
                className="block text-xs font-semibold text-[#111827] mb-1.5"
              >
                Category
              </label>
              <select
                id="expense-category"
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

            <div>
              <label
                htmlFor="expense-method"
                className="block text-xs font-semibold text-[#111827] mb-1.5"
              >
                Method
              </label>
              <select
                id="expense-method"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full h-10 px-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md text-[13px] font-medium"
              >
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Mobile Money">Mobile Money</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="expense-amount"
                className="block text-xs font-semibold text-[#111827] mb-1.5"
              >
                Amount ({currency})
              </label>
              <input
                id="expense-amount"
                type="number"
                min="1"
                step="0.01"
                value={amount || ''}
                onChange={(e) => {
                  setAmount(parseFloat(e.target.value) || 0);
                  setErrorMsg('');
                }}
                className="w-full h-10 px-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md text-sm font-bold text-[#DC2626] tabular-nums"
                required
              />
            </div>

            <div>
              <label
                htmlFor="expense-ref"
                className="block text-xs font-semibold text-[#111827] mb-1.5"
              >
                Reference (Optional)
              </label>
              <input
                id="expense-ref"
                type="text"
                placeholder="e.g. INV-9921"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="w-full h-10 px-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md text-[13px] font-mono"
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
              Save Expense
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
