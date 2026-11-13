import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import {
  AuditLog,
  Business,
  BusinessMember,
  BusinessSettings,
  Category,
  Customer,
  DebtPayment,
  Expense,
  InventoryMovement,
  Invitation,
  PaymentMethod,
  PaymentStatus,
  Product,
  Sale,
  UserRole,
} from './types';
import { DateRangeFilter, getLowStockProducts } from './utils/analytics';
import { getPermissionsForRole, inspectLegacyLocalStorage } from './utils/permissions';
import {
  acceptInvitationAtomic,
  addCustomer,
  addExpense,
  addProduct,
  createSaleAtomic,
  createStaffAccountAtomic,
  createStaffInvitation,
  listInvitationsForBusiness,
  markSalePaidAtomic,
  recordDebtPaymentAtomic,
  removeMemberAtomic,
  removeOrphanedMembership,
  restockProductAtomic,
  revokeStaffInvitation,
  subscribeBusinessWorkspace,
  transferOwnershipAtomic,
  updateBusinessProfile,
  updateMemberRoleAtomic,
} from './services/firestoreService';

import { Sidebar, TabId } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { HomeTab } from './components/HomeTab';
import { SalesTab } from './components/SalesTab';
import { StockTab } from './components/StockTab';
import { CustomersTab } from './components/CustomersTab';
import { MoneyTab } from './components/MoneyTab';
import { SettingsTab } from './components/SettingsTab';
import { AuthScreen, AccountProfileModal } from './components/auth/AuthScreen';
import { BusinessOnboardingModal } from './components/onboarding/BusinessOnboardingModal';

// Modals
import { NewSaleModal } from './components/modals/NewSaleModal';
import { ReceivePaymentModal } from './components/modals/ReceivePaymentModal';
import { AddExpenseModal } from './components/modals/AddExpenseModal';
import { ReceiveStockModal } from './components/modals/ReceiveStockModal';
import { AddProductModal } from './components/modals/AddProductModal';
import { AddCustomerModal } from './components/modals/AddCustomerModal';
import { PrintReceiptModal } from './components/modals/PrintReceiptModal';
import { LowStockAlertModal } from './components/modals/LowStockAlertModal';
import { MigrationAssistantModal } from './components/modals/MigrationAssistantModal';
import { AlertCircle, UploadCloud, X } from 'lucide-react';

const WorkspaceApp: React.FC = () => {
  const {
    authReady,
    user,
    userProfile,
    isEmailVerified,
    memberships,
    membershipsLoading,
    pendingInvites,
    activeBusinessId,
    activeMembership,
    selectBusiness,
  } = useAuth();

  // Active Business Tenant State (populated strictly via Firestore onSnapshot)
  const [business, setBusiness] = useState<Business | null>(null);
  const [members, setMembers] = useState<BusinessMember[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [debtPayments, setDebtPayments] = useState<DebtPayment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [inventoryMovements, setInventoryMovements] = useState<InventoryMovement[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Navigation & Filter state
  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [dateRange, setDateRange] = useState<DateRangeFilter>('all');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);

  // Modals state
  const [showNewSaleModal, setShowNewSaleModal] = useState(false);
  const [showReceivePaymentModal, setShowReceivePaymentModal] = useState(false);
  const [preselectedCustomerForPayment, setPreselectedCustomerForPayment] =
    useState<Customer | null>(null);
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [showReceiveStockModal, setShowReceiveStockModal] = useState(false);
  const [preselectedProductForRestock, setPreselectedProductForRestock] =
    useState<Product | null>(null);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [selectedSaleForReceipt, setSelectedSaleForReceipt] = useState<Sale | null>(null);
  const [showLowStockModal, setShowLowStockModal] = useState(false);
  const [showCreateBusinessModal, setShowCreateBusinessModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showMigrationModal, setShowMigrationModal] = useState(false);
  const [migrationBannerDismissed, setMigrationBannerDismissed] = useState(false);
  const [legacyRefreshTick, setLegacyRefreshTick] = useState(0);

  const hasLegacyLocalData = useMemo(() => {
    void legacyRefreshTick;
    return inspectLegacyLocalStorage(window.localStorage).hasData;
  }, [legacyRefreshTick]);

  // Derive authoritative role from members doc first, falling back to membership index
  const currentMember = useMemo(
    () => members.find((m) => m.userId === user?.uid) || null,
    [members, user?.uid]
  );
  const effectiveRole: UserRole | null =
    currentMember?.role || activeMembership?.role || null;
  const permissions = useMemo(() => getPermissionsForRole(effectiveRole), [effectiveRole]);

  // Ensure activeTab remains permitted when switching businesses/roles
  useEffect(() => {
    if (!effectiveRole) return;
    if (activeTab === 'sales' && !permissions.canViewSales) setActiveTab('home');
    else if (activeTab === 'stock' && !permissions.canViewStock) setActiveTab('home');
    else if (activeTab === 'customers' && !permissions.canViewCustomers) setActiveTab('home');
    else if (activeTab === 'money' && !permissions.canViewMoney) setActiveTab('home');
    else if (activeTab === 'settings' && !permissions.canViewSettings) setActiveTab('home');
  }, [activeTab, effectiveRole, permissions]);

  // Subscribe to active business workspace & tear down cleanly on business switch
  useEffect(() => {
    if (!user || !isEmailVerified || !activeBusinessId) {
      setBusiness(null);
      setMembers([]);
      setCategories([]);
      setCustomers([]);
      setProducts([]);
      setSales([]);
      setDebtPayments([]);
      setExpenses([]);
      setInventoryMovements([]);
      setAuditLogs([]);
      setInvitations([]);
      return;
    }

    // Clear previous tenant state immediately before attaching new listeners
    setWorkspaceLoading(true);
    setSyncError(null);
    setActionError(null);
    setBusiness(null);
    setMembers([]);
    setCategories([]);
    setCustomers([]);
    setProducts([]);
    setSales([]);
    setDebtPayments([]);
    setExpenses([]);
    setInventoryMovements([]);
    setAuditLogs([]);
    setInvitations([]);
    setSelectedSaleForReceipt(null);
    setShowNewSaleModal(false);
    setShowReceivePaymentModal(false);
    setShowAddExpenseModal(false);
    setShowReceiveStockModal(false);
    setShowAddProductModal(false);
    setShowAddCustomerModal(false);

    const unsubscribe = subscribeBusinessWorkspace(activeBusinessId, {
      onBusiness: (biz) => {
        setBusiness(biz);
        setWorkspaceLoading(false);
      },
      onMembers: setMembers,
      onCategories: setCategories,
      onCustomers: setCustomers,
      onProducts: setProducts,
      onSales: setSales,
      onPayments: setDebtPayments,
      onExpenses: setExpenses,
      onInventoryMovements: setInventoryMovements,
      onAuditLogs: setAuditLogs,
      onSyncError: (msg) => {
        setSyncError(msg);
        setWorkspaceLoading(false);
      },
    });

    return () => {
      unsubscribe();
    };
  }, [user, isEmailVerified, activeBusinessId]);

  const refreshInvitations = useCallback(async () => {
    if (!business || !user || !permissions.canInviteStaff) {
      setInvitations([]);
      return;
    }
    try {
      const list = await listInvitationsForBusiness(business, user);
      setInvitations(list);
    } catch {
      // Handled via handleFirestoreError logging
    }
  }, [business, user, permissions.canInviteStaff]);

  useEffect(() => {
    void refreshInvitations();
  }, [refreshInvitations]);

  // Legacy-compatible settings adapter for PrintReceiptModal & TopHeader
  const legacySettingsAdapter: BusinessSettings = useMemo(() => {
    const ownerMember = members.find((m) => m.role === 'Owner');
    return {
      businessName: business?.name || activeMembership?.businessName || 'Isles BOS',
      ownerName: ownerMember?.displayName || userProfile?.displayName || 'Owner',
      phone: business?.phone || '',
      email: business?.email || '',
      address: business?.address || '',
      currency: business?.currency || activeMembership?.currency || 'SBD',
      taxRate: business?.taxRate ?? 0,
      receiptFooter: business?.receiptFooter || '',
      staffMembers: members.map((m) => ({
        id: m.userId,
        name: m.displayName,
        role: m.role,
      })),
    };
  }, [business, activeMembership, members, userProfile]);

  const productCategories = useMemo(
    () => categories.filter((c) => c.kind === 'product').map((c) => c.name),
    [categories]
  );
  const expenseCategories = useMemo(
    () => categories.filter((c) => c.kind === 'expense').map((c) => c.name),
    [categories]
  );

  // Loading & Authentication Gates
  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#F3F6FA] flex items-center justify-center p-4">
        <div className="bg-white border border-[#E2E8F0] rounded-lg px-6 py-4 text-xs font-semibold text-[#111827] shadow-2xs">
          Initializing Isles BOS...
        </div>
      </div>
    );
  }

  if (!user || !isEmailVerified) {
    return <AuthScreen />;
  }

  if (membershipsLoading) {
    return (
      <div className="min-h-screen bg-[#F3F6FA] flex items-center justify-center p-4">
        <div className="bg-white border border-[#E2E8F0] rounded-lg px-6 py-4 text-xs font-semibold text-[#111827] shadow-2xs">
          Loading authorized businesses...
        </div>
      </div>
    );
  }

  if (memberships.length === 0) {
    return (
      <BusinessOnboardingModal
        onBusinessReady={(bizId) => {
          selectBusiness(bizId);
        }}
      />
    );
  }

  const lowStockCount = getLowStockProducts(products).length;
  const unpaidCount = sales.filter((s) => s.status !== 'Paid').length;

  // Transactional Firestore Handlers
  const runAction = async (fn: () => Promise<void>) => {
    setActionError(null);
    try {
      await fn();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Operation failed. Check permissions.');
    }
  };

  const handleSaveSale = async (newSaleData: Omit<Sale, 'id' | 'invoiceNo'>) => {
    if (!activeBusinessId || !user) return;
    await runAction(async () => {
      const created = await createSaleAtomic(activeBusinessId, user, newSaleData);
      setShowNewSaleModal(false);
      setSelectedSaleForReceipt(created);
    });
  };

  const handleSaveDebtPayment = async (paymentData: {
    customerId: string;
    amount: number;
    method: PaymentMethod;
    note?: string;
  }) => {
    if (!activeBusinessId || !user) return;
    await runAction(async () => {
      await recordDebtPaymentAtomic(activeBusinessId, user, paymentData);
      setShowReceivePaymentModal(false);
      setPreselectedCustomerForPayment(null);
    });
  };

  const handleSaveExpense = async (expenseData: Omit<Expense, 'id'>) => {
    if (!activeBusinessId || !user) return;
    await runAction(async () => {
      await addExpense(activeBusinessId, user, expenseData);
      setShowAddExpenseModal(false);
    });
  };

  const handleRestock = async (
    productId: string,
    addQty: number,
    newCostPrice?: number,
    newSellingPrice?: number,
    newMinStockAlert?: number
  ) => {
    if (!activeBusinessId || !user) return;
    await runAction(async () => {
      await restockProductAtomic(
        activeBusinessId,
        user,
        productId,
        addQty,
        newCostPrice,
        newSellingPrice,
        newMinStockAlert
      );
      setShowReceiveStockModal(false);
      setPreselectedProductForRestock(null);
    });
  };

  const handleSaveProduct = async (productData: Omit<Product, 'id'>) => {
    if (!activeBusinessId || !user) return;
    await runAction(async () => {
      await addProduct(activeBusinessId, user, productData);
      setShowAddProductModal(false);
    });
  };

  const handleSaveCustomer = async (
    customerData: Omit<Customer, 'id' | 'balance' | 'totalSpent'>
  ) => {
    if (!activeBusinessId || !user) return;
    await runAction(async () => {
      await addCustomer(activeBusinessId, user, customerData);
      setShowAddCustomerModal(false);
    });
  };

  const handleUpdateSaleStatus = async (
    saleId: string,
    _newStatus: PaymentStatus,
    _amountPaid = 0
  ) => {
    if (!activeBusinessId || !user) return;
    await runAction(async () => {
      await markSalePaidAtomic(activeBusinessId, user, saleId);
    });
  };

  const handleExportData = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      business,
      members,
      customers,
      products,
      sales,
      expenses,
      debtPayments,
      inventoryMovements,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const slug = (business?.name || 'isles-bos').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    a.download = `${slug}-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrimaryHeaderAction = () => {
    if ((activeTab === 'home' || activeTab === 'sales') && permissions.canCreateSale) {
      setShowNewSaleModal(true);
    } else if (activeTab === 'stock' && permissions.canManageStock) {
      setShowAddProductModal(true);
    } else if (activeTab === 'customers' && permissions.canManageCustomers) {
      setShowAddCustomerModal(true);
    } else if (activeTab === 'money' && permissions.canManageExpenses) {
      setShowAddExpenseModal(true);
    } else if (activeTab === 'settings' && permissions.canExportData) {
      handleExportData();
    }
  };

  const handleAcceptInvite = async (inviteId: string) => {
    if (!user) return;
    await runAction(async () => {
      const bizId = await acceptInvitationAtomic(
        user,
        userProfile?.displayName || user.displayName || 'Staff Member',
        inviteId
      );
      selectBusiness(bizId);
    });
  };

  return (
    <div className="min-h-screen bg-[#F3F6FA] text-[#111827] flex overflow-x-clip">
      {/* Left Navigation Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        isOpenDesktop={isDesktopSidebarOpen}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        recordCounts={{
          sales: sales.length,
          products: products.length,
          customers: customers.length,
        }}
        lowStockCount={lowStockCount}
        unpaidCount={unpaidCount}
        permissions={permissions}
        businessName={legacySettingsAdapter.businessName}
        userRole={effectiveRole}
        syncError={syncError}
      />

      {/* Right Workspace Column */}
      <div
        className={`flex-1 ${
          isDesktopSidebarOpen ? 'lg:pl-60' : ''
        } min-w-0 flex flex-col min-h-screen transition-[padding] duration-200`}
      >
        <TopHeader
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          isDesktopSidebarOpen={isDesktopSidebarOpen}
          settings={legacySettingsAdapter}
          dateRange={dateRange}
          onChangeDateRange={setDateRange}
          lowStockCount={lowStockCount}
          onOpenMobileMenu={() => {
            if (window.innerWidth >= 1024) {
              setIsDesktopSidebarOpen((prev) => !prev);
            } else {
              setIsMobileSidebarOpen(true);
            }
          }}
          onOpenNotifications={() => setShowLowStockModal(true)}
          onPrimaryAction={handlePrimaryHeaderAction}
          memberships={memberships}
          activeBusinessId={activeBusinessId}
          pendingInvites={pendingInvites}
          onSwitchBusiness={selectBusiness}
          onOpenCreateBusiness={() => setShowCreateBusinessModal(true)}
          onAcceptInvite={handleAcceptInvite}
          onOpenAccountModal={() => setShowAccountModal(true)}
          userDisplayName={userProfile?.displayName || user.displayName || user.email || 'Account'}
          permissions={permissions}
        />

        <main className="flex-1 min-w-0 p-4 sm:p-5 lg:p-6 max-w-[1440px] w-full mx-auto space-y-4">
          {/* Legacy LocalStorage Migration Prompt */}
          {hasLegacyLocalData &&
            !migrationBannerDismissed &&
            permissions.canMigrateData &&
            business && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 text-xs text-[#1E3A8A]">
                  <UploadCloud className="w-4 h-4 text-[#2563EB] shrink-0" />
                  <span>
                    Previous browser localStorage records detected. You can review, back up, and
                    import them into <strong>{business.name}</strong>.
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowMigrationModal(true)}
                    className="h-8 px-3 rounded-md bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold"
                  >
                    Open Migration Assistant
                  </button>
                  <button
                    type="button"
                    aria-label="Dismiss migration notice"
                    onClick={() => setMigrationBannerDismissed(true)}
                    className="p-1.5 rounded hover:bg-blue-100 text-[#1E3A8A]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

          {/* Firestore / Action Error Banner */}
          {(actionError || syncError) && (
            <div
              role="alert"
              className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center justify-between gap-3 text-xs font-medium text-[#DC2626]"
            >
              <div className="flex items-center gap-2 min-w-0">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="break-words min-w-0">{actionError || syncError}</span>
              </div>
              <button
                type="button"
                aria-label="Dismiss error"
                onClick={() => {
                  setActionError(null);
                  setSyncError(null);
                }}
                className="p-1 rounded hover:bg-red-100 shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {workspaceLoading && !business ? (
            <div className="bg-white border border-[#E2E8F0] rounded-lg p-10 text-center text-xs font-semibold text-[#64748B]">
              Loading business workspace...
            </div>
          ) : !business ? (
            <div className="bg-white border border-[#E2E8F0] rounded-lg p-8 text-center space-y-3">
              <div className="text-sm font-bold text-[#111827]">
                Business workspace unavailable
              </div>
              <p className="text-xs text-[#64748B] max-w-md mx-auto">
                {syncError
                  ? 'Could not load this business due to a permissions or connectivity issue. Try switching businesses, creating a fresh workspace, or removing this broken workspace shortcut.'
                  : 'This business record could not be found. Create a new business, switch to an existing one from the top header, or remove this broken workspace shortcut.'}
              </p>
              <div className="pt-1 flex flex-wrap items-center justify-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowCreateBusinessModal(true)}
                  className="h-9 px-4 rounded-md bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold"
                >
                  + Create New Business
                </button>
                {activeBusinessId && (
                  <button
                    type="button"
                    onClick={() =>
                      void runAction(async () => {
                        await removeOrphanedMembership(user.uid, activeBusinessId);
                        setSyncError(null);
                      })
                    }
                    className="h-9 px-4 rounded-md border border-[#E2E8F0] bg-white hover:bg-slate-50 text-[#111827] text-xs font-semibold"
                  >
                    Remove Unavailable Shortcut
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              {activeTab === 'home' && (
                <HomeTab
                  sales={sales}
                  products={products}
                  customers={customers}
                  expenses={expenses}
                  debtPayments={debtPayments}
                  currency={legacySettingsAdapter.currency}
                  dateRange={dateRange}
                  setActiveTab={setActiveTab}
                  onOpenNewSale={() => setShowNewSaleModal(true)}
                  onOpenReceivePayment={() => {
                    setPreselectedCustomerForPayment(null);
                    setShowReceivePaymentModal(true);
                  }}
                  onOpenAddExpense={() => setShowAddExpenseModal(true)}
                  onRestockProduct={(prod) => {
                    setPreselectedProductForRestock(prod);
                    setShowReceiveStockModal(true);
                  }}
                  onMarkSalePaid={(saleId, total) =>
                    void handleUpdateSaleStatus(saleId, 'Paid', total)
                  }
                  permissions={permissions}
                />
              )}

              {activeTab === 'sales' && (
                <SalesTab
                  sales={sales}
                  currency={legacySettingsAdapter.currency}
                  dateRange={dateRange}
                  onOpenNewSale={() => setShowNewSaleModal(true)}
                  onSelectSaleForReceipt={(sale) => setSelectedSaleForReceipt(sale)}
                  onUpdateSaleStatus={(id, status, amt) => void handleUpdateSaleStatus(id, status, amt)}
                  permissions={permissions}
                />
              )}

              {activeTab === 'stock' && (
                <StockTab
                  products={products}
                  inventoryMovements={inventoryMovements}
                  currency={legacySettingsAdapter.currency}
                  onOpenAddProduct={() => setShowAddProductModal(true)}
                  onOpenReceiveStock={(prod) => {
                    setPreselectedProductForRestock(prod || null);
                    setShowReceiveStockModal(true);
                  }}
                  permissions={permissions}
                />
              )}

              {activeTab === 'customers' && (
                <CustomersTab
                  customers={customers}
                  sales={sales}
                  debtPayments={debtPayments}
                  currency={legacySettingsAdapter.currency}
                  onOpenAddCustomer={() => setShowAddCustomerModal(true)}
                  onOpenReceivePaymentForCustomer={(cust) => {
                    setPreselectedCustomerForPayment(cust);
                    setShowReceivePaymentModal(true);
                  }}
                  permissions={permissions}
                />
              )}

              {activeTab === 'money' && (
                <MoneyTab
                  expenses={expenses}
                  sales={sales}
                  debtPayments={debtPayments}
                  currency={legacySettingsAdapter.currency}
                  dateRange={dateRange}
                  onOpenAddExpense={() => setShowAddExpenseModal(true)}
                  permissions={permissions}
                />
              )}

              {activeTab === 'settings' && business && (
                <SettingsTab
                  business={business}
                  members={members}
                  invitations={invitations}
                  auditLogs={auditLogs}
                  currentUserId={user.uid}
                  permissions={permissions}
                  hasLegacyLocalData={hasLegacyLocalData}
                  onUpdateBusiness={async (updates) => {
                    await updateBusinessProfile(business.id, user, members, updates);
                  }}
                  onInviteStaff={async (email, role) => {
                    await createStaffInvitation(
                      business,
                      user,
                      userProfile?.displayName || user.displayName || 'Administrator',
                      email,
                      role
                    );
                    await refreshInvitations();
                  }}
                  onCreateStaffAccount={async (input) => {
                    await createStaffAccountAtomic(business, user, input);
                  }}
                  onRevokeInvitation={async (inviteId) => {
                    await revokeStaffInvitation(business.id, user, inviteId);
                    await refreshInvitations();
                  }}
                  onUpdateMemberRole={async (member, role, status) => {
                    await updateMemberRoleAtomic(business.id, user, member, role, status);
                  }}
                  onRemoveMember={async (member) => {
                    await removeMemberAtomic(business.id, user, member);
                  }}
                  onTransferOwnership={async (newOwner) => {
                    await transferOwnershipAtomic(business.id, user, newOwner);
                  }}
                  onExportData={handleExportData}
                  onOpenMigrationAssistant={() => setShowMigrationModal(true)}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Modals */}
      {showNewSaleModal && (
        <NewSaleModal
          customers={customers}
          products={products}
          currency={legacySettingsAdapter.currency}
          onClose={() => setShowNewSaleModal(false)}
          onSaveSale={(data) => void handleSaveSale(data)}
        />
      )}

      {showReceivePaymentModal && (
        <ReceivePaymentModal
          customers={customers}
          preselectedCustomer={preselectedCustomerForPayment}
          currency={legacySettingsAdapter.currency}
          onClose={() => {
            setShowReceivePaymentModal(false);
            setPreselectedCustomerForPayment(null);
          }}
          onSavePayment={(data) => void handleSaveDebtPayment(data)}
        />
      )}

      {showAddExpenseModal && (
        <AddExpenseModal
          currency={legacySettingsAdapter.currency}
          categories={expenseCategories}
          onClose={() => setShowAddExpenseModal(false)}
          onSaveExpense={(data) => void handleSaveExpense(data)}
        />
      )}

      {showReceiveStockModal && (
        <ReceiveStockModal
          products={products}
          preselectedProduct={preselectedProductForRestock}
          currency={legacySettingsAdapter.currency}
          onClose={() => {
            setShowReceiveStockModal(false);
            setPreselectedProductForRestock(null);
          }}
          onRestock={(id, qty, cost, sell, min) => void handleRestock(id, qty, cost, sell, min)}
        />
      )}

      {showAddProductModal && (
        <AddProductModal
          currency={legacySettingsAdapter.currency}
          categories={productCategories}
          onClose={() => setShowAddProductModal(false)}
          onSaveProduct={(data) => void handleSaveProduct(data)}
        />
      )}

      {showAddCustomerModal && (
        <AddCustomerModal
          onClose={() => setShowAddCustomerModal(false)}
          onSaveCustomer={(data) => void handleSaveCustomer(data)}
        />
      )}

      {selectedSaleForReceipt && (
        <PrintReceiptModal
          sale={selectedSaleForReceipt}
          settings={legacySettingsAdapter}
          currency={legacySettingsAdapter.currency}
          onClose={() => setSelectedSaleForReceipt(null)}
        />
      )}

      {showLowStockModal && (
        <LowStockAlertModal
          products={products}
          currency={legacySettingsAdapter.currency}
          onClose={() => setShowLowStockModal(false)}
          onRestockProduct={(prod) => {
            setPreselectedProductForRestock(prod);
            setShowReceiveStockModal(true);
          }}
        />
      )}

      {showCreateBusinessModal && (
        <BusinessOnboardingModal
          isModal
          onClose={() => setShowCreateBusinessModal(false)}
          onBusinessReady={(bizId) => {
            selectBusiness(bizId);
            setShowCreateBusinessModal(false);
          }}
        />
      )}

      {showAccountModal && (
        <AccountProfileModal onClose={() => setShowAccountModal(false)} />
      )}

      {showMigrationModal && (
        <MigrationAssistantModal
          activeBusiness={business}
          existingCustomers={customers}
          existingProducts={products}
          existingSales={sales}
          existingExpenses={expenses}
          existingPayments={debtPayments}
          onClose={() => setShowMigrationModal(false)}
          onClearedLegacyStorage={() => setLegacyRefreshTick((t) => t + 1)}
        />
      )}
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <WorkspaceApp />
    </AuthProvider>
  );
}
