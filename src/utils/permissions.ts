import {
  BusinessType,
  Customer,
  DebtPayment,
  Expense,
  PermissionSet,
  Product,
  Sale,
  UserRole,
} from '../types';

export const ALL_USER_ROLES: UserRole[] = [
  'Owner',
  'Administrator',
  'Manager',
  'Cashier',
  'Inventory Staff',
  'Accountant',
  'Viewer',
];

export const INVITABLE_ROLES: Exclude<UserRole, 'Owner'>[] = [
  'Administrator',
  'Manager',
  'Cashier',
  'Inventory Staff',
  'Accountant',
  'Viewer',
];

const EMPTY_PERMISSIONS: PermissionSet = {
  canViewDashboard: false,
  canViewSales: false,
  canCreateSale: false,
  canRecordPayment: false,
  canViewStock: false,
  canManageStock: false,
  canViewCustomers: false,
  canManageCustomers: false,
  canViewMoney: false,
  canManageExpenses: false,
  canViewSettings: false,
  canManageSettings: false,
  canInviteStaff: false,
  canManageRoles: false,
  canTransferOwnership: false,
  canExportData: false,
  canMigrateData: false,
};

export const ROLE_PERMISSIONS: Record<UserRole, PermissionSet> = {
  Owner: {
    canViewDashboard: true,
    canViewSales: true,
    canCreateSale: true,
    canRecordPayment: true,
    canViewStock: true,
    canManageStock: true,
    canViewCustomers: true,
    canManageCustomers: true,
    canViewMoney: true,
    canManageExpenses: true,
    canViewSettings: true,
    canManageSettings: true,
    canInviteStaff: true,
    canManageRoles: true,
    canTransferOwnership: true,
    canExportData: true,
    canMigrateData: true,
  },
  Administrator: {
    canViewDashboard: true,
    canViewSales: true,
    canCreateSale: true,
    canRecordPayment: true,
    canViewStock: true,
    canManageStock: true,
    canViewCustomers: true,
    canManageCustomers: true,
    canViewMoney: true,
    canManageExpenses: true,
    canViewSettings: true,
    canManageSettings: true,
    canInviteStaff: true,
    canManageRoles: true,
    canTransferOwnership: false,
    canExportData: true,
    canMigrateData: true,
  },
  Manager: {
    canViewDashboard: true,
    canViewSales: true,
    canCreateSale: true,
    canRecordPayment: true,
    canViewStock: true,
    canManageStock: true,
    canViewCustomers: true,
    canManageCustomers: true,
    canViewMoney: true,
    canManageExpenses: true,
    canViewSettings: true,
    canManageSettings: false,
    canInviteStaff: false,
    canManageRoles: false,
    canTransferOwnership: false,
    canExportData: true,
    canMigrateData: false,
  },
  Cashier: {
    canViewDashboard: true,
    canViewSales: true,
    canCreateSale: true,
    canRecordPayment: true,
    canViewStock: true,
    canManageStock: false,
    canViewCustomers: true,
    canManageCustomers: true,
    canViewMoney: false,
    canManageExpenses: false,
    canViewSettings: false,
    canManageSettings: false,
    canInviteStaff: false,
    canManageRoles: false,
    canTransferOwnership: false,
    canExportData: false,
    canMigrateData: false,
  },
  'Inventory Staff': {
    canViewDashboard: true,
    canViewSales: false,
    canCreateSale: false,
    canRecordPayment: false,
    canViewStock: true,
    canManageStock: true,
    canViewCustomers: false,
    canManageCustomers: false,
    canViewMoney: false,
    canManageExpenses: false,
    canViewSettings: false,
    canManageSettings: false,
    canInviteStaff: false,
    canManageRoles: false,
    canTransferOwnership: false,
    canExportData: false,
    canMigrateData: false,
  },
  Accountant: {
    canViewDashboard: true,
    canViewSales: true,
    canCreateSale: false,
    canRecordPayment: true,
    canViewStock: true,
    canManageStock: false,
    canViewCustomers: true,
    canManageCustomers: true,
    canViewMoney: true,
    canManageExpenses: true,
    canViewSettings: true,
    canManageSettings: false,
    canInviteStaff: false,
    canManageRoles: false,
    canTransferOwnership: false,
    canExportData: true,
    canMigrateData: false,
  },
  Viewer: {
    canViewDashboard: true,
    canViewSales: true,
    canCreateSale: false,
    canRecordPayment: false,
    canViewStock: true,
    canManageStock: false,
    canViewCustomers: true,
    canManageCustomers: false,
    canViewMoney: true,
    canManageExpenses: false,
    canViewSettings: true,
    canManageSettings: false,
    canInviteStaff: false,
    canManageRoles: false,
    canTransferOwnership: false,
    canExportData: true,
    canMigrateData: false,
  },
};

export function getPermissionsForRole(role?: UserRole | null): PermissionSet {
  if (!role || !(role in ROLE_PERMISSIONS)) {
    return { ...EMPTY_PERMISSIONS };
  }
  return ROLE_PERMISSIONS[role];
}

export interface BusinessTypeTemplate {
  type: BusinessType;
  tagline: string;
  invoicePrefix: string;
  productCategories: string[];
  expenseCategories: string[];
}

export const BUSINESS_TYPE_TEMPLATES: BusinessTypeTemplate[] = [
  {
    type: 'Retail & General Store',
    tagline: 'Supermarkets, trade stores, groceries, and daily retail counters.',
    invoicePrefix: 'INV',
    productCategories: ['Groceries', 'Drinks', 'Household', 'Utilities', 'Services', 'Other'],
    expenseCategories: ['Stock Purchase', 'Transport', 'Rent', 'Utilities', 'Wages', 'Other'],
  },
  {
    type: 'Hardware & Building Supplies',
    tagline: 'Timber, roofing iron, cement, tools, plumbing, and contractor supply.',
    invoicePrefix: 'HW',
    productCategories: ['Hardware', 'Building Materials', 'Tools', 'Plumbing', 'Services', 'Other'],
    expenseCategories: ['Stock Purchase', 'Logistics', 'Transport', 'Warehouse Rent', 'Wages', 'Maintenance'],
  },
  {
    type: 'Wholesale & Distribution',
    tagline: 'Bulk carton distribution, provincial trade accounts, and wharf logistics.',
    invoicePrefix: 'WS',
    productCategories: ['Bulk Food', 'Beverages', 'Dry Goods', 'Packaging', 'Services'],
    expenseCategories: ['Wharf & Customs', 'Freight & Shipping', 'Transport', 'Warehouse', 'Wages'],
  },
  {
    type: 'Printing & Stationery',
    tagline: 'Commercial printing, banners, office supplies, and binding services.',
    invoicePrefix: 'PRN',
    productCategories: ['Printing Jobs', 'Paper & Ink', 'Stationery', 'Signage', 'Services'],
    expenseCategories: ['Paper & Consumables', 'Equipment Maintenance', 'Utilities', 'Rent', 'Wages'],
  },
  {
    type: 'Food & Beverage / Takeaway',
    tagline: 'Cafes, takeaway kitchens, bakeries, and catering operations.',
    invoicePrefix: 'FB',
    productCategories: ['Hot Meals', 'Bakery', 'Cold Drinks', 'Catering', 'Ingredients'],
    expenseCategories: ['Kitchen Supplies', 'Gas & Utilities', 'Packaging', 'Rent', 'Wages'],
  },
  {
    type: 'Pharmacy & Medical Supplies',
    tagline: 'Dispensaries, clinic supplies, wellness, and medical consumables.',
    invoicePrefix: 'RX',
    productCategories: ['OTC Medicine', 'Medical Supplies', 'First Aid', 'Personal Care', 'Services'],
    expenseCategories: ['Medical Stock', 'Cold Chain & Freight', 'Licensing', 'Rent', 'Wages'],
  },
  {
    type: 'Automotive & Fuel',
    tagline: 'Fuel depots, spare parts, lubricants, tyres, and workshop bays.',
    invoicePrefix: 'AUT',
    productCategories: ['Fuel', 'Lubricants', 'Spare Parts', 'Tyres', 'Workshop Services'],
    expenseCategories: ['Fuel Bulk Supply', 'Parts Procurement', 'Tools', 'Utilities', 'Wages'],
  },
  {
    type: 'Services & Contracting',
    tagline: 'Trade contractors, IT/consultancy, repairs, and field service billing.',
    invoicePrefix: 'SRV',
    productCategories: ['Services', 'Labour', 'Materials', 'Retainers', 'Equipment Hire'],
    expenseCategories: ['Subcontractors', 'Transport', 'Equipment', 'Communications', 'Wages'],
  },
  {
    type: 'Custom Multi-Purpose',
    tagline: 'Flexible workspace tailored for mixed retail, wholesale, and service lines.',
    invoicePrefix: 'BOS',
    productCategories: ['General', 'Groceries', 'Hardware', 'Services', 'Other'],
    expenseCategories: ['Stock Purchase', 'Transport', 'Logistics', 'Rent', 'Utilities', 'Wages', 'Other'],
  },
];

export function getTemplateForBusinessType(type: string): BusinessTypeTemplate {
  return (
    BUSINESS_TYPE_TEMPLATES.find((t) => t.type === type) ||
    BUSINESS_TYPE_TEMPLATES[BUSINESS_TYPE_TEMPLATES.length - 1]
  );
}

const VALID_ID_REGEX = /^[a-zA-Z0-9_-]{1,128}$/;

export function isValidFirestoreId(id: string): boolean {
  return typeof id === 'string' && VALID_ID_REGEX.test(id);
}

export function sanitizeId(raw: string, prefix = 'rec'): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '-').replace(/-+/g, '-').slice(0, 100);
  if (!cleaned || !VALID_ID_REGEX.test(cleaned)) {
    return `${prefix}-${Date.now()}`;
  }
  return cleaned;
}

export function truncateString(val: string | undefined, maxLen: number): string {
  if (!val) return '';
  return val.trim().slice(0, maxLen);
}

export interface BlueprintValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateSalePayload(sale: Partial<Sale>): BlueprintValidationResult {
  const errors: string[] = [];
  if (!sale.customerId || !isValidFirestoreId(sale.customerId)) {
    errors.push('Invalid customer identifier.');
  }
  if (!sale.customerName || sale.customerName.trim().length === 0 || sale.customerName.length > 120) {
    errors.push('Customer name must be 1–120 characters.');
  }
  if (!Array.isArray(sale.items) || sale.items.length < 1 || sale.items.length > 100) {
    errors.push('Sale must contain 1–100 line items.');
  }
  if (typeof sale.total !== 'number' || sale.total < 0) {
    errors.push('Total must be a non-negative number.');
  }
  if (typeof sale.amountPaid !== 'number' || sale.amountPaid < 0 || (typeof sale.total === 'number' && sale.amountPaid > sale.total)) {
    errors.push('Amount paid cannot exceed total.');
  }
  if (sale.status === 'Paid' && sale.amountPaid !== sale.total) {
    errors.push('Paid invoices must have amountPaid equal to total.');
  }
  if (sale.notes && sale.notes.length > 300) {
    errors.push('Notes must be 300 characters or fewer.');
  }
  return { valid: errors.length === 0, errors };
}

export function validateProductPayload(product: Partial<Product>): BlueprintValidationResult {
  const errors: string[] = [];
  if (!product.name || product.name.trim().length < 1 || product.name.length > 140) {
    errors.push('Product name must be 1–140 characters.');
  }
  if (!product.sku || product.sku.trim().length < 1 || product.sku.length > 60) {
    errors.push('SKU must be 1–60 characters.');
  }
  if (typeof product.costPrice !== 'number' || product.costPrice < 0) {
    errors.push('Cost price must be 0 or greater.');
  }
  if (typeof product.sellingPrice !== 'number' || product.sellingPrice < 0) {
    errors.push('Selling price must be 0 or greater.');
  }
  if (typeof product.quantity !== 'number' || product.quantity < 0) {
    errors.push('Quantity must be 0 or greater.');
  }
  if (typeof product.minStockAlert !== 'number' || product.minStockAlert < 0) {
    errors.push('Minimum stock alert must be 0 or greater.');
  }
  return { valid: errors.length === 0, errors };
}

export function validateCustomerPayload(customer: Partial<Customer>): BlueprintValidationResult {
  const errors: string[] = [];
  if (!customer.name || customer.name.trim().length < 1 || customer.name.length > 120) {
    errors.push('Customer name must be 1–120 characters.');
  }
  if (typeof customer.phone === 'string' && customer.phone.length > 40) {
    errors.push('Phone must be 40 characters or fewer.');
  }
  if (customer.email && customer.email.length > 150) {
    errors.push('Email must be 150 characters or fewer.');
  }
  if (customer.address && customer.address.length > 240) {
    errors.push('Address must be 240 characters or fewer.');
  }
  return { valid: errors.length === 0, errors };
}

export function validateExpensePayload(expense: Partial<Expense>): BlueprintValidationResult {
  const errors: string[] = [];
  if (!expense.description || expense.description.trim().length < 1 || expense.description.length > 240) {
    errors.push('Description must be 1–240 characters.');
  }
  if (typeof expense.amount !== 'number' || expense.amount <= 0) {
    errors.push('Expense amount must be greater than 0.');
  }
  if (!expense.category || expense.category.trim().length < 1 || expense.category.length > 60) {
    errors.push('Category must be 1–60 characters.');
  }
  return { valid: errors.length === 0, errors };
}

export function validatePaymentPayload(payment: Partial<DebtPayment>): BlueprintValidationResult {
  const errors: string[] = [];
  if (!payment.customerId || !isValidFirestoreId(payment.customerId)) {
    errors.push('Valid customer is required.');
  }
  if (typeof payment.amount !== 'number' || payment.amount <= 0) {
    errors.push('Payment amount must be greater than 0.');
  }
  if (payment.note && payment.note.length > 240) {
    errors.push('Note must be 240 characters or fewer.');
  }
  return { valid: errors.length === 0, errors };
}

export function validateCreateStaffPayload(input: {
  displayName?: string;
  email?: string;
  password?: string;
  role?: string;
}): BlueprintValidationResult {
  const errors: string[] = [];
  const name = input.displayName?.trim() || '';
  const email = input.email?.trim().toLowerCase() || '';
  const password = input.password || '';

  if (name.length < 1 || name.length > 120) {
    errors.push('Staff full name must be 1–120 characters.');
  }
  if (!email || email.length < 3 || email.length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('Please enter a valid staff email address.');
  }
  if (password.length < 6) {
    errors.push('Temporary password must be at least 6 characters.');
  }
  if (!input.role || !INVITABLE_ROLES.includes(input.role as Exclude<UserRole, 'Owner'>)) {
    errors.push('Please select a valid staff role.');
  }
  return { valid: errors.length === 0, errors };
}

export const LEGACY_STORAGE_KEYS = [
  'isles_bos_settings',
  'isles_bos_customers',
  'isles_bos_products',
  'isles_bos_sales',
  'isles_bos_expenses',
  'isles_bos_debt_payments',
] as const;

export interface LegacyLocalBackupSnapshot {
  hasData: boolean;
  customers: Customer[];
  products: Product[];
  sales: Sale[];
  expenses: Expense[];
  debtPayments: DebtPayment[];
  businessName?: string;
}

export function inspectLegacyLocalStorage(storage: Pick<Storage, 'getItem'>): LegacyLocalBackupSnapshot {
  const parseArr = <T>(key: string): T[] => {
    try {
      const raw = storage.getItem(key);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  let businessName: string | undefined;
  try {
    const rawSettings = storage.getItem('isles_bos_settings');
    if (rawSettings) {
      const parsed = JSON.parse(rawSettings);
      if (parsed && typeof parsed.businessName === 'string') {
        businessName = parsed.businessName;
      }
    }
  } catch {
    businessName = undefined;
  }

  const customers = parseArr<Customer>('isles_bos_customers');
  const products = parseArr<Product>('isles_bos_products');
  const sales = parseArr<Sale>('isles_bos_sales');
  const expenses = parseArr<Expense>('isles_bos_expenses');
  const debtPayments = parseArr<DebtPayment>('isles_bos_debt_payments');

  const hasData =
    customers.length > 0 ||
    products.length > 0 ||
    sales.length > 0 ||
    expenses.length > 0 ||
    debtPayments.length > 0;

  return {
    hasData,
    customers,
    products,
    sales,
    expenses,
    debtPayments,
    businessName,
  };
}
