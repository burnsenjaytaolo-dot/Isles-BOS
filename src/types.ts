export type PaymentStatus = 'Paid' | 'Part paid' | 'Pay later';
export type PaymentMethod = 'Cash' | 'Bank Transfer' | 'Mobile Money' | 'Credit';
export type SaleType = 'sale' | 'quote';

export type UserRole =
  | 'Owner'
  | 'Administrator'
  | 'Manager'
  | 'Cashier'
  | 'Inventory Staff'
  | 'Accountant'
  | 'Viewer';

export type BusinessType =
  | 'Retail & General Store'
  | 'Hardware & Building Supplies'
  | 'Wholesale & Distribution'
  | 'Printing & Stationery'
  | 'Food & Beverage / Takeaway'
  | 'Pharmacy & Medical Supplies'
  | 'Automotive & Fuel'
  | 'Services & Contracting'
  | 'Custom Multi-Purpose';

export interface PermissionSet {
  canViewDashboard: boolean;
  canViewSales: boolean;
  canCreateSale: boolean;
  canRecordPayment: boolean;
  canViewStock: boolean;
  canManageStock: boolean;
  canViewCustomers: boolean;
  canManageCustomers: boolean;
  canViewMoney: boolean;
  canManageExpenses: boolean;
  canViewSettings: boolean;
  canManageSettings: boolean;
  canInviteStaff: boolean;
  canManageRoles: boolean;
  canTransferOwnership: boolean;
  canExportData: boolean;
  canMigrateData: boolean;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Business {
  id: string;
  name: string;
  businessType: BusinessType | string;
  ownerId: string;
  email: string;
  phone: string;
  address: string;
  country: string;
  currency: string;
  timezone: string;
  invoicePrefix: string;
  nextInvoiceNumber: number;
  taxRate: number;
  receiptFooter: string;
  logoUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BusinessMembershipIndex {
  businessId: string;
  userId: string;
  businessName: string;
  businessType: string;
  role: UserRole;
  currency: string;
  joinedAt?: string;
  updatedAt?: string;
}

export interface BusinessMember {
  userId: string;
  businessId: string;
  email: string;
  displayName: string;
  role: UserRole;
  status: 'active' | 'suspended';
  inviteId?: string;
  joinedAt?: string;
  updatedAt?: string;
}

export interface Category {
  id: string;
  businessId: string;
  name: string;
  kind: 'product' | 'expense';
  createdAt?: string;
}

export interface InventoryMovement {
  id: string;
  businessId: string;
  productId: string;
  productName: string;
  type: 'sale' | 'restock' | 'adjustment' | 'migration';
  quantityDelta: number;
  previousQty: number;
  newQty: number;
  reason?: string;
  createdBy: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  businessId: string;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  actorId: string;
  actorEmail?: string;
  createdAt: string;
}

export interface Invitation {
  id: string;
  businessId: string;
  businessName: string;
  businessType: string;
  currency: string;
  email: string;
  role: Exclude<UserRole, 'Owner'>;
  invitedBy: string;
  invitedByName: string;
  businessOwnerId: string;
  status: 'pending' | 'accepted' | 'revoked';
  expiresAt: string;
  createdAt: string;
  acceptedBy?: string;
  acceptedAt?: string;
}

export interface SaleItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  costPrice?: number;
}

export interface Sale {
  id: string;
  businessId?: string;
  invoiceNo: string;
  customerId: string;
  customerName: string;
  date: string; // ISO string
  items: SaleItem[];
  subtotal: number;
  discount: number;
  total: number;
  status: PaymentStatus;
  amountPaid: number;
  paymentMethod: PaymentMethod;
  type: SaleType;
  notes?: string;
  createdBy?: string;
}

export interface Product {
  id: string;
  businessId?: string;
  name: string;
  sku: string;
  category: string;
  costPrice: number;
  sellingPrice: number;
  quantity: number;
  minStockAlert: number;
  unit: string; // e.g., pcs, kg, carton, bundle
  createdBy?: string;
}

export interface Customer {
  id: string;
  businessId?: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  balance: number; // Amount they owe
  totalSpent: number;
  createdBy?: string;
}

export interface Expense {
  id: string;
  businessId?: string;
  description: string;
  category: string; // e.g. Transport, Rent, Stock, Utilities, Wages
  amount: number;
  date: string;
  paymentMethod: PaymentMethod;
  reference?: string;
  createdBy?: string;
}

export interface DebtPayment {
  id: string;
  businessId?: string;
  customerId: string;
  customerName: string;
  amount: number;
  date: string;
  method: PaymentMethod;
  note?: string;
  idempotencyKey?: string;
  createdBy?: string;
}

export interface BusinessSettings {
  businessName: string;
  ownerName: string;
  phone: string;
  email: string;
  address: string;
  currency: string; // 'SBD'
  taxRate: number; // percentage e.g. 0 or 10
  receiptFooter: string;
  staffMembers: { id: string; name: string; role: string }[];
}
