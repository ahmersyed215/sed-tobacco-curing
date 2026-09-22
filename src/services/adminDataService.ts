import {
  collection,
  collectionGroup,
  doc,
  getDocs,
  setDoc,
  Timestamp,
  type DocumentReference,
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import { commitBatchedDeletes, type BatchProgressCallback } from '@/firebase/batchUtils';
import { fetchUserById } from './usersService';

const INSTALLATIONS = 'installations';
const PAYMENTS = 'payments';
const COUNTERS = 'counters';
const RECEIPT_COUNTER = 'receiptCounter';
const PAYMENT_READ_CONCURRENCY = 10;

async function assertAdmin(uid: string): Promise<void> {
  const profile = await fetchUserById(uid);
  if (!profile || profile.role !== 'super_admin') {
    throw new Error('Only a super admin can perform this action.');
  }
}

async function collectPaymentRefsFallback(
  installationIds: string[],
): Promise<DocumentReference[]> {
  const refs: DocumentReference[] = [];

  for (let i = 0; i < installationIds.length; i += PAYMENT_READ_CONCURRENCY) {
    const wave = installationIds.slice(i, i + PAYMENT_READ_CONCURRENCY);
    const snaps = await Promise.all(
      wave.map((id) => getDocs(collection(db, INSTALLATIONS, id, PAYMENTS))),
    );
    snaps.forEach((snap) => {
      snap.docs.forEach((paymentDoc) => {
        refs.push(paymentDoc.ref);
      });
    });
  }

  return refs;
}

export async function deleteAllApplicationData(
  actorUid: string,
  onProgress?: BatchProgressCallback,
): Promise<{
  installations: number;
  payments: number;
}> {
  await assertAdmin(actorUid);

  const installationsSnap = await getDocs(collection(db, INSTALLATIONS));
  const installationRefs = installationsSnap.docs.map((d) => d.ref);
  const installationCount = installationRefs.length;

  let paymentRefs: DocumentReference[];
  try {
    const paymentsSnap = await getDocs(collectionGroup(db, PAYMENTS));
    paymentRefs = paymentsSnap.docs.map((d) => d.ref);
  } catch {
    paymentRefs = await collectPaymentRefsFallback(
      installationsSnap.docs.map((d) => d.id),
    );
  }

  const paymentCount = paymentRefs.length;
  const allRefs = [...paymentRefs, ...installationRefs];

  await commitBatchedDeletes(allRefs, { onProgress });

  await setDoc(doc(db, COUNTERS, RECEIPT_COUNTER), {
    updatedAt: Timestamp.now(),
  });

  return { installations: installationCount, payments: paymentCount };
}
