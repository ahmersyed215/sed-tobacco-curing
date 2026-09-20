import {
  collection,
  collectionGroup,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  Timestamp,
  runTransaction,
  writeBatch,
  type DocumentData,
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import { BATCH_OP_LIMIT, commitBatchedOps, type BatchWriteOp } from '@/firebase/batchUtils';
import type {
  Installation,
  InstallationFormData,
  InstallationWithCalculations,
  Payment,
  PaymentFormData,
  DeviceType,
  ExcelImportRow,
  ImportResult,
} from '@/types';
import { RECEIPT_PREFIX } from '@/constants';
import {
  calculateAmounts,
  generateReceiptId,
  toDate,
  toTimestamp,
  withInstallationCalculations,
} from '@/utils';

const INSTALLATIONS = 'installations';
const PAYMENTS = 'payments';
const COUNTERS = 'counters';
const RECEIPT_COUNTER = 'receiptCounter';

function mapInstallation(id: string, data: DocumentData): Installation {
  return {
    id,
    deviceType: data.deviceType,
    deviceId: data.deviceId || undefined,
    farmerName: data.farmerName,
    farmerNumber: data.farmerNumber,
    farmerCNIC: data.farmerCNIC,
    region: data.region,
    depo: data.depo,
    location: data.location || undefined,
    sedRepresentative: data.sedRepresentative,
    ptcRepresentative: data.ptcRepresentative,
    installationDate: toDate(data.installationDate) ?? new Date(),
    totalAmount: data.totalAmount,
    followupDate: toDate(data.followupDate),
    latestReceiptId: data.latestReceiptId || undefined,
    createdAt: toDate(data.createdAt) ?? new Date(),
    updatedAt: toDate(data.updatedAt) ?? new Date(),
  };
}

function mapPayment(installationId: string, id: string, data: DocumentData): Payment {
  return {
    id,
    installationId,
    receiptId: data.receiptId,
    amount: data.amount,
    paymentDate: toDate(data.paymentDate) ?? new Date(),
    notes: data.notes || undefined,
    createdAt: toDate(data.createdAt) ?? new Date(),
    createdBy: data.createdBy,
  };
}

export async function fetchAllPayments(): Promise<Payment[]> {
  try {
    const snapshot = await getDocs(collectionGroup(db, PAYMENTS));
    return snapshot.docs.map((d) => {
      const installationId = d.ref.parent.parent?.id ?? '';
      return mapPayment(installationId, d.id, d.data());
    });
  } catch {
    return fetchAllPaymentsFallback();
  }
}

async function fetchAllPaymentsFallback(): Promise<Payment[]> {
  const installationsSnap = await getDocs(collection(db, INSTALLATIONS));
  const payments: Payment[] = [];

  await Promise.all(
    installationsSnap.docs.map(async (installationDoc) => {
      const paymentsSnap = await getDocs(
        collection(db, INSTALLATIONS, installationDoc.id, PAYMENTS),
      );
      paymentsSnap.docs.forEach((paymentDoc) => {
        payments.push(mapPayment(installationDoc.id, paymentDoc.id, paymentDoc.data()));
      });
    }),
  );

  return payments;
}

export async function fetchInstallationsWithCalculations(): Promise<InstallationWithCalculations[]> {
  const [installationsSnap, payments] = await Promise.all([
    getDocs(query(collection(db, INSTALLATIONS), orderBy('installationDate', 'desc'))),
    fetchAllPayments(),
  ]);

  const paymentsByInstallation = payments.reduce<Record<string, Payment[]>>((acc, payment) => {
    if (!acc[payment.installationId]) acc[payment.installationId] = [];
    acc[payment.installationId].push(payment);
    return acc;
  }, {});

  return installationsSnap.docs.map((docSnap) => {
    const installation = mapInstallation(docSnap.id, docSnap.data());
    const installationPayments = paymentsByInstallation[installation.id] ?? [];
    return withInstallationCalculations(installation, installationPayments);
  });
}

export async function fetchInstallationById(id: string): Promise<InstallationWithCalculations | null> {
  const docSnap = await getDoc(doc(db, INSTALLATIONS, id));
  if (!docSnap.exists()) return null;

  const installation = mapInstallation(docSnap.id, docSnap.data());
  const payments = await fetchPaymentsByInstallationId(id);
  return withInstallationCalculations(installation, payments);
}

export async function fetchPaymentsByInstallationId(installationId: string): Promise<Payment[]> {
  const snapshot = await getDocs(
    query(
      collection(db, INSTALLATIONS, installationId, PAYMENTS),
      orderBy('paymentDate', 'desc'),
    ),
  );
  return snapshot.docs.map((d) => mapPayment(installationId, d.id, d.data()));
}

export async function createInstallation(data: InstallationFormData, userEmail: string): Promise<string> {
  if (!userEmail.trim()) {
    throw new Error('You must be logged in to save installations.');
  }

  const now = Timestamp.now();
  const paidAmount = data.paidAmount ?? 0;
  const receiptId = data.receiptId?.trim() ?? '';

  if (!receiptId) {
    throw new Error('Receipt ID is required');
  }
  if (await checkReceiptIdExists(receiptId)) {
    throw new Error('Receipt ID already exists in the system');
  }

  if (paidAmount > data.totalAmount) {
    throw new Error('Paid amount cannot exceed total amount');
  }

  const batch = writeBatch(db);
  const docRef = doc(collection(db, INSTALLATIONS));
  const hasPayment = paidAmount > 0;

  batch.set(docRef, {
    deviceType: data.deviceType,
    deviceId: data.deviceId?.trim() || null,
    farmerName: data.farmerName.trim(),
    farmerNumber: data.farmerNumber.trim(),
    farmerCNIC: data.farmerCNIC.trim(),
    region: data.region,
    depo: data.depo?.trim() || '',
    location: data.location?.trim() || null,
    sedRepresentative: data.sedRepresentative.trim(),
    ptcRepresentative: data.ptcRepresentative?.trim() || '',
    installationDate: toTimestamp(data.installationDate),
    totalAmount: data.totalAmount,
    followupDate: toTimestamp(data.followupDate ?? null),
    latestReceiptId: receiptId,
    createdAt: now,
    updatedAt: now,
  });

  if (hasPayment) {
    const paymentRef = doc(collection(db, INSTALLATIONS, docRef.id, PAYMENTS));
    batch.set(paymentRef, {
      receiptId,
      amount: paidAmount,
      paymentDate: toTimestamp(data.installationDate),
      notes: 'Initial payment',
      createdAt: now,
      createdBy: userEmail,
    });
  }

  await batch.commit();
  return docRef.id;
}

export async function updateInstallation(id: string, data: InstallationFormData): Promise<void> {
  await updateDoc(doc(db, INSTALLATIONS, id), {
    deviceType: data.deviceType,
    deviceId: data.deviceId?.trim() || null,
    farmerName: data.farmerName.trim(),
    farmerNumber: data.farmerNumber.trim(),
    farmerCNIC: data.farmerCNIC.trim(),
    region: data.region,
    depo: data.depo,
    location: data.location?.trim() || null,
    sedRepresentative: data.sedRepresentative.trim(),
    ptcRepresentative: data.ptcRepresentative?.trim() || '',
    installationDate: toTimestamp(data.installationDate),
    totalAmount: data.totalAmount,
    followupDate: toTimestamp(data.followupDate ?? null),
    updatedAt: Timestamp.now(),
  });
}

export async function deleteInstallation(id: string): Promise<void> {
  const payments = await fetchPaymentsByInstallationId(id);
  const batch = writeBatch(db);

  payments.forEach((payment) => {
    batch.delete(doc(db, INSTALLATIONS, id, PAYMENTS, payment.id));
  });
  batch.delete(doc(db, INSTALLATIONS, id));
  await batch.commit();
}

export async function updateFollowupDate(id: string, followupDate: Date | null): Promise<void> {
  await updateDoc(doc(db, INSTALLATIONS, id), {
    followupDate: toTimestamp(followupDate),
    updatedAt: Timestamp.now(),
  });
}

export async function checkReceiptIdExists(receiptId: string, excludePaymentId?: string): Promise<boolean> {
  const normalized = receiptId.trim();
  if (!normalized) return false;

  try {
    const snapshot = await getDocs(
      query(collectionGroup(db, PAYMENTS), where('receiptId', '==', normalized)),
    );

    if (excludePaymentId) {
      return snapshot.docs.some((d) => d.id !== excludePaymentId);
    }
    return !snapshot.empty;
  } catch {
    const payments = await fetchAllPaymentsFallback();
    return payments.some(
      (payment) => payment.receiptId === normalized && payment.id !== excludePaymentId,
    );
  }
}

/** True when the receipt is used on a different installation (same receipt on one installation is allowed). */
export async function checkReceiptIdUsedElsewhere(
  receiptId: string,
  installationId: string,
  excludePaymentId?: string,
): Promise<boolean> {
  const normalized = receiptId.trim();
  if (!normalized) return false;

  try {
    const snapshot = await getDocs(
      query(collectionGroup(db, PAYMENTS), where('receiptId', '==', normalized)),
    );

    return snapshot.docs.some((paymentDoc) => {
      if (excludePaymentId && paymentDoc.id === excludePaymentId) return false;
      const parentInstallationId = paymentDoc.ref.parent.parent?.id;
      return parentInstallationId !== installationId;
    });
  } catch {
    const payments = await fetchAllPaymentsFallback();
    return payments.some(
      (payment) =>
        payment.receiptId === normalized &&
        payment.installationId !== installationId &&
        payment.id !== excludePaymentId,
    );
  }
}

export async function generateNextReceiptId(deviceType: DeviceType): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = RECEIPT_PREFIX[deviceType];
  const counterRef = doc(db, COUNTERS, RECEIPT_COUNTER);

  return runTransaction(db, async (transaction) => {
    const counterSnap = await transaction.get(counterRef);
    const data = counterSnap.exists() ? counterSnap.data() : {};
    const yearKey = String(year);
    const prefixKey = `${prefix}_${yearKey}`;
    const current = (data[prefixKey] as number) ?? 0;
    const next = current + 1;

    transaction.set(
      counterRef,
      { [prefixKey]: next, updatedAt: Timestamp.now() },
      { merge: true },
    );

    return generateReceiptId(prefix, year, next);
  });
}

/** Read-only preview of the next receipt ID (does not increment the counter). */
export async function previewNextReceiptId(deviceType: DeviceType): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = RECEIPT_PREFIX[deviceType];
  const counterSnap = await getDoc(doc(db, COUNTERS, RECEIPT_COUNTER));
  const data = counterSnap.exists() ? counterSnap.data() : {};
  const prefixKey = `${prefix}_${year}`;
  const current = (data[prefixKey] as number) ?? 0;

  return generateReceiptId(prefix, year, current + 1);
}

async function syncLatestReceiptId(installationId: string): Promise<void> {
  const payments = await fetchPaymentsByInstallationId(installationId);
  // Only update from payments when at least one exists — unpaid imports keep
  // the receipt ID stored on the installation document.
  if (payments.length === 0) return;

  const { latestReceiptId } = calculateAmounts(0, payments);

  await updateDoc(doc(db, INSTALLATIONS, installationId), {
    latestReceiptId: latestReceiptId ?? null,
    updatedAt: Timestamp.now(),
  });
}

export async function addPayment(
  installationId: string,
  data: PaymentFormData,
  userEmail: string,
): Promise<void> {
  const receiptId = data.receiptId?.trim() ?? '';

  if (!receiptId) {
    throw new Error('Receipt ID is required');
  }

  const usedElsewhere = await checkReceiptIdUsedElsewhere(receiptId, installationId);
  if (usedElsewhere) {
    throw new Error('Receipt ID is already used on another installation');
  }

  await addDoc(collection(db, INSTALLATIONS, installationId, PAYMENTS), {
    receiptId,
    amount: data.amount,
    paymentDate: toTimestamp(data.paymentDate),
    notes: data.notes?.trim() || null,
    createdAt: Timestamp.now(),
    createdBy: userEmail,
  });

  await syncLatestReceiptId(installationId);
}

export async function updatePayment(
  installationId: string,
  paymentId: string,
  data: PaymentFormData,
): Promise<void> {
  const receiptId = data.receiptId?.trim() ?? '';

  if (!receiptId) {
    throw new Error('Receipt ID is required');
  }

  const usedElsewhere = await checkReceiptIdUsedElsewhere(receiptId, installationId, paymentId);
  if (usedElsewhere) {
    throw new Error('Receipt ID is already used on another installation');
  }

  await updateDoc(doc(db, INSTALLATIONS, installationId, PAYMENTS, paymentId), {
    receiptId,
    amount: data.amount,
    paymentDate: toTimestamp(data.paymentDate),
    notes: data.notes?.trim() || null,
  });

  await syncLatestReceiptId(installationId);
}

export async function deletePayment(installationId: string, paymentId: string): Promise<void> {
  await deleteDoc(doc(db, INSTALLATIONS, installationId, PAYMENTS, paymentId));
  await syncLatestReceiptId(installationId);
}

type ExistingReceiptMatch = {
  installationId: string;
  createdAt: Date;
  payments: Payment[];
};

/**
 * Build receiptId → installation match. Receipt ID is the unique import key.
 * Payments with the same receipt on different installations are treated as a conflict.
 */
export async function buildReceiptImportIndex(): Promise<Map<string, ExistingReceiptMatch>> {
  const [installationsSnap, payments] = await Promise.all([
    getDocs(collection(db, INSTALLATIONS)),
    fetchAllPayments(),
  ]);

  const installationsById = new Map(
    installationsSnap.docs.map((d) => [d.id, mapInstallation(d.id, d.data())]),
  );
  const index = new Map<string, ExistingReceiptMatch>();

  for (const payment of payments) {
    const receiptId = payment.receiptId?.trim();
    if (!receiptId) continue;

    const existing = index.get(receiptId);
    if (existing) {
      if (existing.installationId !== payment.installationId) {
        throw new Error(
          `Receipt ID "${receiptId}" is linked to multiple installations. Fix the data before importing.`,
        );
      }
      existing.payments.push(payment);
      continue;
    }

    const installation = installationsById.get(payment.installationId);
    index.set(receiptId, {
      installationId: payment.installationId,
      createdAt: installation?.createdAt ?? payment.createdAt,
      payments: [payment],
    });
  }

  // Installations with a receipt but no payment docs yet
  for (const installation of installationsById.values()) {
    const receiptId = installation.latestReceiptId?.trim();
    if (!receiptId || index.has(receiptId)) continue;
    index.set(receiptId, {
      installationId: installation.id,
      createdAt: installation.createdAt,
      payments: [],
    });
  }

  return index;
}

export async function importInstallations(
  rows: ExcelImportRow[],
  userEmail: string,
  onProgress?: (done: number, total: number) => void,
  existingByReceipt?: Map<string, ExistingReceiptMatch>,
): Promise<ImportResult> {
  if (!userEmail.trim()) {
    throw new Error('You must be logged in to import records.');
  }

  const receiptIndex = existingByReceipt ?? (await buildReceiptImportIndex());
  const now = Timestamp.now();
  const ops: BatchWriteOp[] = [];
  let created = 0;
  let updated = 0;

  rows.forEach((row) => {
    const paidAmount = row.paidAmount ?? 0;
    const recoveredAmount = row.recoveredAmount ?? 0;
    const receiptId = row.receiptId?.trim() ?? '';
    if (!receiptId) {
      throw new Error('Receipt ID is required on every imported installation');
    }

    const existing = receiptIndex.get(receiptId);
    const isUpdate = !!existing;
    const docRef = existing
      ? doc(db, INSTALLATIONS, existing.installationId)
      : doc(collection(db, INSTALLATIONS));

    if (isUpdate) {
      updated += 1;
      // Replace only payments for this receipt; leave other receipts on the install intact.
      existing.payments.forEach((payment) => {
        ops.push({
          type: 'delete',
          ref: doc(db, INSTALLATIONS, existing.installationId, PAYMENTS, payment.id),
        });
      });
    } else {
      created += 1;
    }

    const hasPaidPayment = paidAmount > 0;
    const hasRecoveredPayment = recoveredAmount > 0;

    ops.push({
      type: 'set',
      ref: docRef,
      data: {
        deviceType: row.deviceType,
        deviceId: row.deviceId?.trim() || null,
        farmerName: row.farmerName.trim(),
        farmerNumber: row.farmerNumber.trim(),
        farmerCNIC: row.farmerCNIC.trim(),
        region: row.region,
        depo: row.depo,
        location: row.location?.trim() || null,
        sedRepresentative: row.sedRepresentative.trim(),
        ptcRepresentative: row.ptcRepresentative.trim(),
        installationDate: toTimestamp(row.installationDate),
        totalAmount: row.totalAmount,
        followupDate: toTimestamp(row.followupDate ?? null),
        latestReceiptId: receiptId,
        createdAt: isUpdate ? toTimestamp(existing.createdAt) : now,
        updatedAt: now,
      },
    });

    if (hasPaidPayment) {
      const paymentRef = doc(collection(db, INSTALLATIONS, docRef.id, PAYMENTS));
      ops.push({
        type: 'set',
        ref: paymentRef,
        data: {
          receiptId,
          amount: paidAmount,
          paymentDate: toTimestamp(row.installationDate),
          notes: 'Imported from Excel',
          createdAt: now,
          createdBy: userEmail,
        },
      });
    }

    if (hasRecoveredPayment) {
      const recoveredRef = doc(collection(db, INSTALLATIONS, docRef.id, PAYMENTS));
      ops.push({
        type: 'set',
        ref: recoveredRef,
        data: {
          receiptId,
          amount: recoveredAmount,
          paymentDate: toTimestamp(row.installationDate),
          notes: 'Recovered amount',
          createdAt: now,
          createdBy: userEmail,
        },
      });
    }
  });

  let lastReportedRows = 0;
  await commitBatchedOps(ops, {
    batchSize: BATCH_OP_LIMIT,
    onProgress: onProgress
      ? (doneOps, totalOps) => {
          const doneRows = Math.min(
            rows.length,
            Math.round((doneOps / Math.max(totalOps, 1)) * rows.length),
          );
          if (doneRows !== lastReportedRows) {
            lastReportedRows = doneRows;
            onProgress(doneRows, rows.length);
          }
        }
      : undefined,
  });

  onProgress?.(rows.length, rows.length);
  return { created, updated, total: rows.length };
}

export async function fetchUniqueRepresentatives(): Promise<{
  sed: string[];
  ptc: string[];
}> {
  const installations = await fetchInstallationsWithCalculations();
  const sed = [...new Set(installations.map((i) => i.sedRepresentative).filter(Boolean))].sort();
  const ptc = [...new Set(installations.map((i) => i.ptcRepresentative).filter(Boolean))].sort();
  return { sed, ptc };
}
