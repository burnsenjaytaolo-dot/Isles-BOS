import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Download,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Business, Customer, DebtPayment, Expense, Product, Sale } from '../../types';
import { formatSBD } from '../../utils/analytics';
import { inspectLegacyLocalStorage, LEGACY_STORAGE_KEYS } from '../../utils/permissions';
import { migrateLegacyDataToBusiness, MigrationReport } from '../../services/firestoreService';

interface MigrationAssistantModalProps {
  activeBusiness: Business | null;
  existingCustomers: Customer[];
  existingProducts: Product[];
  existingSales: Sale[];
  existingExpenses: Expense[];
  existingPayments: DebtPayment[];
  onClose: () => void;
  onClearedLegacyStorage: () => void;
}

export const MigrationAssistantModal: React.FC<MigrationAssistantModalProps> = ({
  activeBusiness,
  existingCustomers,
  existingProducts,
  existingSales,
  existingExpenses,
  existingPayments,
  onClose,
  onClearedLegacyStorage,
}) => {
  const { user } = useAuth();
  const snapshot = useMemo(() => inspectLegacyLocalStorage(window.localStorage), []);
  const [backupDownloaded, setBackupDownloaded] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [report, setReport] = useState<MigrationReport | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cleared, setCleared] = useState(false);

  const totalLegacySalesVolume = snapshot.sales.reduce((s, item) => s + (Number(item.total) || 0), 0);
  const totalLegacyExpenses = snapshot.expenses.reduce((s, item) => s + (Number(item.amount) || 0), 0);

  const handleDownloadBackup = () => {
    const rawDump: Record<string, unknown> = {};
    LEGACY_STORAGE_KEYS.forEach((key) => {
      const val = window.localStorage.getItem(key);
      if (val) {
        try {
          rawDump[key] = JSON.parse(val);
        } catch {
          rawDump[key] = val;
        }
      }
    });
    const blob = new Blob([JSON.stringify(rawDump, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `isles-bos-pre-migration-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setBackupDownloaded(true);
  };

  const handleRunMigration = async () => {
    if (!user || !activeBusiness) return;
    setMigrating(true);
    setErrorMsg(null);
    try {
      const result = await migrateLegacyDataToBusiness(
        activeBusiness,
        user,
        {
          customers: snapshot.customers,
          products: snapshot.products,
          sales: snapshot.sales,
          expenses: snapshot.expenses,
          debtPayments: snapshot.debtPayments,
        },
        {
          customerIds: new Set(existingCustomers.map((c) => c.id)),
          productIds: new Set(existingProducts.map((p) => p.id)),
          saleIds: new Set(existingSales.map((s) => s.id)),
          expenseIds: new Set(existingExpenses.map((e) => e.id)),
          paymentIds: new Set(existingPayments.map((p) => p.id)),
        }
      );
      setReport(result);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Migration failed.');
    } finally {
      setMigrating(false);
    }
  };

  const handleClearLegacyStorage = () => {
    LEGACY_STORAGE_KEYS.forEach((key) => window.localStorage.removeItem(key));
    setCleared(true);
    onClearedLegacyStorage();
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-[1px] z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="migration-title"
    >
      <div className="bg-white rounded-xl border border-[#E2E8F0] max-w-xl w-full shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <Database className="w-4 h-4 text-[#2563EB]" />
            <div>
              <h3 id="migration-title" className="text-base font-bold text-[#111827]">
                Local Storage → Cloud Migration Assistant
              </h3>
              <p className="text-xs text-[#64748B]">
                Safely import legacy browser records into {activeBusiness?.name || 'your business'}
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close migration assistant"
            onClick={onClose}
            className="w-8 h-8 rounded-md hover:bg-slate-100 text-[#64748B] flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          {!snapshot.hasData && !report ? (
            <div className="p-6 text-center space-y-2 border border-dashed border-[#E2E8F0] rounded-lg">
              <CheckCircle2 className="w-7 h-7 text-[#16A34A] mx-auto" />
              <div className="text-sm font-semibold text-[#111827]">No Legacy Local Data Found</div>
              <p className="text-xs text-[#64748B]">
                This browser has no pending `isles_bos_*` records waiting for cloud migration.
              </p>
            </div>
          ) : (
            <>
              <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
                    Detected Local Browser Snapshot
                  </span>
                  {snapshot.businessName && (
                    <span className="text-xs font-semibold text-[#111827]">
                      {snapshot.businessName}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                  <div className="bg-white border border-[#E2E8F0] rounded p-2.5">
                    <div className="text-[#64748B]">Customers</div>
                    <div className="text-base font-bold text-[#111827] tabular-nums">
                      {snapshot.customers.length}
                    </div>
                  </div>
                  <div className="bg-white border border-[#E2E8F0] rounded p-2.5">
                    <div className="text-[#64748B]">Products</div>
                    <div className="text-base font-bold text-[#111827] tabular-nums">
                      {snapshot.products.length}
                    </div>
                  </div>
                  <div className="bg-white border border-[#E2E8F0] rounded p-2.5">
                    <div className="text-[#64748B]">Sales / Invoices</div>
                    <div className="text-base font-bold text-[#111827] tabular-nums">
                      {snapshot.sales.length}
                    </div>
                  </div>
                  <div className="bg-white border border-[#E2E8F0] rounded p-2.5">
                    <div className="text-[#64748B]">Expenses</div>
                    <div className="text-base font-bold text-[#111827] tabular-nums">
                      {snapshot.expenses.length}
                    </div>
                  </div>
                  <div className="bg-white border border-[#E2E8F0] rounded p-2.5">
                    <div className="text-[#64748B]">Sales Total</div>
                    <div className="text-sm font-bold text-[#111827] tabular-nums">
                      {formatSBD(totalLegacySalesVolume, activeBusiness?.currency || 'SBD')}
                    </div>
                  </div>
                  <div className="bg-white border border-[#E2E8F0] rounded p-2.5">
                    <div className="text-[#64748B]">Expenses Total</div>
                    <div className="text-sm font-bold text-[#DC2626] tabular-nums">
                      {formatSBD(totalLegacyExpenses, activeBusiness?.currency || 'SBD')}
                    </div>
                  </div>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs font-medium text-[#DC2626]">
                  {errorMsg}
                </div>
              )}

              {/* Step 1: Backup */}
              <div className="border border-[#E2E8F0] rounded-lg p-3.5 flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-[#111827]">
                    Step 1 · Download Pre-Migration JSON Backup
                  </div>
                  <div className="text-[11px] text-[#64748B]">
                    Recommended safety copy before importing into Cloud Firestore.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadBackup}
                  className={`h-8 px-3 rounded-md text-xs font-semibold inline-flex items-center gap-1.5 shrink-0 ${
                    backupDownloaded
                      ? 'bg-emerald-50 border border-emerald-200 text-[#16A34A]'
                      : 'border border-[#E2E8F0] bg-white hover:bg-slate-50 text-[#111827]'
                  }`}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{backupDownloaded ? 'Backup Saved' : 'Download JSON'}</span>
                </button>
              </div>

              {/* Step 2: Import */}
              {!report ? (
                <button
                  type="button"
                  disabled={migrating || !activeBusiness}
                  onClick={handleRunMigration}
                  className="w-full h-10 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-60 text-white text-xs font-semibold inline-flex items-center justify-center gap-2"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>
                    {migrating
                      ? 'Uploading Records to Firestore...'
                      : `Import into ${activeBusiness?.name || 'Business'}`}
                  </span>
                </button>
              ) : (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#16A34A]">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Cloud Migration Complete &amp; Verified</span>
                  </div>
                  <div className="text-xs text-[#111827] grid grid-cols-2 gap-1.5 tabular-nums">
                    <span>Customers imported: {report.customersImported}</span>
                    <span>Products imported: {report.productsImported}</span>
                    <span>Sales imported: {report.salesImported}</span>
                    <span>Expenses imported: {report.expensesImported}</span>
                    <span>Payments imported: {report.paymentsImported}</span>
                    <span>Skipped duplicates: {report.skippedDuplicates}</span>
                  </div>

                  {!cleared ? (
                    <div className="pt-2 border-t border-emerald-200 space-y-2">
                      <div className="flex items-start gap-2 text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded p-2">
                        <AlertTriangle className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" />
                        <span>
                          Verify your migrated numbers in the dashboard first. Only clear legacy
                          browser storage once satisfied.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleClearLegacyStorage}
                        className="w-full h-9 rounded-md border border-red-200 bg-white hover:bg-red-50 text-[#DC2626] text-xs font-semibold inline-flex items-center justify-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Approve &amp; Clear Legacy Browser Storage</span>
                      </button>
                    </div>
                  ) : (
                    <div className="text-xs font-semibold text-[#16A34A]">
                      Legacy localStorage keys have been cleared.
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div className="px-5 py-3.5 bg-[#F8FAFC] border-t border-[#E2E8F0] flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 rounded-md border border-[#E2E8F0] bg-white hover:bg-slate-50 text-[#111827] text-xs font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
