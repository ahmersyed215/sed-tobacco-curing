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
import type {
  Installation,
  InstallationFormData,
  InstallationWithCalculations,
  Payment,
  PaymentFormData,
  DeviceType,
  ExcelImportRow,
} from '@/types';
import { RECEIPT_PREFIX } from '@/constants';
import {
  calculateAmounts,
  generateReceiptId,
  toDate,
  toTimestamp,
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
    const calculations = calculateAmounts(installation.totalAmount, installationPayments);

    return {
      ...installation,
      ...calculations,
    };
  });
}

export async function fetchInstallationById(id: string): Promise<InstallationWithCalculations | null> {
  const docSnap = await getDoc(doc(db, INSTALLATIONS, id));
  if (!docSnap.exists()) return null;

  const installation = mapInstallation(docSnap.id, docSnap.data());
  const payments = await fetchPaymentsByInstallationId(id);
  const calculations = calculateAmounts(installation.totalAmount, payments);

  return { ...installation, ...calculations };
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

export async function importInstallations(rows: ExcelImportRow[], userEmail: string): Promise<number> {
  if (!userEmail.trim()) {
    throw new Error('You must be logged in to import records.');
  }

  // Each row may create an installation + payment (2 writes). Firestore batch limit is 500.
  const batchSize = 200;
  let imported = 0;

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = writeBatch(db);
    const chunk = rows.slice(i, i + batchSize);
    const now = Timestamp.now();

    chunk.forEach((row) => {
      const docRef = doc(collection(db, INSTALLATIONS));
      const paidAmount = row.paidAmount ?? 0;
      const receiptId = row.receiptId?.trim();
      const hasPayment = paidAmount > 0 && !!receiptId;

      batch.set(docRef, {
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
        latestReceiptId: hasPayment ? receiptId : null,
        createdAt: now,
        updatedAt: now,
      });

      if (hasPayment) {
        const paymentRef = doc(collection(db, INSTALLATIONS, docRef.id, PAYMENTS));
        batch.set(paymentRef, {
          receiptId,
          amount: paidAmount,
          paymentDate: toTimestamp(row.installationDate),
          notes: 'Imported from Excel',
          createdAt: now,
          createdBy: userEmail,
        });
      }
    });

    await batch.commit();
    imported += chunk.length;
  }

  return imported;
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
