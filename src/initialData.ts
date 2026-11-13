import { Product, Customer, Sale, Expense, BusinessSettings } from './types';

const today = new Date().toISOString();
const yesterday = new Date(Date.now() - 86400000).toISOString();
const threeDaysAgo = new Date(Date.now() - 86400000 * 3).toISOString();

export const initialSettings: BusinessSettings = {
  businessName: 'Isles Retail & Hardware BOS',
  ownerName: 'Robert Maeta',
  phone: '+677 7481920',
  email: 'sales@islesretail.sb',
  address: 'Point Cruz, Mendana Avenue, Honiara',
  currency: 'SBD',
  taxRate: 0,
  receiptFooter: 'Thank you for shopping with Isles BOS! Goods once sold are not returnable without receipt.',
  staffMembers: [
    { id: 'st1', name: 'Robert Maeta', role: 'Admin' },
    { id: 'st2', name: 'Grace Pako', role: 'Cashier' },
    { id: 'st3', name: 'Junior Tisa', role: 'Manager' },
  ],
};

export const initialCustomers: Customer[] = [
  {
    id: 'cust-walkin',
    name: 'Walk-in customer',
    phone: 'N/A',
    balance: 0,
    totalSpent: 4200,
  },
  {
    id: 'cust-1',
    name: 'John Kana (SolBrew Contractor)',
    phone: '+677 7123456',
    email: 'john.kana@solbrew.com.sb',
    address: 'Mataniko, Honiara',
    balance: 3400,
    totalSpent: 12800,
  },
  {
    id: 'cust-2',
    name: 'Mary Tari (Kukum Clinic)',
    phone: '+677 8492011',
    address: 'Kukum Highway, Honiara',
    balance: 2800,
    totalSpent: 8900,
  },
  {
    id: 'cust-3',
    name: 'Chief David Bale',
    phone: '+677 7930219',
    address: 'Rennell Bellona Province',
    balance: 0,
    totalSpent: 15400,
  },
  {
    id: 'cust-4',
    name: 'Pacific Sunrise Lodge',
    phone: '+677 21455',
    email: 'frontdesk@pacificsunrise.sb',
    address: 'Tetere, Guadalcanal',
    balance: 0,
    totalSpent: 22000,
  },
];

export const initialProducts: Product[] = [
  {
    id: 'prod-1',
    name: 'Solomon Blue Tuna Cans (425g)',
    sku: 'SB-TUNA-425',
    category: 'Groceries',
    costPrice: 18,
    sellingPrice: 24,
    quantity: 145,
    minStockAlert: 20,
    unit: 'tin',
  },
  {
    id: 'prod-2',
    name: 'Royal Rice (20kg Bag)',
    sku: 'RICE-ROY-20',
    category: 'Groceries',
    costPrice: 220,
    sellingPrice: 280,
    quantity: 8, // Low stock alert!
    minStockAlert: 15,
    unit: 'bag',
  },
  {
    id: 'prod-3',
    name: 'Super Cook Cooking Oil (5L)',
    sku: 'OIL-SC-5L',
    category: 'Groceries',
    costPrice: 95,
    sellingPrice: 125,
    quantity: 34,
    minStockAlert: 10,
    unit: 'bottle',
  },
  {
    id: 'prod-4',
    name: 'Solomon Power Prepaid Token ($100)',
    sku: 'SP-PRE-100',
    category: 'Utilities',
    costPrice: 98,
    sellingPrice: 100,
    quantity: 50,
    minStockAlert: 10,
    unit: 'token',
  },
  {
    id: 'prod-5',
    name: 'Galvanized Roofing Iron (24g x 10ft)',
    sku: 'HW-ROOF-10',
    category: 'Hardware',
    costPrice: 110,
    sellingPrice: 145,
    quantity: 4, // Low stock alert!
    minStockAlert: 10,
    unit: 'sheet',
  },
  {
    id: 'prod-6',
    name: 'Portland Cement (50kg Bag)',
    sku: 'HW-CEM-50',
    category: 'Hardware',
    costPrice: 130,
    sellingPrice: 170,
    quantity: 65,
    minStockAlert: 15,
    unit: 'bag',
  },
  {
    id: 'prod-7',
    name: 'Unleaded Petrol (20L Drum)',
    sku: 'FUEL-PET-20',
    category: 'Fuel',
    costPrice: 240,
    sellingPrice: 290,
    quantity: 18,
    minStockAlert: 5,
    unit: 'drum',
  },
  {
    id: 'prod-8',
    name: 'Hardware Delivery Service (Town Area)',
    sku: 'SRV-DEL-TOWN',
    category: 'Services',
    costPrice: 0,
    sellingPrice: 120,
    quantity: 999,
    minStockAlert: 0,
    unit: 'trip',
  },
];

export const initialSales: Sale[] = [
  {
    id: 'sale-104',
    invoiceNo: '#104',
    customerId: 'cust-walkin',
    customerName: 'Walk-in customer',
    date: today,
    items: [
      { productId: 'prod-1', name: 'Solomon Blue Tuna Cans (425g)', quantity: 20, price: 24, costPrice: 18 },
      { productId: 'prod-3', name: 'Super Cook Cooking Oil (5L)', quantity: 1, price: 125, costPrice: 95 }
    ],
    subtotal: 605,
    discount: 0,
    total: 605,
    status: 'Paid',
    amountPaid: 605,
    paymentMethod: 'Cash',
    type: 'sale',
  },
  {
    id: 'sale-103',
    invoiceNo: '#103',
    customerId: 'cust-1',
    customerName: 'John Kana (SolBrew Contractor)',
    date: yesterday,
    items: [
      { productId: 'prod-6', name: 'Portland Cement (50kg Bag)', quantity: 10, price: 170, costPrice: 130 },
      { productId: 'prod-5', name: 'Galvanized Roofing Iron (24g x 10ft)', quantity: 15, price: 145, costPrice: 110 }
    ],
    subtotal: 3875,
    discount: 75,
    total: 3800,
    status: 'Part paid',
    amountPaid: 400,
    paymentMethod: 'Bank Transfer',
    type: 'sale',
  },
  {
    id: 'sale-102',
    invoiceNo: '#102',
    customerId: 'cust-2',
    customerName: 'Mary Tari (Kukum Clinic)',
    date: threeDaysAgo,
    items: [
      { productId: 'prod-2', name: 'Royal Rice (20kg Bag)', quantity: 10, price: 280, costPrice: 220 }
    ],
    subtotal: 2800,
    discount: 0,
    total: 2800,
    status: 'Pay later',
    amountPaid: 0,
    paymentMethod: 'Credit',
    type: 'sale',
  },
  {
    id: 'sale-101',
    invoiceNo: '#101',
    customerId: 'cust-3',
    customerName: 'Chief David Bale',
    date: threeDaysAgo,
    items: [
      { productId: 'prod-7', name: 'Unleaded Petrol (20L Drum)', quantity: 5, price: 290, costPrice: 240 }
    ],
    subtotal: 1450,
    discount: 50,
    total: 1400,
    status: 'Paid',
    amountPaid: 1400,
    paymentMethod: 'Cash',
    type: 'sale',
  }
];

export const initialExpenses: Expense[] = [
  {
    id: 'exp-1',
    description: 'Fuel for delivery truck (Honiara to Tetere)',
    category: 'Transport',
    amount: 350,
    date: today,
    paymentMethod: 'Cash',
    reference: 'TRK-992',
  },
  {
    id: 'exp-2',
    description: 'Wharf storage fees (Port Authority)',
    category: 'Logistics',
    amount: 850,
    date: yesterday,
    paymentMethod: 'Bank Transfer',
    reference: 'PA-INV-4412',
  },
  {
    id: 'exp-3',
    description: 'Store electricity recharge (Solomon Power)',
    category: 'Utilities',
    amount: 600,
    date: threeDaysAgo,
    paymentMethod: 'Mobile Money',
    reference: 'TOKEN-88910',
  }
];
