import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  setDoc,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import { fetchUserById } from './usersService';

const INSTALLATIONS = 'installations';
const PAYMENTS = 'payments';
const COUNTERS = 'counters';
const RECEIPT_COUNTER = 'receiptCounter';
const BATCH_LIMIT = 450;

async function assertAdmin(uid: string): Promise<void> {
  const profile = await fetchUserById(uid);
  if (!profile || profile.role !== 'admin') {
    throw new Error('Only administrators can perform this action.');
  }
}

export async function deleteAllApplicationData(actorUid: string): Promise<{
  installations: number;
  payments: number;
}> {
  await assertAdmin(actorUid);

  const installationsSnap = await getDocs(collection(db, INSTALLATIONS));
  let paymentCount = 0;
  let installationCount = 0;

  for (const installationDoc of installationsSnap.docs) {
    const paymentsSnap = await getDocs(
      collection(db, INSTALLATIONS, installationDoc.id, PAYMENTS),
    );
    paymentCount += paymentsSnap.size;

    const paymentDocs = paymentsSnap.docs;
    for (let i = 0; i < paymentDocs.length; i += BATCH_LIMIT) {
      const batch = writeBatch(db);
      paymentDocs.slice(i, i + BATCH_LIMIT).forEach((paymentDoc) => {
        batch.delete(paymentDoc.ref);
      });
      await batch.commit();
    }

    await deleteDoc(installationDoc.ref);
    installationCount += 1;
  }

  await setDoc(doc(db, COUNTERS, RECEIPT_COUNTER), {
    updatedAt: Timestamp.now(),
  });

  return { installations: installationCount, payments: paymentCount };
}
