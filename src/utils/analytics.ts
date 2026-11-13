import { Sale, Product, Customer, Expense, DebtPayment } from '../types';

export type DateRangeFilter = 'today' | '7d' | '30d' | 'all';

export interface DashboardMetrics {
  totalSales: number;
  invoiceCount: number;
  paidInvoicesCount: number;
  unpaidInvoicesCount: number;
  outstandingCredit: number;
  creditAccountsCount: number;
  inventoryValue: number;
  inventoryRetailValue: number;
  physicalSkuCount: number;
  lowStockProducts: Product[];
  unpaidInvoices: Sale[];
  totalExpenses: number;
  expenseCount: number;
  netBalance: number;
  moneyReceived: number;
}

export interface SalesChartPoint {
  dateKey: string;
  label: string;
  total: number;
  paid: number;
  count: number;
}

export interface InvoiceStatusSummary {
  paid: { count: number; total: number };
  partPaid: { count: number; total: number };
  payLater: { count: number; total: number };
  totalCount: number;
  totalAmount: number;
}

export function formatSBD(amount: number, currency = 'SBD'): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  return `${currency} ${safe.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function toLocalDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function filterByDateRange<T extends { date: string }>(
  items: T[],
  range: DateRangeFilter,
  now: Date = new Date()
): T[] {
  if (range === 'all') return items;

  const todayStart = startOfDay(now).getTime();
  let cutoff = todayStart;

  if (range === '7d') {
    cutoff = todayStart - 6 * 86400000;
  } else if (range === '30d') {
    cutoff = todayStart - 29 * 86400000;
  }

  return items.filter((item) => {
    const t = new Date(item.date).getTime();
    return Number.isFinite(t) && t >= cutoff;
  });
}

export function getLowStockProducts(products: Product[]): Product[] {
  return products.filter(
    (p) => p.category !== 'Services' && p.quantity < 999 && p.quantity <= p.minStockAlert
  );
}

export function computeDashboardMetrics(
  sales: Sale[],
  products: Product[],
  customers: Customer[],
  expenses: Expense[],
  debtPayments: DebtPayment[],
  range: DateRangeFilter = 'all',
  now: Date = new Date()
): DashboardMetrics {
  const filteredSales = filterByDateRange(sales, range, now);
  const filteredExpenses = filterByDateRange(expenses, range, now);
  const filteredPayments = filterByDateRange(debtPayments, range, now);

  const totalSales = filteredSales.reduce((sum, s) => sum + s.total, 0);
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const salesPaid = filteredSales.reduce((sum, s) => sum + s.amountPaid, 0);
  const debtPaid = filteredPayments.reduce((sum, p) => sum + p.amount, 0);

  const unpaidInvoices = sales.filter((s) => s.status !== 'Paid');
  const paidInvoicesCount = filteredSales.filter((s) => s.status === 'Paid').length;
  const unpaidInvoicesCount = filteredSales.filter((s) => s.status !== 'Paid').length;

  const outstandingCredit = customers.reduce((sum, c) => sum + c.balance, 0);
  const creditAccountsCount = customers.filter((c) => c.balance > 0).length;

  const physicalProducts = products.filter(
    (p) => p.category !== 'Services' && p.quantity < 999
  );
  const inventoryValue = physicalProducts.reduce(
    (sum, p) => sum + p.costPrice * p.quantity,
    0
  );
  const inventoryRetailValue = physicalProducts.reduce(
    (sum, p) => sum + p.sellingPrice * p.quantity,
    0
  );
  const lowStockProducts = getLowStockProducts(products);

  return {
    totalSales,
    invoiceCount: filteredSales.length,
    paidInvoicesCount,
    unpaidInvoicesCount,
    outstandingCredit,
    creditAccountsCount,
    inventoryValue,
    inventoryRetailValue,
    physicalSkuCount: physicalProducts.length,
    lowStockProducts,
    unpaidInvoices,
    totalExpenses,
    expenseCount: filteredExpenses.length,
    netBalance: totalSales - totalExpenses,
    moneyReceived: salesPaid + debtPaid,
  };
}

export function buildSalesChartSeries(
  sales: Sale[],
  range: DateRangeFilter = '7d',
  now: Date = new Date()
): SalesChartPoint[] {
  const daysToShow = range === 'today' ? 1 : range === '30d' ? 14 : 7;
  const buckets = new Map<string, SalesChartPoint>();

  if (range === 'all' && sales.length > 0) {
    const sorted = [...sales].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    for (const s of sorted) {
      const dt = new Date(s.date);
      const key = toLocalDateKey(dt);
      const existing = buckets.get(key);
      if (existing) {
        existing.total += s.total;
        existing.paid += s.amountPaid;
        existing.count += 1;
      } else {
        buckets.set(key, {
          dateKey: key,
          label: dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          total: s.total,
          paid: s.amountPaid,
          count: 1,
        });
      }
    }
    return Array.from(buckets.values());
  }

  for (let i = daysToShow - 1; i >= 0; i--) {
    const d = new Date(startOfDay(now).getTime() - i * 86400000);
    const key = toLocalDateKey(d);
    buckets.set(key, {
      dateKey: key,
      label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      total: 0,
      paid: 0,
      count: 0,
    });
  }

  const filtered = filterByDateRange(sales, range === 'all' ? 'all' : range, now);
  for (const s of filtered) {
    const key = toLocalDateKey(new Date(s.date));
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.total += s.total;
      bucket.paid += s.amountPaid;
      bucket.count += 1;
    }
  }

  return Array.from(buckets.values());
}

export function computeInvoiceStatusBreakdown(sales: Sale[]): InvoiceStatusSummary {
  const summary: InvoiceStatusSummary = {
    paid: { count: 0, total: 0 },
    partPaid: { count: 0, total: 0 },
    payLater: { count: 0, total: 0 },
    totalCount: sales.length,
    totalAmount: 0,
  };

  for (const s of sales) {
    summary.totalAmount += s.total;
    if (s.status === 'Paid') {
      summary.paid.count += 1;
      summary.paid.total += s.total;
    } else if (s.status === 'Part paid') {
      summary.partPaid.count += 1;
      summary.partPaid.total += s.total;
    } else {
      summary.payLater.count += 1;
      summary.payLater.total += s.total;
    }
  }

  return summary;
}
