import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatSBD,
  filterByDateRange,
  getLowStockProducts,
  computeDashboardMetrics,
  buildSalesChartSeries,
  computeInvoiceStatusBreakdown,
} from './analytics';
import { Sale, Product, Customer, Expense, DebtPayment } from '../types';

const now = new Date('2026-11-12T12:00:00.000Z');
const todayIso = '2026-11-12T09:00:00.000Z';
const yesterdayIso = '2026-11-11T09:00:00.000Z';
const tenDaysAgoIso = '2026-11-02T09:00:00.000Z';

const sampleProducts: Product[] = [
  {
    id: 'p1',
    name: 'Tuna',
    sku: 'T1',
    category: 'Groceries',
    costPrice: 10,
    sellingPrice: 15,
    quantity: 5,
    minStockAlert: 10,
    unit: 'tin',
  },
  {
    id: 'p2',
    name: 'Rice',
    sku: 'R1',
    category: 'Groceries',
    costPrice: 100,
    sellingPrice: 150,
    quantity: 20,
    minStockAlert: 10,
    unit: 'bag',
  },
  {
    id: 'p3',
    name: 'Delivery',
    sku: 'S1',
    category: 'Services',
    costPrice: 0,
    sellingPrice: 50,
    quantity: 999,
    minStockAlert: 0,
    unit: 'trip',
  },
];

const sampleCustomers: Customer[] = [
  { id: 'c1', name: 'Walk-in', phone: 'N/A', balance: 0, totalSpent: 500 },
  { id: 'c2', name: 'John', phone: '71234', balance: 400, totalSpent: 1000 },
];

const sampleSales: Sale[] = [
  {
    id: 's1',
    invoiceNo: '#101',
    customerId: 'c1',
    customerName: 'Walk-in',
    date: todayIso,
    items: [{ productId: 'p1', name: 'Tuna', quantity: 2, price: 15 }],
    subtotal: 30,
    discount: 0,
    total: 30,
    status: 'Paid',
    amountPaid: 30,
    paymentMethod: 'Cash',
    type: 'sale',
  },
  {
    id: 's2',
    invoiceNo: '#102',
    customerId: 'c2',
    customerName: 'John',
    date: yesterdayIso,
    items: [{ productId: 'p2', name: 'Rice', quantity: 4, price: 150 }],
    subtotal: 600,
    discount: 0,
    total: 600,
    status: 'Part paid',
    amountPaid: 200,
    paymentMethod: 'Cash',
    type: 'sale',
  },
  {
    id: 's3',
    invoiceNo: '#103',
    customerId: 'c2',
    customerName: 'John',
    date: tenDaysAgoIso,
    items: [{ productId: 'p2', name: 'Rice', quantity: 2, price: 150 }],
    subtotal: 300,
    discount: 0,
    total: 300,
    status: 'Pay later',
    amountPaid: 0,
    paymentMethod: 'Credit',
    type: 'sale',
  },
];

const sampleExpenses: Expense[] = [
  {
    id: 'e1',
    description: 'Fuel',
    category: 'Transport',
    amount: 100,
    date: todayIso,
    paymentMethod: 'Cash',
  },
  {
    id: 'e2',
    description: 'Power',
    category: 'Utilities',
    amount: 200,
    date: tenDaysAgoIso,
    paymentMethod: 'Bank Transfer',
  },
];

const samplePayments: DebtPayment[] = [
  {
    id: 'dp1',
    customerId: 'c2',
    customerName: 'John',
    amount: 50,
    date: todayIso,
    method: 'Cash',
  },
];

test('formatSBD formats currency cleanly', () => {
  assert.equal(formatSBD(2400), 'SBD 2,400');
  assert.equal(formatSBD(0), 'SBD 0');
});

test('getLowStockProducts ignores Services and finds items <= minStockAlert', () => {
  const low = getLowStockProducts(sampleProducts);
  assert.equal(low.length, 1);
  assert.equal(low[0].id, 'p1');
});

test('filterByDateRange filters today, 7d, 30d, and all accurately', () => {
  assert.equal(filterByDateRange(sampleSales, 'today', now).length, 1);
  assert.equal(filterByDateRange(sampleSales, '7d', now).length, 2);
  assert.equal(filterByDateRange(sampleSales, '30d', now).length, 3);
  assert.equal(filterByDateRange(sampleSales, 'all', now).length, 3);
});

test('computeDashboardMetrics calculates totals and inventory value accurately', () => {
  const allMetrics = computeDashboardMetrics(
    sampleSales,
    sampleProducts,
    sampleCustomers,
    sampleExpenses,
    samplePayments,
    'all',
    now
  );
  assert.equal(allMetrics.totalSales, 930);
  assert.equal(allMetrics.outstandingCredit, 400);
  assert.equal(allMetrics.creditAccountsCount, 1);
  assert.equal(allMetrics.inventoryValue, 5 * 10 + 20 * 100);
  assert.equal(allMetrics.physicalSkuCount, 2);
  assert.equal(allMetrics.totalExpenses, 300);
  assert.equal(allMetrics.netBalance, 630);
  assert.equal(allMetrics.moneyReceived, 280);

  const todayMetrics = computeDashboardMetrics(
    sampleSales,
    sampleProducts,
    sampleCustomers,
    sampleExpenses,
    samplePayments,
    'today',
    now
  );
  assert.equal(todayMetrics.totalSales, 30);
  assert.equal(todayMetrics.totalExpenses, 100);
  assert.equal(todayMetrics.netBalance, -70);
  assert.equal(todayMetrics.moneyReceived, 80);
});

test('buildSalesChartSeries builds daily buckets with accurate totals', () => {
  const series7d = buildSalesChartSeries(sampleSales, '7d', now);
  assert.equal(series7d.length, 7);
  const sum7d = series7d.reduce((acc, p) => acc + p.total, 0);
  assert.equal(sum7d, 630);

  const seriesAll = buildSalesChartSeries(sampleSales, 'all', now);
  assert.equal(seriesAll.length, 3);
  assert.equal(
    seriesAll.reduce((acc, p) => acc + p.total, 0),
    930
  );
});

test('computeInvoiceStatusBreakdown summarizes invoice states', () => {
  const breakdown = computeInvoiceStatusBreakdown(sampleSales);
  assert.equal(breakdown.paid.count, 1);
  assert.equal(breakdown.paid.total, 30);
  assert.equal(breakdown.partPaid.count, 1);
  assert.equal(breakdown.partPaid.total, 600);
  assert.equal(breakdown.payLater.count, 1);
  assert.equal(breakdown.payLater.total, 300);
});
