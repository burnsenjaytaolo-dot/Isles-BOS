import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ALL_USER_ROLES,
  BUSINESS_TYPE_TEMPLATES,
  getPermissionsForRole,
  inspectLegacyLocalStorage,
  isValidFirestoreId,
  sanitizeId,
  validateCreateStaffPayload,
  validateCustomerPayload,
  validateExpensePayload,
  validatePaymentPayload,
  validateProductPayload,
  validateSalePayload,
} from './permissions.ts';

describe('RBAC permissions matrix', () => {
  it('grants full control only to Owner and restricts transferOwnership to Owner', () => {
    const ownerPerms = getPermissionsForRole('Owner');
    assert.equal(ownerPerms.canTransferOwnership, true);
    assert.equal(ownerPerms.canManageRoles, true);
    assert.equal(ownerPerms.canCreateSale, true);

    const adminPerms = getPermissionsForRole('Administrator');
    assert.equal(adminPerms.canTransferOwnership, false);
    assert.equal(adminPerms.canInviteStaff, true);
    assert.equal(adminPerms.canManageSettings, true);
  });

  it('keeps Viewer strictly read-only across all mutation capabilities', () => {
    const viewer = getPermissionsForRole('Viewer');
    assert.equal(viewer.canViewDashboard, true);
    assert.equal(viewer.canViewSales, true);
    assert.equal(viewer.canCreateSale, false);
    assert.equal(viewer.canRecordPayment, false);
    assert.equal(viewer.canManageStock, false);
    assert.equal(viewer.canManageCustomers, false);
    assert.equal(viewer.canManageExpenses, false);
    assert.equal(viewer.canManageSettings, false);
    assert.equal(viewer.canInviteStaff, false);
  });

  it('scopes Cashier, Inventory Staff, and Accountant appropriately', () => {
    const cashier = getPermissionsForRole('Cashier');
    assert.equal(cashier.canCreateSale, true);
    assert.equal(cashier.canManageStock, false);
    assert.equal(cashier.canManageExpenses, false);

    const inv = getPermissionsForRole('Inventory Staff');
    assert.equal(inv.canManageStock, true);
    assert.equal(inv.canCreateSale, false);
    assert.equal(inv.canViewMoney, false);

    const accountant = getPermissionsForRole('Accountant');
    assert.equal(accountant.canManageExpenses, true);
    assert.equal(accountant.canRecordPayment, true);
    assert.equal(accountant.canCreateSale, false);
  });

  it('returns zero permissions for unknown/null roles', () => {
    const none = getPermissionsForRole(null);
    assert.equal(none.canViewDashboard, false);
    assert.equal(ALL_USER_ROLES.length, 7);
    assert.equal(BUSINESS_TYPE_TEMPLATES.length, 9);
  });
});

describe('Blueprint validation & ID poisoning guards', () => {
  it('rejects poisoned document IDs and sanitizes cleanly', () => {
    assert.equal(isValidFirestoreId('prod-101_ABC'), true);
    assert.equal(isValidFirestoreId('bad id with spaces'), false);
    assert.equal(isValidFirestoreId('bad$id/slash'), false);
    assert.equal(isValidFirestoreId('a'.repeat(129)), false);
    assert.equal(isValidFirestoreId(sanitizeId('My Product $1!')), true);
  });

  it('rejects invalid financial payloads matching Dirty Dozen invariants', () => {
    const badSale = validateSalePayload({
      customerId: 'bad$id',
      customerName: 'Walk-in',
      items: [],
      total: 100,
      amountPaid: 150,
      status: 'Paid',
    });
    assert.equal(badSale.valid, false);
    assert.ok(badSale.errors.length >= 3);

    const goodSale = validateSalePayload({
      customerId: 'cust-walkin',
      customerName: 'Walk-in customer',
      items: [{ productId: 'prod-1', name: 'Tuna', quantity: 2, price: 24 }],
      total: 48,
      amountPaid: 48,
      status: 'Paid',
    });
    assert.equal(goodSale.valid, true);

    assert.equal(validateProductPayload({ name: 'Rice', sku: 'R-1', costPrice: -1, sellingPrice: 10, quantity: 5, minStockAlert: 2 }).valid, false);
    assert.equal(validateExpensePayload({ description: 'Fuel', category: 'Transport', amount: 0 }).valid, false);
    assert.equal(validateCustomerPayload({ name: '', phone: '123' }).valid, false);
    assert.equal(validatePaymentPayload({ customerId: 'cust-1', amount: -5 }).valid, false);

    assert.equal(
      validateCreateStaffPayload({
        displayName: 'Maria Siale',
        email: 'maria@store.sb',
        password: 'password123',
        role: 'Cashier',
      }).valid,
      true
    );
    assert.equal(
      validateCreateStaffPayload({
        displayName: '',
        email: 'bad-email',
        password: '123',
        role: 'Owner',
      }).valid,
      false
    );
  });
});

describe('Legacy localStorage inspection', () => {
  it('detects legacy Isles BOS keys without mutating storage', () => {
    const store = new Map<string, string>([
      ['isles_bos_settings', JSON.stringify({ businessName: 'Honiara Retail Store' })],
      ['isles_bos_customers', JSON.stringify([{ id: 'c1', name: 'John', phone: '123', balance: 0, totalSpent: 50 }])],
      ['isles_bos_sales', JSON.stringify([{ id: 's1' }])],
    ]);
    const snap = inspectLegacyLocalStorage({
      getItem: (k) => store.get(k) ?? null,
    });
    assert.equal(snap.hasData, true);
    assert.equal(snap.businessName, 'Honiara Retail Store');
    assert.equal(snap.customers.length, 1);
    assert.equal(snap.sales.length, 1);
  });
});
