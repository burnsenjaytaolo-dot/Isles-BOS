import React, { useState } from 'react';
import { Customer } from '../../types';
import { X } from 'lucide-react';

interface AddCustomerModalProps {
  onClose: () => void;
  onSaveCustomer: (customer: Omit<Customer, 'id' | 'balance' | 'totalSpent'>) => void;
}

export const AddCustomerModal: React.FC<AddCustomerModalProps> = ({
  onClose,
  onSaveCustomer,
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Please enter a customer name.');
      return;
    }

    onSaveCustomer({
      name: name.trim(),
      phone: phone.trim() || 'N/A',
      email: email.trim() || undefined,
      address: address.trim() || undefined,
    });
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-[1px] z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-customer-title"
    >
      <div className="bg-white rounded-lg border border-[#E2E8F0] max-w-md w-full shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <h3 id="add-customer-title" className="text-base font-bold text-[#111827]">
              Add Customer Account
            </h3>
            <p className="text-xs text-[#64748B]">Save contact details and credit profile</p>
          </div>
          <button
            type="button"
            aria-label="Close add customer modal"
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
              htmlFor="customer-name"
              className="block text-xs font-semibold text-[#111827] mb-1.5"
            >
              Customer Name
            </label>
            <input
              id="customer-name"
              type="text"
              placeholder="e.g. John Kana"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setErrorMsg('');
              }}
              className="w-full h-10 px-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md text-[13px]"
              required
            />
          </div>

          <div>
            <label
              htmlFor="customer-phone"
              className="block text-xs font-semibold text-[#111827] mb-1.5"
            >
              Phone Number
            </label>
            <input
              id="customer-phone"
              type="text"
              placeholder="e.g. +677 7123456"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full h-10 px-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md text-[13px] font-mono"
            />
          </div>

          <div>
            <label
              htmlFor="customer-email"
              className="block text-xs font-semibold text-[#111827] mb-1.5"
            >
              Email (Optional)
            </label>
            <input
              id="customer-email"
              type="email"
              placeholder="customer@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-10 px-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md text-[13px]"
            />
          </div>

          <div>
            <label
              htmlFor="customer-address"
              className="block text-xs font-semibold text-[#111827] mb-1.5"
            >
              Address / Location
            </label>
            <input
              id="customer-address"
              type="text"
              placeholder="e.g. Mataniko, Honiara"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
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
              Save Customer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
