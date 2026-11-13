import { deleteApp, initializeApp } from 'firebase/app';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  terminate,
  Timestamp,
  Unsubscribe,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  createUserWithEmailAndPassword,
  getAuth,
  sendEmailVerification,
  signOut,
  updateProfile,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  AuditLog,
  Business,
  BusinessMember,
  BusinessMembershipIndex,
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
  UserProfile,
  UserRole,
} from '../types';
import {
  getTemplateForBusinessType,
  sanitizeId,
  truncateString,
  validateCreateStaffPayload,
} from '../utils/permissions';

function toIsoString(val: unknown): string {
  if (!val) return new Date().toISOString();
  if (typeof val === 'string') return val;
  if (val instanceof Timestamp) return val.toDate().toISOString();
  if (typeof (val as { toDate?: () => Date }).toDate === 'function') {
    return (val as { toDate: () => Date }).toDate().toISOString();
  }
  return new Date().toISOString();
}

function generateId(prefix: string): string {
  const rand =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 12)
      : `${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
  return sanitizeId(`${prefix}-${rand}`, prefix);
}

// =============================================================================
// User Profile & Memberships
// =============================================================================

const syncProfileInFlight = new Map<string, Promise<UserProfile>>();

export async function syncUserProfile(user: User, overrideDisplayName?: string): Promise<UserProfile> {
  const existingInFlight = syncProfileInFlight.get(user.uid);
  if (!overrideDisplayName && existingInFlight) {
    return existingInFlight;
  }

  const runSync = async (): Promise<UserProfile> => {
    if (existingInFlight) {
      await existingInFlight.catch(() => undefined);
    }

    const path = `users/${user.uid}`;
    const ref = doc(db, 'users', user.uid);
    const displayName =
      truncateString(
        overrideDisplayName || user.displayName || user.email?.split('@')[0] || 'Isles User',
        120
      ) || 'Isles User';
    const email = truncateString(user.email || '', 150) || `${user.uid}@users.local`;
    const photoURL = user.photoURL ? truncateString(user.photoURL, 500) : undefined;

    try {
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        const payload: Record<string, unknown> = {
          uid: user.uid,
          displayName,
          email,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        if (photoURL) {
          payload.photoURL = photoURL;
        }
        await setDoc(ref, payload);
        return { uid: user.uid, displayName, email, photoURL };
      }

      const existing = snap.data();
      const nextName =
        truncateString(overrideDisplayName || existing.displayName || displayName, 120) ||
        'Isles User';
      const nextEmail = truncateString(email || existing.email || '', 150);
      const nextPhoto =
        photoURL ||
        (typeof existing.photoURL === 'string' && existing.photoURL.trim()
          ? truncateString(existing.photoURL, 500)
          : undefined);

      const hasChanged =
        existing.displayName !== nextName ||
        existing.email !== nextEmail ||
        (nextPhoto !== undefined && existing.photoURL !== nextPhoto);

      if (hasChanged) {
        const updatePayload: Record<string, unknown> = {
          displayName: nextName,
          email: nextEmail,
          updatedAt: serverTimestamp(),
        };
        if (nextPhoto) {
          updatePayload.photoURL = nextPhoto;
        }
        await updateDoc(ref, updatePayload);
      }

      return {
        uid: user.uid,
        displayName: nextName,
        email: nextEmail,
        photoURL: nextPhoto,
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const promise = runSync().finally(() => {
    if (syncProfileInFlight.get(user.uid) === promise) {
      syncProfileInFlight.delete(user.uid);
    }
  });
  syncProfileInFlight.set(user.uid, promise);
  return promise;
}

export async function updateOwnUserDisplayName(user: User, displayName: string): Promise<void> {
  const path = `users/${user.uid}`;
  const cleanName = truncateString(displayName, 120);
  if (!cleanName) throw new Error('Display name cannot be empty.');
  try {
    await runTransaction(db, async (tx) => {
      const userRef = doc(db, 'users', user.uid);
      const snap = await tx.get(userRef);
      if (!snap.exists()) {
        tx.set(userRef, {
          uid: user.uid,
          displayName: cleanName,
          email: truncateString(user.email || '', 150),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        tx.update(userRef, {
          displayName: cleanName,
          updatedAt: serverTimestamp(),
        });
      }
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export function subscribeUserMemberships(
  userId: string,
  onData: (memberships: BusinessMembershipIndex[]) => void
): Unsubscribe {
  const path = `users/${userId}/memberships`;
  const q = query(collection(db, 'users', userId, 'memberships'), where('userId', '==', userId));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: BusinessMembershipIndex[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          businessId: data.businessId,
          userId: data.userId,
          businessName: data.businessName,
          businessType: data.businessType,
          role: data.role as UserRole,
          currency: data.currency || 'SBD',
          joinedAt: toIsoString(data.joinedAt),
          updatedAt: toIsoString(data.updatedAt),
        };
      });
      onData(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function removeOrphanedMembership(
  userId: string,
  businessId: string
): Promise<void> {
  const path = `users/${userId}/memberships/${businessId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'memberships', businessId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribePendingInvitationsForEmail(
  email: string,
  onData: (invites: Invitation[]) => void
): Unsubscribe {
  const normalized = email.trim().toLowerCase();
  const path = 'invitations';
  const q = query(collection(db, 'invitations'), where('email', '==', normalized));
  return onSnapshot(
    q,
    (snapshot) => {
      const now = Date.now();
      const invites: Invitation[] = snapshot.docs
        .map((d) => {
          const data = d.data();
          return {
            id: data.id,
            businessId: data.businessId,
            businessName: data.businessName,
            businessType: data.businessType,
            currency: data.currency || 'SBD',
            email: data.email,
            role: data.role,
            invitedBy: data.invitedBy,
            invitedByName: data.invitedByName,
            businessOwnerId: data.businessOwnerId,
            status: data.status,
            expiresAt: toIsoString(data.expiresAt),
            createdAt: toIsoString(data.createdAt),
            acceptedBy: data.acceptedBy,
            acceptedAt: data.acceptedAt ? toIsoString(data.acceptedAt) : undefined,
          } as Invitation;
        })
        .filter((inv) => inv.status === 'pending' && new Date(inv.expiresAt).getTime() > now);
      onData(invites);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

// =============================================================================
// Business Onboarding & Multi-Business Creation
// =============================================================================

export interface CreateBusinessInput {
  name: string;
  businessType: string;
  email?: string;
  phone?: string;
  address?: string;
  country: string;
  currency: string;
  timezone: string;
  taxRate?: number;
  receiptFooter?: string;
}

export async function createBusinessAtomic(
  user: User,
  displayName: string,
  input: CreateBusinessInput
): Promise<Business> {
  const businessId = generateId('biz');
  const template = getTemplateForBusinessType(input.businessType);
  const path = `businesses/${businessId}`;

  const cleanName = truncateString(input.name, 120);
  const cleanType = truncateString(input.businessType, 80);
  const cleanCountry = truncateString(input.country || 'Solomon Islands', 80);
  const cleanCurrency = truncateString(input.currency || 'SBD', 6);
  const cleanTimezone = truncateString(input.timezone || 'Pacific/Guadalcanal', 80);
  const cleanOwnerName = truncateString(displayName || user.displayName || 'Business Owner', 120);
  const cleanUserEmail = truncateString((user.email || '').toLowerCase(), 150);

  const businessDoc: Record<string, unknown> = {
    id: businessId,
    name: cleanName,
    businessType: cleanType,
    ownerId: user.uid,
    country: cleanCountry,
    currency: cleanCurrency,
    timezone: cleanTimezone,
    invoicePrefix: template.invoicePrefix,
    nextInvoiceNumber: 101,
    taxRate: Math.max(0, Math.min(100, Number(input.taxRate) || 0)),
    receiptFooter: truncateString(
      input.receiptFooter ||
        'Thank you for your business! Keep this receipt for your records.',
      300
    ),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (input.email?.trim()) businessDoc.email = truncateString(input.email, 150);
  if (input.phone?.trim()) businessDoc.phone = truncateString(input.phone, 40);
  if (input.address?.trim()) businessDoc.address = truncateString(input.address, 240);

  // Step 1: Atomic 3-document core commit (Business + Owner Member + User Membership Index)
  const coreBatch = writeBatch(db);

  coreBatch.set(doc(db, 'businesses', businessId), businessDoc);

  coreBatch.set(doc(db, 'businesses', businessId, 'members', user.uid), {
    userId: user.uid,
    businessId,
    email: cleanUserEmail,
    displayName: cleanOwnerName,
    role: 'Owner',
    status: 'active',
    joinedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  coreBatch.set(doc(db, 'users', user.uid, 'memberships', businessId), {
    businessId,
    userId: user.uid,
    businessName: cleanName,
    businessType: cleanType,
    role: 'Owner',
    currency: cleanCurrency,
    joinedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  try {
    await coreBatch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }

  // Step 2: Seed defaults in small batches (<= 5 writes per batch to stay well within rule lookup caps)
  const seedOps: Array<(batch: ReturnType<typeof writeBatch>) => void> = [];

  seedOps.push((b) => {
    b.set(doc(db, 'businesses', businessId, 'customers', 'cust-walkin'), {
      id: 'cust-walkin',
      businessId,
      name: 'Walk-in customer',
      phone: 'N/A',
      balance: 0,
      totalSpent: 0,
      createdBy: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });

  template.productCategories.forEach((catName, idx) => {
    const catId = sanitizeId(`pcat-${idx}-${catName.toLowerCase()}`, 'pcat');
    seedOps.push((b) => {
      b.set(doc(db, 'businesses', businessId, 'categories', catId), {
        id: catId,
        businessId,
        name: truncateString(catName, 60),
        kind: 'product',
        createdAt: serverTimestamp(),
      });
    });
  });

  template.expenseCategories.forEach((catName, idx) => {
    const catId = sanitizeId(`ecat-${idx}-${catName.toLowerCase()}`, 'ecat');
    seedOps.push((b) => {
      b.set(doc(db, 'businesses', businessId, 'categories', catId), {
        id: catId,
        businessId,
        name: truncateString(catName, 60),
        kind: 'expense',
        createdAt: serverTimestamp(),
      });
    });
  });

  const logId = generateId('log');
  seedOps.push((b) => {
    b.set(doc(db, 'businesses', businessId, 'auditLogs', logId), {
      id: logId,
      businessId,
      action: 'BUSINESS_CREATED',
      entityType: 'business',
      entityId: businessId,
      summary: truncateString(`Created ${cleanName} (${cleanType})`, 300),
      actorId: user.uid,
      actorEmail: cleanUserEmail,
      createdAt: serverTimestamp(),
    });
  });

  try {
    const SEED_CHUNK = 5;
    for (let i = 0; i < seedOps.length; i += SEED_CHUNK) {
      const b = writeBatch(db);
      seedOps.slice(i, i + SEED_CHUNK).forEach((fn) => fn(b));
      await b.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }

  return {
    id: businessId,
    name: cleanName,
    businessType: cleanType,
    ownerId: user.uid,
    email: input.email?.trim() || '',
    phone: input.phone?.trim() || '',
    address: input.address?.trim() || '',
    country: cleanCountry,
    currency: cleanCurrency,
    timezone: cleanTimezone,
    invoicePrefix: template.invoicePrefix,
    nextInvoiceNumber: 101,
    taxRate: Math.max(0, Math.min(100, Number(input.taxRate) || 0)),
    receiptFooter: businessDoc.receiptFooter as string,
  };
}

// =============================================================================
// Real-Time Business Workspace Subscriptions
// =============================================================================

export interface BusinessSubscriptionsHandlers {
  onBusiness: (biz: Business | null) => void;
  onMembers: (members: BusinessMember[]) => void;
  onCategories: (categories: Category[]) => void;
  onCustomers: (customers: Customer[]) => void;
  onProducts: (products: Product[]) => void;
  onSales: (sales: Sale[]) => void;
  onPayments: (payments: DebtPayment[]) => void;
  onExpenses: (expenses: Expense[]) => void;
  onInventoryMovements: (movements: InventoryMovement[]) => void;
  onAuditLogs: (logs: AuditLog[]) => void;
  onSyncError: (msg: string) => void;
}

export function subscribeBusinessWorkspace(
  businessId: string,
  handlers: BusinessSubscriptionsHandlers
): () => void {
  const unsubs: Unsubscribe[] = [];

  const wrapErr = (op: OperationType, path: string) => (err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    handlers.onSyncError(msg);
    try {
      handleFirestoreError(err, op, path);
    } catch {
      // Logged in handleFirestoreError; surfaced to UI via onSyncError
    }
  };

  // 1. Business root document
  unsubs.push(
    onSnapshot(
      doc(db, 'businesses', businessId),
      (snap) => {
        if (!snap.exists()) {
          handlers.onBusiness(null);
          return;
        }
        const d = snap.data();
        handlers.onBusiness({
          id: d.id,
          name: d.name,
          businessType: d.businessType,
          ownerId: d.ownerId,
          email: d.email || '',
          phone: d.phone || '',
          address: d.address || '',
          country: d.country || 'Solomon Islands',
          currency: d.currency || 'SBD',
          timezone: d.timezone || 'Pacific/Guadalcanal',
          invoicePrefix: d.invoicePrefix || 'INV',
          nextInvoiceNumber: Number(d.nextInvoiceNumber) || 101,
          taxRate: Number(d.taxRate) || 0,
          receiptFooter: d.receiptFooter || '',
          logoUrl: d.logoUrl,
          createdAt: toIsoString(d.createdAt),
          updatedAt: toIsoString(d.updatedAt),
        });
      },
      wrapErr(OperationType.GET, `businesses/${businessId}`)
    )
  );

  // 2. Members
  unsubs.push(
    onSnapshot(
      query(collection(db, 'businesses', businessId, 'members'), where('businessId', '==', businessId)),
      (snap) => {
        handlers.onMembers(
          snap.docs.map((docSnap) => {
            const d = docSnap.data();
            return {
              userId: d.userId,
              businessId: d.businessId,
              email: d.email,
              displayName: d.displayName,
              role: d.role as UserRole,
              status: d.status,
              inviteId: d.inviteId,
              joinedAt: toIsoString(d.joinedAt),
              updatedAt: toIsoString(d.updatedAt),
            };
          })
        );
      },
      wrapErr(OperationType.LIST, `businesses/${businessId}/members`)
    )
  );

  // 3. Categories
  unsubs.push(
    onSnapshot(
      query(collection(db, 'businesses', businessId, 'categories'), where('businessId', '==', businessId)),
      (snap) => {
        handlers.onCategories(
          snap.docs.map((docSnap) => {
            const d = docSnap.data();
            return {
              id: d.id,
              businessId: d.businessId,
              name: d.name,
              kind: d.kind,
              createdAt: toIsoString(d.createdAt),
            };
          })
        );
      },
      wrapErr(OperationType.LIST, `businesses/${businessId}/categories`)
    )
  );

  // 4. Customers
  unsubs.push(
    onSnapshot(
      query(collection(db, 'businesses', businessId, 'customers'), where('businessId', '==', businessId)),
      (snap) => {
        const list: Customer[] = snap.docs
          .map((docSnap) => {
            const d = docSnap.data();
            return {
              id: d.id,
              businessId: d.businessId,
              name: d.name,
              phone: d.phone || '',
              email: d.email,
              address: d.address,
              balance: Number(d.balance) || 0,
              totalSpent: Number(d.totalSpent) || 0,
              createdBy: d.createdBy,
            };
          })
          .sort((a, b) => (a.id === 'cust-walkin' ? -1 : b.id === 'cust-walkin' ? 1 : a.name.localeCompare(b.name)));
        handlers.onCustomers(list);
      },
      wrapErr(OperationType.LIST, `businesses/${businessId}/customers`)
    )
  );

  // 5. Products
  unsubs.push(
    onSnapshot(
      query(collection(db, 'businesses', businessId, 'products'), where('businessId', '==', businessId)),
      (snap) => {
        const list: Product[] = snap.docs
          .map((docSnap) => {
            const d = docSnap.data();
            return {
              id: d.id,
              businessId: d.businessId,
              name: d.name,
              sku: d.sku,
              category: d.category,
              costPrice: Number(d.costPrice) || 0,
              sellingPrice: Number(d.sellingPrice) || 0,
              quantity: Number(d.quantity) || 0,
              minStockAlert: Number(d.minStockAlert) || 0,
              unit: d.unit || 'pcs',
              createdBy: d.createdBy,
            };
          })
          .sort((a, b) => a.name.localeCompare(b.name));
        handlers.onProducts(list);
      },
      wrapErr(OperationType.LIST, `businesses/${businessId}/products`)
    )
  );

  // 6. Sales
  unsubs.push(
    onSnapshot(
      query(
        collection(db, 'businesses', businessId, 'sales'),
        where('businessId', '==', businessId),
        orderBy('date', 'desc')
      ),
      (snap) => {
        handlers.onSales(
          snap.docs.map((docSnap) => {
            const d = docSnap.data();
            return {
              id: d.id,
              businessId: d.businessId,
              invoiceNo: d.invoiceNo,
              customerId: d.customerId,
              customerName: d.customerName,
              date: d.date,
              items: d.items || [],
              subtotal: Number(d.subtotal) || 0,
              discount: Number(d.discount) || 0,
              total: Number(d.total) || 0,
              status: d.status,
              amountPaid: Number(d.amountPaid) || 0,
              paymentMethod: d.paymentMethod,
              type: d.type || 'sale',
              notes: d.notes,
              createdBy: d.createdBy,
            };
          })
        );
      },
      wrapErr(OperationType.LIST, `businesses/${businessId}/sales`)
    )
  );

  // 7. Payments
  unsubs.push(
    onSnapshot(
      query(
        collection(db, 'businesses', businessId, 'payments'),
        where('businessId', '==', businessId),
        orderBy('date', 'desc')
      ),
      (snap) => {
        handlers.onPayments(
          snap.docs.map((docSnap) => {
            const d = docSnap.data();
            return {
              id: d.id,
              businessId: d.businessId,
              customerId: d.customerId,
              customerName: d.customerName,
              amount: Number(d.amount) || 0,
              date: d.date,
              method: d.method,
              note: d.note,
              idempotencyKey: d.idempotencyKey,
              createdBy: d.createdBy,
            };
          })
        );
      },
      wrapErr(OperationType.LIST, `businesses/${businessId}/payments`)
    )
  );

  // 8. Expenses
  unsubs.push(
    onSnapshot(
      query(
        collection(db, 'businesses', businessId, 'expenses'),
        where('businessId', '==', businessId),
        orderBy('date', 'desc')
      ),
      (snap) => {
        handlers.onExpenses(
          snap.docs.map((docSnap) => {
            const d = docSnap.data();
            return {
              id: d.id,
              businessId: d.businessId,
              description: d.description,
              category: d.category,
              amount: Number(d.amount) || 0,
              date: d.date,
              paymentMethod: d.paymentMethod,
              reference: d.reference,
              createdBy: d.createdBy,
            };
          })
        );
      },
      wrapErr(OperationType.LIST, `businesses/${businessId}/expenses`)
    )
  );

  // 9. Inventory Movements
  unsubs.push(
    onSnapshot(
      query(
        collection(db, 'businesses', businessId, 'inventoryMovements'),
        where('businessId', '==', businessId),
        orderBy('createdAt', 'desc')
      ),
      (snap) => {
        handlers.onInventoryMovements(
          snap.docs.map((docSnap) => {
            const d = docSnap.data();
            return {
              id: d.id,
              businessId: d.businessId,
              productId: d.productId,
              productName: d.productName,
              type: d.type,
              quantityDelta: Number(d.quantityDelta) || 0,
              previousQty: Number(d.previousQty) || 0,
              newQty: Number(d.newQty) || 0,
              reason: d.reason,
              createdBy: d.createdBy,
              createdAt: toIsoString(d.createdAt),
            };
          })
        );
      },
      wrapErr(OperationType.LIST, `businesses/${businessId}/inventoryMovements`)
    )
  );

  // 10. Audit Logs
  unsubs.push(
    onSnapshot(
      query(
        collection(db, 'businesses', businessId, 'auditLogs'),
        where('businessId', '==', businessId),
        orderBy('createdAt', 'desc')
      ),
      (snap) => {
        handlers.onAuditLogs(
          snap.docs.map((docSnap) => {
            const d = docSnap.data();
            return {
              id: d.id,
              businessId: d.businessId,
              action: d.action,
              entityType: d.entityType,
              entityId: d.entityId,
              summary: d.summary,
              actorId: d.actorId,
              actorEmail: d.actorEmail,
              createdAt: toIsoString(d.createdAt),
            };
          })
        );
      },
      wrapErr(OperationType.LIST, `businesses/${businessId}/auditLogs`)
    )
  );

  return () => {
    unsubs.forEach((u) => u());
  };
}

// =============================================================================
// Atomic Transactional Business Operations
// =============================================================================

export async function createSaleAtomic(
  businessId: string,
  user: User,
  saleInput: Omit<Sale, 'id' | 'invoiceNo'>
): Promise<Sale> {
  const saleId = generateId('sale');
  const path = `businesses/${businessId}/sales/${saleId}`;

  try {
    return await runTransaction(db, async (tx) => {
      const bizRef = doc(db, 'businesses', businessId);
      const bizSnap = await tx.get(bizRef);
      if (!bizSnap.exists()) throw new Error('Active business could not be found.');
      const bizData = bizSnap.data();
      const nextNum = Number(bizData.nextInvoiceNumber) || 101;
      const prefix = String(bizData.invoicePrefix || 'INV');
      const invoiceNo = prefix === 'INV' ? `#${nextNum}` : `${prefix}-${nextNum}`;

      const custRef = doc(db, 'businesses', businessId, 'customers', saleInput.customerId);
      const custSnap = await tx.get(custRef);
      if (!custSnap.exists()) throw new Error('Selected customer does not exist.');
      const custData = custSnap.data();

      // Read all products before performing any writes
      const productSnaps = await Promise.all(
        saleInput.items.map((item) =>
          tx.get(doc(db, 'businesses', businessId, 'products', item.productId))
        )
      );

      // Update physical product quantities & log movements
      productSnaps.forEach((pSnap, idx) => {
        if (!pSnap.exists()) return;
        const prod = pSnap.data();
        const item = saleInput.items[idx];
        const isService = prod.category === 'Services' || Number(prod.quantity) >= 999;
        if (!isService) {
          const prevQty = Number(prod.quantity) || 0;
          const newQty = Math.max(0, prevQty - item.quantity);
          tx.update(pSnap.ref, {
            quantity: newQty,
            updatedAt: serverTimestamp(),
          });
          const movId = generateId('mov');
          tx.set(doc(db, 'businesses', businessId, 'inventoryMovements', movId), {
            id: movId,
            businessId,
            productId: prod.id,
            productName: truncateString(prod.name, 140),
            type: 'sale',
            quantityDelta: -item.quantity,
            previousQty: prevQty,
            newQty,
            reason: truncateString(`Invoice ${invoiceNo}`, 200),
            createdBy: user.uid,
            createdAt: serverTimestamp(),
          });
        }
      });

      const unpaidAmount = Math.max(0, saleInput.total - saleInput.amountPaid);
      tx.update(custRef, {
        balance: (Number(custData.balance) || 0) + unpaidAmount,
        totalSpent: (Number(custData.totalSpent) || 0) + saleInput.total,
        updatedAt: serverTimestamp(),
      });

      tx.update(bizRef, {
        nextInvoiceNumber: nextNum + 1,
        updatedAt: serverTimestamp(),
      });

      const salePayload: Record<string, unknown> = {
        id: saleId,
        businessId,
        invoiceNo: truncateString(invoiceNo, 24),
        customerId: saleInput.customerId,
        customerName: truncateString(saleInput.customerName, 120),
        date: saleInput.date || new Date().toISOString(),
        items: saleInput.items.slice(0, 100).map((i) => ({
          productId: i.productId,
          name: truncateString(i.name, 140),
          quantity: i.quantity,
          price: i.price,
          costPrice: i.costPrice ?? 0,
        })),
        subtotal: Math.max(0, saleInput.subtotal),
        discount: Math.max(0, saleInput.discount),
        total: Math.max(0, saleInput.total),
        status: saleInput.status,
        amountPaid:
          saleInput.status === 'Paid'
            ? Math.max(0, saleInput.total)
            : Math.max(0, Math.min(saleInput.total, saleInput.amountPaid)),
        paymentMethod: saleInput.paymentMethod,
        type: saleInput.type || 'sale',
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (saleInput.notes?.trim()) {
        salePayload.notes = truncateString(saleInput.notes, 300);
      }

      tx.set(doc(db, 'businesses', businessId, 'sales', saleId), salePayload);

      const logId = generateId('log');
      tx.set(doc(db, 'businesses', businessId, 'auditLogs', logId), {
        id: logId,
        businessId,
        action: 'SALE_CREATED',
        entityType: 'sale',
        entityId: saleId,
        summary: truncateString(
          `${invoiceNo} · ${saleInput.customerName} · ${saleInput.total.toFixed(2)} (${saleInput.status})`,
          300
        ),
        actorId: user.uid,
        actorEmail: truncateString(user.email || '', 150),
        createdAt: serverTimestamp(),
      });

      return {
        ...saleInput,
        id: saleId,
        businessId,
        invoiceNo,
        createdBy: user.uid,
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function markSalePaidAtomic(
  businessId: string,
  user: User,
  saleId: string
): Promise<void> {
  const path = `businesses/${businessId}/sales/${saleId}`;
  try {
    await runTransaction(db, async (tx) => {
      const saleRef = doc(db, 'businesses', businessId, 'sales', saleId);
      const saleSnap = await tx.get(saleRef);
      if (!saleSnap.exists()) throw new Error('Invoice not found.');
      const sale = saleSnap.data();
      if (sale.status === 'Paid') return;

      const custRef = doc(db, 'businesses', businessId, 'customers', sale.customerId);
      const custSnap = await tx.get(custRef);

      const remaining = Math.max(0, Number(sale.total) - Number(sale.amountPaid));
      tx.update(saleRef, {
        status: 'Paid' as PaymentStatus,
        amountPaid: Number(sale.total),
        updatedAt: serverTimestamp(),
      });

      if (custSnap.exists() && remaining > 0) {
        const cust = custSnap.data();
        tx.update(custRef, {
          balance: Math.max(0, (Number(cust.balance) || 0) - remaining),
          totalSpent: Number(cust.totalSpent) || 0,
          updatedAt: serverTimestamp(),
        });
      }

      const logId = generateId('log');
      tx.set(doc(db, 'businesses', businessId, 'auditLogs', logId), {
        id: logId,
        businessId,
        action: 'SALE_MARKED_PAID',
        entityType: 'sale',
        entityId: saleId,
        summary: truncateString(`Marked invoice ${sale.invoiceNo} as Paid`, 300),
        actorId: user.uid,
        actorEmail: truncateString(user.email || '', 150),
        createdAt: serverTimestamp(),
      });
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function recordDebtPaymentAtomic(
  businessId: string,
  user: User,
  paymentInput: {
    customerId: string;
    amount: number;
    method: PaymentMethod;
    note?: string;
    idempotencyKey?: string;
  }
): Promise<void> {
  const paymentId = generateId('pay');
  const idempotencyKey = sanitizeId(paymentInput.idempotencyKey || generateId('idem'), 'idem');
  const path = `businesses/${businessId}/payments/${paymentId}`;

  try {
    await runTransaction(db, async (tx) => {
      const custRef = doc(db, 'businesses', businessId, 'customers', paymentInput.customerId);
      const custSnap = await tx.get(custRef);
      if (!custSnap.exists()) throw new Error('Customer record not found.');
      const cust = custSnap.data();

      const newBalance = Math.max(0, (Number(cust.balance) || 0) - paymentInput.amount);
      tx.update(custRef, {
        balance: newBalance,
        totalSpent: Number(cust.totalSpent) || 0,
        updatedAt: serverTimestamp(),
      });

      const payload: Record<string, unknown> = {
        id: paymentId,
        businessId,
        customerId: paymentInput.customerId,
        customerName: truncateString(cust.name, 120),
        amount: paymentInput.amount,
        date: new Date().toISOString(),
        method: paymentInput.method,
        idempotencyKey,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
      };
      if (paymentInput.note?.trim()) {
        payload.note = truncateString(paymentInput.note, 240);
      }

      tx.set(doc(db, 'businesses', businessId, 'payments', paymentId), payload);

      const logId = generateId('log');
      tx.set(doc(db, 'businesses', businessId, 'auditLogs', logId), {
        id: logId,
        businessId,
        action: 'PAYMENT_RECEIVED',
        entityType: 'payment',
        entityId: paymentId,
        summary: truncateString(
          `Received ${paymentInput.amount.toFixed(2)} from ${cust.name} (${paymentInput.method})`,
          300
        ),
        actorId: user.uid,
        actorEmail: truncateString(user.email || '', 150),
        createdAt: serverTimestamp(),
      });
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function addProduct(
  businessId: string,
  user: User,
  productInput: Omit<Product, 'id'>
): Promise<void> {
  const productId = generateId('prod');
  const path = `businesses/${businessId}/products/${productId}`;
  const batch = writeBatch(db);

  batch.set(doc(db, 'businesses', businessId, 'products', productId), {
    id: productId,
    businessId,
    name: truncateString(productInput.name, 140),
    sku: truncateString(productInput.sku, 60),
    category: truncateString(productInput.category, 60),
    costPrice: Math.max(0, Number(productInput.costPrice) || 0),
    sellingPrice: Math.max(0, Number(productInput.sellingPrice) || 0),
    quantity: Math.max(0, Number(productInput.quantity) || 0),
    minStockAlert: Math.max(0, Number(productInput.minStockAlert) || 0),
    unit: truncateString(productInput.unit || 'pcs', 24),
    createdBy: user.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  if (productInput.category !== 'Services' && productInput.quantity > 0) {
    const movId = generateId('mov');
    batch.set(doc(db, 'businesses', businessId, 'inventoryMovements', movId), {
      id: movId,
      businessId,
      productId,
      productName: truncateString(productInput.name, 140),
      type: 'restock',
      quantityDelta: Number(productInput.quantity),
      previousQty: 0,
      newQty: Number(productInput.quantity),
      reason: 'Initial opening stock',
      createdBy: user.uid,
      createdAt: serverTimestamp(),
    });
  }

  const logId = generateId('log');
  batch.set(doc(db, 'businesses', businessId, 'auditLogs', logId), {
    id: logId,
    businessId,
    action: 'PRODUCT_ADDED',
    entityType: 'product',
    entityId: productId,
    summary: truncateString(`Added product ${productInput.name} (${productInput.sku})`, 300),
    actorId: user.uid,
    actorEmail: truncateString(user.email || '', 150),
    createdAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function restockProductAtomic(
  businessId: string,
  user: User,
  productId: string,
  addQty: number,
  newCostPrice?: number,
  newSellingPrice?: number,
  newMinStockAlert?: number
): Promise<void> {
  const path = `businesses/${businessId}/products/${productId}`;
  try {
    await runTransaction(db, async (tx) => {
      const prodRef = doc(db, 'businesses', businessId, 'products', productId);
      const snap = await tx.get(prodRef);
      if (!snap.exists()) throw new Error('Product not found.');
      const existing = snap.data();
      const prevQty = Number(existing.quantity) || 0;
      const newQty = Math.max(0, prevQty + addQty);

      tx.update(prodRef, {
        quantity: newQty,
        costPrice: newCostPrice !== undefined ? Math.max(0, newCostPrice) : Number(existing.costPrice),
        sellingPrice:
          newSellingPrice !== undefined ? Math.max(0, newSellingPrice) : Number(existing.sellingPrice),
        minStockAlert:
          newMinStockAlert !== undefined
            ? Math.max(0, newMinStockAlert)
            : Number(existing.minStockAlert),
        updatedAt: serverTimestamp(),
      });

      const movId = generateId('mov');
      tx.set(doc(db, 'businesses', businessId, 'inventoryMovements', movId), {
        id: movId,
        businessId,
        productId,
        productName: truncateString(existing.name, 140),
        type: 'restock',
        quantityDelta: addQty,
        previousQty: prevQty,
        newQty,
        reason: 'Stock received',
        createdBy: user.uid,
        createdAt: serverTimestamp(),
      });

      const logId = generateId('log');
      tx.set(doc(db, 'businesses', businessId, 'auditLogs', logId), {
        id: logId,
        businessId,
        action: 'STOCK_RESTOCKED',
        entityType: 'product',
        entityId: productId,
        summary: truncateString(
          `Restocked ${existing.name}: +${addQty} (new qty ${newQty})`,
          300
        ),
        actorId: user.uid,
        actorEmail: truncateString(user.email || '', 150),
        createdAt: serverTimestamp(),
      });
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function addCustomer(
  businessId: string,
  user: User,
  customerInput: Omit<Customer, 'id' | 'balance' | 'totalSpent'>
): Promise<void> {
  const customerId = generateId('cust');
  const path = `businesses/${businessId}/customers/${customerId}`;
  const batch = writeBatch(db);

  const payload: Record<string, unknown> = {
    id: customerId,
    businessId,
    name: truncateString(customerInput.name, 120),
    phone: truncateString(customerInput.phone || '', 40),
    balance: 0,
    totalSpent: 0,
    createdBy: user.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (customerInput.email?.trim()) payload.email = truncateString(customerInput.email, 150);
  if (customerInput.address?.trim()) payload.address = truncateString(customerInput.address, 240);

  batch.set(doc(db, 'businesses', businessId, 'customers', customerId), payload);

  const logId = generateId('log');
  batch.set(doc(db, 'businesses', businessId, 'auditLogs', logId), {
    id: logId,
    businessId,
    action: 'CUSTOMER_ADDED',
    entityType: 'customer',
    entityId: customerId,
    summary: truncateString(`Added customer ${customerInput.name}`, 300),
    actorId: user.uid,
    actorEmail: truncateString(user.email || '', 150),
    createdAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function addExpense(
  businessId: string,
  user: User,
  expenseInput: Omit<Expense, 'id'>
): Promise<void> {
  const expenseId = generateId('exp');
  const path = `businesses/${businessId}/expenses/${expenseId}`;
  const batch = writeBatch(db);

  const payload: Record<string, unknown> = {
    id: expenseId,
    businessId,
    description: truncateString(expenseInput.description, 240),
    category: truncateString(expenseInput.category, 60),
    amount: Math.max(0.01, Number(expenseInput.amount)),
    date: expenseInput.date || new Date().toISOString(),
    paymentMethod: expenseInput.paymentMethod,
    createdBy: user.uid,
    createdAt: serverTimestamp(),
  };
  if (expenseInput.reference?.trim()) {
    payload.reference = truncateString(expenseInput.reference, 80);
  }

  batch.set(doc(db, 'businesses', businessId, 'expenses', expenseId), payload);

  const logId = generateId('log');
  batch.set(doc(db, 'businesses', businessId, 'auditLogs', logId), {
    id: logId,
    businessId,
    action: 'EXPENSE_RECORDED',
    entityType: 'expense',
    entityId: expenseId,
    summary: truncateString(
      `${expenseInput.category}: ${expenseInput.description} (${expenseInput.amount.toFixed(2)})`,
      300
    ),
    actorId: user.uid,
    actorEmail: truncateString(user.email || '', 150),
    createdAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateBusinessProfile(
  businessId: string,
  user: User,
  members: BusinessMember[],
  updates: {
    name: string;
    businessType: string;
    email: string;
    phone: string;
    address: string;
    currency: string;
    taxRate: number;
    receiptFooter: string;
  }
): Promise<void> {
  const path = `businesses/${businessId}`;
  const batch = writeBatch(db);

  const cleanName = truncateString(updates.name, 120);
  const cleanType = truncateString(updates.businessType, 80);
  const cleanCurrency = truncateString(updates.currency || 'SBD', 6);

  const bizUpdate: Record<string, unknown> = {
    name: cleanName,
    businessType: cleanType,
    email: truncateString(updates.email || '', 150),
    phone: truncateString(updates.phone || '', 40),
    address: truncateString(updates.address || '', 240),
    currency: cleanCurrency,
    taxRate: Math.max(0, Math.min(100, Number(updates.taxRate) || 0)),
    receiptFooter: truncateString(updates.receiptFooter || '', 300),
    updatedAt: serverTimestamp(),
  };

  batch.update(doc(db, 'businesses', businessId), bizUpdate);

  // Keep every member's index synced with new business name/type/currency
  members.forEach((m) => {
    batch.update(doc(db, 'users', m.userId, 'memberships', businessId), {
      businessName: cleanName,
      businessType: cleanType,
      currency: cleanCurrency,
      updatedAt: serverTimestamp(),
    });
  });

  const logId = generateId('log');
  batch.set(doc(db, 'businesses', businessId, 'auditLogs', logId), {
    id: logId,
    businessId,
    action: 'BUSINESS_SETTINGS_UPDATED',
    entityType: 'business',
    entityId: businessId,
    summary: truncateString(`Updated profile and receipt settings for ${cleanName}`, 300),
    actorId: user.uid,
    actorEmail: truncateString(user.email || '', 150),
    createdAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// =============================================================================
// Staff Invitations & RBAC Management
// =============================================================================

export async function listInvitationsForBusiness(
  business: Business,
  user: User
): Promise<Invitation[]> {
  const path = 'invitations';
  try {
    const queries = [
      query(collection(db, 'invitations'), where('invitedBy', '==', user.uid)),
    ];
    if (business.ownerId === user.uid) {
      queries.push(
        query(collection(db, 'invitations'), where('businessOwnerId', '==', user.uid))
      );
    }

    const snapshots = await Promise.all(queries.map((q) => getDocs(q)));
    const map = new Map<string, Invitation>();
    snapshots.forEach((snap) => {
      snap.docs.forEach((d) => {
        const data = d.data();
        if (data.businessId !== business.id) return;
        map.set(data.id, {
          id: data.id,
          businessId: data.businessId,
          businessName: data.businessName,
          businessType: data.businessType,
          currency: data.currency || 'SBD',
          email: data.email,
          role: data.role,
          invitedBy: data.invitedBy,
          invitedByName: data.invitedByName,
          businessOwnerId: data.businessOwnerId,
          status: data.status,
          expiresAt: toIsoString(data.expiresAt),
          createdAt: toIsoString(data.createdAt),
          acceptedBy: data.acceptedBy,
          acceptedAt: data.acceptedAt ? toIsoString(data.acceptedAt) : undefined,
        });
      });
    });

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function createStaffInvitation(
  business: Business,
  inviter: User,
  inviterName: string,
  inviteeEmail: string,
  role: Exclude<UserRole, 'Owner'>
): Promise<Invitation> {
  const inviteId = generateId('inv');
  const cleanEmail = truncateString(inviteeEmail.trim().toLowerCase(), 150);
  const path = `invitations/${inviteId}`;
  const expiresDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const batch = writeBatch(db);
  batch.set(doc(db, 'invitations', inviteId), {
    id: inviteId,
    businessId: business.id,
    businessName: truncateString(business.name, 120),
    businessType: truncateString(business.businessType, 80),
    currency: truncateString(business.currency || 'SBD', 6),
    email: cleanEmail,
    role,
    invitedBy: inviter.uid,
    invitedByName: truncateString(inviterName || inviter.displayName || 'Administrator', 120),
    businessOwnerId: business.ownerId,
    status: 'pending',
    expiresAt: Timestamp.fromDate(expiresDate),
    createdAt: serverTimestamp(),
  });

  const logId = generateId('log');
  batch.set(doc(db, 'businesses', business.id, 'auditLogs', logId), {
    id: logId,
    businessId: business.id,
    action: 'STAFF_INVITED',
    entityType: 'invitation',
    entityId: inviteId,
    summary: truncateString(`Invited ${cleanEmail} as ${role}`, 300),
    actorId: inviter.uid,
    actorEmail: truncateString(inviter.email || '', 150),
    createdAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }

  return {
    id: inviteId,
    businessId: business.id,
    businessName: business.name,
    businessType: business.businessType,
    currency: business.currency,
    email: cleanEmail,
    role,
    invitedBy: inviter.uid,
    invitedByName: inviterName,
    businessOwnerId: business.ownerId,
    status: 'pending',
    expiresAt: expiresDate.toISOString(),
    createdAt: new Date().toISOString(),
  };
}

export async function createStaffAccountAtomic(
  business: Business,
  actor: User,
  input: {
    displayName: string;
    email: string;
    password: string;
    role: Exclude<UserRole, 'Owner'>;
  }
): Promise<void> {
  const validation = validateCreateStaffPayload(input);
  if (!validation.valid) {
    throw new Error(validation.errors[0]);
  }

  const cleanName = truncateString(input.displayName, 120);
  const cleanEmail = truncateString(input.email.trim().toLowerCase(), 150);

  if (actor.email && actor.email.trim().toLowerCase() === cleanEmail) {
    throw new Error('This email belongs to your own account.');
  }

  const secondaryAppName = `staff-provision-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
  const secondaryAuth = getAuth(secondaryApp);
  const secondaryDb = getFirestore(secondaryApp, firebaseConfig.firestoreDatabaseId);

  try {
    let staffUid: string;
    try {
      const cred = await createUserWithEmailAndPassword(secondaryAuth, cleanEmail, input.password);
      staffUid = cred.user.uid;
      await updateProfile(cred.user, { displayName: cleanName });

      try {
        await setDoc(doc(secondaryDb, 'users', staffUid), {
          uid: staffUid,
          displayName: cleanName,
          email: cleanEmail,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `users/${staffUid}`);
      }

      try {
        await sendEmailVerification(cred.user);
      } catch {
        // Verification email dispatch is best-effort; user can resend from AuthScreen on first login
      }
    } catch (authErr) {
      const code = (authErr as { code?: string })?.code || '';
      if (code === 'auth/email-already-in-use') {
        throw new Error(
          'An Isles BOS account with this email already exists. Switch to "Send Invite" to add an existing user.'
        );
      }
      if (code === 'auth/weak-password') {
        throw new Error('Password is too weak. Use at least 6 characters.');
      }
      if (code === 'auth/invalid-email') {
        throw new Error('Please enter a valid email address.');
      }
      if (code === 'auth/operation-not-allowed') {
        throw new Error(
          'Email/Password authentication is not yet enabled in Firebase Console (Authentication → Sign-in method).'
        );
      }
      throw authErr;
    }

    await signOut(secondaryAuth).catch(() => undefined);

    const path = `businesses/${business.id}/members/${staffUid}`;
    const batch = writeBatch(db);

    batch.set(doc(db, 'businesses', business.id, 'members', staffUid), {
      userId: staffUid,
      businessId: business.id,
      email: cleanEmail,
      displayName: cleanName,
      role: input.role,
      status: 'active',
      joinedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    batch.set(doc(db, 'users', staffUid, 'memberships', business.id), {
      businessId: business.id,
      userId: staffUid,
      businessName: truncateString(business.name, 120),
      businessType: truncateString(business.businessType, 80),
      role: input.role,
      currency: truncateString(business.currency || 'SBD', 6),
      joinedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const logId = generateId('log');
    batch.set(doc(db, 'businesses', business.id, 'auditLogs', logId), {
      id: logId,
      businessId: business.id,
      action: 'STAFF_CREATED',
      entityType: 'member',
      entityId: staffUid,
      summary: truncateString(
        `Created staff account for ${cleanName} (${cleanEmail}) as ${input.role}`,
        300
      ),
      actorId: actor.uid,
      actorEmail: truncateString(actor.email || '', 150),
      createdAt: serverTimestamp(),
    });

    try {
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  } finally {
    await signOut(secondaryAuth).catch(() => undefined);
    await terminate(secondaryDb).catch(() => undefined);
    await deleteApp(secondaryApp).catch(() => undefined);
  }
}

export async function revokeStaffInvitation(
  businessId: string,
  user: User,
  inviteId: string
): Promise<void> {
  const path = `invitations/${inviteId}`;
  const batch = writeBatch(db);
  batch.update(doc(db, 'invitations', inviteId), { status: 'revoked' });

  const logId = generateId('log');
  batch.set(doc(db, 'businesses', businessId, 'auditLogs', logId), {
    id: logId,
    businessId,
    action: 'INVITATION_REVOKED',
    entityType: 'invitation',
    entityId: inviteId,
    summary: `Revoked pending staff invitation ${inviteId}`,
    actorId: user.uid,
    actorEmail: truncateString(user.email || '', 150),
    createdAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function acceptInvitationAtomic(
  user: User,
  displayName: string,
  inviteId: string
): Promise<string> {
  const path = `invitations/${inviteId}`;
  try {
    return await runTransaction(db, async (tx) => {
      const invRef = doc(db, 'invitations', inviteId);
      const invSnap = await tx.get(invRef);
      if (!invSnap.exists()) throw new Error('Invitation does not exist.');
      const inv = invSnap.data();

      if (inv.status !== 'pending') {
        throw new Error('This invitation has already been used or revoked.');
      }

      const businessId = inv.businessId as string;
      const cleanName = truncateString(
        displayName || user.displayName || user.email?.split('@')[0] || 'Staff Member',
        120
      );
      const cleanEmail = truncateString((user.email || '').toLowerCase(), 150);

      tx.update(invRef, {
        status: 'accepted',
        acceptedBy: user.uid,
        acceptedAt: serverTimestamp(),
      });

      tx.set(doc(db, 'businesses', businessId, 'members', user.uid), {
        userId: user.uid,
        businessId,
        email: cleanEmail,
        displayName: cleanName,
        role: inv.role,
        status: 'active',
        inviteId,
        joinedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      tx.set(doc(db, 'users', user.uid, 'memberships', businessId), {
        businessId,
        userId: user.uid,
        businessName: inv.businessName,
        businessType: inv.businessType,
        role: inv.role,
        currency: inv.currency || 'SBD',
        joinedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const logId = generateId('log');
      tx.set(doc(db, 'businesses', businessId, 'auditLogs', logId), {
        id: logId,
        businessId,
        action: 'INVITATION_ACCEPTED',
        entityType: 'member',
        entityId: user.uid,
        summary: truncateString(`${cleanEmail} joined as ${inv.role}`, 300),
        actorId: user.uid,
        actorEmail: cleanEmail,
        createdAt: serverTimestamp(),
      });

      return businessId;
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateMemberRoleAtomic(
  businessId: string,
  actor: User,
  targetMember: BusinessMember,
  newRole: Exclude<UserRole, 'Owner'>,
  newStatus: 'active' | 'suspended'
): Promise<void> {
  const path = `businesses/${businessId}/members/${targetMember.userId}`;
  const batch = writeBatch(db);

  batch.update(doc(db, 'businesses', businessId, 'members', targetMember.userId), {
    role: newRole,
    status: newStatus,
    updatedAt: serverTimestamp(),
  });

  batch.update(doc(db, 'users', targetMember.userId, 'memberships', businessId), {
    role: newRole,
    updatedAt: serverTimestamp(),
  });

  const logId = generateId('log');
  batch.set(doc(db, 'businesses', businessId, 'auditLogs', logId), {
    id: logId,
    businessId,
    action: 'MEMBER_ROLE_UPDATED',
    entityType: 'member',
    entityId: targetMember.userId,
    summary: truncateString(
      `Updated ${targetMember.displayName} (${targetMember.email}) to ${newRole} [${newStatus}]`,
      300
    ),
    actorId: actor.uid,
    actorEmail: truncateString(actor.email || '', 150),
    createdAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function removeMemberAtomic(
  businessId: string,
  actor: User,
  targetMember: BusinessMember
): Promise<void> {
  const path = `businesses/${businessId}/members/${targetMember.userId}`;
  const batch = writeBatch(db);

  batch.delete(doc(db, 'businesses', businessId, 'members', targetMember.userId));
  batch.delete(doc(db, 'users', targetMember.userId, 'memberships', businessId));

  const logId = generateId('log');
  batch.set(doc(db, 'businesses', businessId, 'auditLogs', logId), {
    id: logId,
    businessId,
    action: 'MEMBER_REMOVED',
    entityType: 'member',
    entityId: targetMember.userId,
    summary: truncateString(`Removed ${targetMember.displayName} (${targetMember.email})`, 300),
    actorId: actor.uid,
    actorEmail: truncateString(actor.email || '', 150),
    createdAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function transferOwnershipAtomic(
  businessId: string,
  currentOwner: User,
  newOwner: BusinessMember
): Promise<void> {
  const path = `businesses/${businessId}`;
  const batch = writeBatch(db);

  batch.update(doc(db, 'businesses', businessId), {
    ownerId: newOwner.userId,
    updatedAt: serverTimestamp(),
  });

  batch.update(doc(db, 'businesses', businessId, 'members', newOwner.userId), {
    role: 'Owner',
    updatedAt: serverTimestamp(),
  });

  batch.update(doc(db, 'businesses', businessId, 'members', currentOwner.uid), {
    role: 'Administrator',
    updatedAt: serverTimestamp(),
  });

  batch.update(doc(db, 'users', newOwner.userId, 'memberships', businessId), {
    role: 'Owner',
    updatedAt: serverTimestamp(),
  });

  batch.update(doc(db, 'users', currentOwner.uid, 'memberships', businessId), {
    role: 'Administrator',
    updatedAt: serverTimestamp(),
  });

  const logId = generateId('log');
  batch.set(doc(db, 'businesses', businessId, 'auditLogs', logId), {
    id: logId,
    businessId,
    action: 'OWNERSHIP_TRANSFERRED',
    entityType: 'business',
    entityId: businessId,
    summary: truncateString(
      `Transferred ownership to ${newOwner.displayName} (${newOwner.email})`,
      300
    ),
    actorId: currentOwner.uid,
    actorEmail: truncateString(currentOwner.email || '', 150),
    createdAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// =============================================================================
// Controlled Legacy LocalStorage -> Firestore Migration
// =============================================================================

export interface MigrationReport {
  customersImported: number;
  productsImported: number;
  salesImported: number;
  expensesImported: number;
  paymentsImported: number;
  skippedDuplicates: number;
}

export async function migrateLegacyDataToBusiness(
  business: Business,
  user: User,
  legacy: {
    customers: Customer[];
    products: Product[];
    sales: Sale[];
    expenses: Expense[];
    debtPayments: DebtPayment[];
  },
  existingIds: {
    customerIds: Set<string>;
    productIds: Set<string>;
    saleIds: Set<string>;
    expenseIds: Set<string>;
    paymentIds: Set<string>;
  }
): Promise<MigrationReport> {
  const path = `businesses/${business.id}`;
  const operations: Array<(batch: ReturnType<typeof writeBatch>) => void> = [];
  const report: MigrationReport = {
    customersImported: 0,
    productsImported: 0,
    salesImported: 0,
    expensesImported: 0,
    paymentsImported: 0,
    skippedDuplicates: 0,
  };

  legacy.customers.forEach((c) => {
    const cid = sanitizeId(c.id || generateId('cust'), 'cust');
    if (existingIds.customerIds.has(cid)) {
      report.skippedDuplicates += 1;
      return;
    }
    report.customersImported += 1;
    operations.push((batch) => {
      const payload: Record<string, unknown> = {
        id: cid,
        businessId: business.id,
        name: truncateString(c.name || 'Customer', 120),
        phone: truncateString(c.phone || 'N/A', 40),
        balance: Math.max(0, Number(c.balance) || 0),
        totalSpent: Math.max(0, Number(c.totalSpent) || 0),
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (c.email?.trim()) payload.email = truncateString(c.email, 150);
      if (c.address?.trim()) payload.address = truncateString(c.address, 240);
      batch.set(doc(db, 'businesses', business.id, 'customers', cid), payload);
    });
  });

  legacy.products.forEach((p) => {
    const pid = sanitizeId(p.id || generateId('prod'), 'prod');
    if (existingIds.productIds.has(pid)) {
      report.skippedDuplicates += 1;
      return;
    }
    report.productsImported += 1;
    operations.push((batch) => {
      batch.set(doc(db, 'businesses', business.id, 'products', pid), {
        id: pid,
        businessId: business.id,
        name: truncateString(p.name || 'Product', 140),
        sku: truncateString(p.sku || pid.toUpperCase(), 60),
        category: truncateString(p.category || 'General', 60),
        costPrice: Math.max(0, Number(p.costPrice) || 0),
        sellingPrice: Math.max(0, Number(p.sellingPrice) || 0),
        quantity: Math.max(0, Number(p.quantity) || 0),
        minStockAlert: Math.max(0, Number(p.minStockAlert) || 0),
        unit: truncateString(p.unit || 'pcs', 24),
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      const movId = generateId('mov');
      batch.set(doc(db, 'businesses', business.id, 'inventoryMovements', movId), {
        id: movId,
        businessId: business.id,
        productId: pid,
        productName: truncateString(p.name || 'Product', 140),
        type: 'migration',
        quantityDelta: Math.max(0, Number(p.quantity) || 0),
        previousQty: 0,
        newQty: Math.max(0, Number(p.quantity) || 0),
        reason: 'Migrated from browser localStorage',
        createdBy: user.uid,
        createdAt: serverTimestamp(),
      });
    });
  });

  let maxInvoiceNum = business.nextInvoiceNumber;
  legacy.sales.forEach((s) => {
    const sid = sanitizeId(s.id || generateId('sale'), 'sale');
    if (existingIds.saleIds.has(sid)) {
      report.skippedDuplicates += 1;
      return;
    }
    if (!Array.isArray(s.items) || s.items.length === 0) {
      report.skippedDuplicates += 1;
      return;
    }
    const numMatch = s.invoiceNo?.match(/\d+/);
    if (numMatch) {
      const parsedNum = parseInt(numMatch[0], 10);
      if (parsedNum >= maxInvoiceNum) maxInvoiceNum = parsedNum + 1;
    }
    const total = Math.max(0, Number(s.total) || 0);
    const amountPaid =
      s.status === 'Paid' ? total : Math.max(0, Math.min(total, Number(s.amountPaid) || 0));

    report.salesImported += 1;
    operations.push((batch) => {
      const payload: Record<string, unknown> = {
        id: sid,
        businessId: business.id,
        invoiceNo: truncateString(s.invoiceNo || `#${maxInvoiceNum}`, 24),
        customerId: sanitizeId(s.customerId || 'cust-walkin', 'cust'),
        customerName: truncateString(s.customerName || 'Customer', 120),
        date: s.date || new Date().toISOString(),
        items: s.items.slice(0, 100).map((i) => ({
          productId: sanitizeId(i.productId || 'prod', 'prod'),
          name: truncateString(i.name || 'Item', 140),
          quantity: Math.max(1, Number(i.quantity) || 1),
          price: Math.max(0, Number(i.price) || 0),
          costPrice: Math.max(0, Number(i.costPrice) || 0),
        })),
        subtotal: Math.max(0, Number(s.subtotal) || total),
        discount: Math.max(0, Number(s.discount) || 0),
        total,
        status: s.status || 'Paid',
        amountPaid,
        paymentMethod: s.paymentMethod || 'Cash',
        type: s.type || 'sale',
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (s.notes?.trim()) payload.notes = truncateString(s.notes, 300);
      batch.set(doc(db, 'businesses', business.id, 'sales', sid), payload);
    });
  });

  legacy.expenses.forEach((e) => {
    const eid = sanitizeId(e.id || generateId('exp'), 'exp');
    if (existingIds.expenseIds.has(eid) || Number(e.amount) <= 0) {
      report.skippedDuplicates += 1;
      return;
    }
    report.expensesImported += 1;
    operations.push((batch) => {
      const payload: Record<string, unknown> = {
        id: eid,
        businessId: business.id,
        description: truncateString(e.description || 'Expense', 240),
        category: truncateString(e.category || 'Other', 60),
        amount: Math.max(0.01, Number(e.amount)),
        date: e.date || new Date().toISOString(),
        paymentMethod: e.paymentMethod || 'Cash',
        createdBy: user.uid,
        createdAt: serverTimestamp(),
      };
      if (e.reference?.trim()) payload.reference = truncateString(e.reference, 80);
      batch.set(doc(db, 'businesses', business.id, 'expenses', eid), payload);
    });
  });

  legacy.debtPayments.forEach((p) => {
    const pid = sanitizeId(p.id || generateId('pay'), 'pay');
    if (existingIds.paymentIds.has(pid) || Number(p.amount) <= 0) {
      report.skippedDuplicates += 1;
      return;
    }
    report.paymentsImported += 1;
    operations.push((batch) => {
      const payload: Record<string, unknown> = {
        id: pid,
        businessId: business.id,
        customerId: sanitizeId(p.customerId || 'cust-walkin', 'cust'),
        customerName: truncateString(p.customerName || 'Customer', 120),
        amount: Math.max(0.01, Number(p.amount)),
        date: p.date || new Date().toISOString(),
        method: p.method || 'Cash',
        idempotencyKey: sanitizeId(`mig-${pid}`, 'idem'),
        createdBy: user.uid,
        createdAt: serverTimestamp(),
      };
      if (p.note?.trim()) payload.note = truncateString(p.note, 240);
      batch.set(doc(db, 'businesses', business.id, 'payments', pid), payload);
    });
  });

  if (maxInvoiceNum > business.nextInvoiceNumber) {
    operations.push((batch) => {
      batch.update(doc(db, 'businesses', business.id), {
        nextInvoiceNumber: maxInvoiceNum,
        updatedAt: serverTimestamp(),
      });
    });
  }

  const logId = generateId('log');
  operations.push((batch) => {
    batch.set(doc(db, 'businesses', business.id, 'auditLogs', logId), {
      id: logId,
      businessId: business.id,
      action: 'LEGACY_DATA_MIGRATED',
      entityType: 'business',
      entityId: business.id,
      summary: truncateString(
        `Migrated ${report.customersImported} customers, ${report.productsImported} products, ${report.salesImported} sales, ${report.expensesImported} expenses`,
        300
      ),
      actorId: user.uid,
      actorEmail: truncateString(user.email || '', 150),
      createdAt: serverTimestamp(),
    });
  });

  // Execute in chunks of 5 operations so rule document lookups stay well below the 20-call batch cap
  try {
    const CHUNK = 5;
    for (let i = 0; i < operations.length; i += CHUNK) {
      const batch = writeBatch(db);
      operations.slice(i, i + CHUNK).forEach((fn) => fn(batch));
      await batch.commit();
    }
    return report;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
