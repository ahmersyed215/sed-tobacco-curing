import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  where,
  type DocumentData,
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import type {
  Expense,
  ExpenseFormData,
  ExpenseInflow,
  ExpenseInflowFormData,
  ExpenseSubtype,
  ExpenseType,
  ManagerWalletSummary,
} from '@/types';
import { toDate } from '@/utils';

const EXPENSES = 'expenses';
const INFLOWS = 'expenseInflows';

export type ExpenseVisibility =
  | { mode: 'all' }
  | { mode: 'wallet'; uid: string }
  | { mode: 'created'; uid: string };

function mapExpense(id: string, data: DocumentData): Expense {
  return {
    id,
    type: (data.type ?? 'MISCELLANEOUS') as ExpenseType,
    subtype: (data.subtype || undefined) as ExpenseSubtype | undefined,
    expenseDate: toDate(data.expenseDate) ?? new Date(),
    amount: Number(data.amount ?? 0),
    note: data.note ?? '',
    sedRepresentative: data.sedRepresentative || undefined,
    region: data.region || undefined,
    depo: data.depo || undefined,
    walletManagerUid: data.walletManagerUid ?? '',
    walletManagerName: data.walletManagerName ?? '',
    createdByUid: data.createdByUid ?? '',
    createdByName: data.createdByName ?? '',
    createdAt: toDate(data.createdAt) ?? new Date(),
    updatedAt: toDate(data.updatedAt) ?? new Date(),
  };
}

function mapInflow(id: string, data: DocumentData): ExpenseInflow {
  return {
    id,
    walletManagerUid: data.walletManagerUid ?? '',
    walletManagerName: data.walletManagerName ?? '',
    amount: Number(data.amount ?? 0),
    inflowDate: toDate(data.inflowDate) ?? new Date(),
    note: data.note ?? '',
    createdByUid: data.createdByUid ?? '',
    createdByName: data.createdByName ?? '',
    createdAt: toDate(data.createdAt) ?? new Date(),
    updatedAt: toDate(data.updatedAt) ?? new Date(),
  };
}

function expensePayload(data: ExpenseFormData) {
  const hideLocation = data.type === 'FOOD' && data.subtype === 'OFFICE';
  return {
    type: data.type,
    subtype: data.subtype || null,
    expenseDate: Timestamp.fromDate(data.expenseDate),
    amount: data.amount,
    note: data.note?.trim() || '',
    sedRepresentative: data.sedRepresentative?.trim() || null,
    region: hideLocation ? null : data.region?.trim() || null,
    depo: hideLocation ? null : data.depo?.trim() || null,
    walletManagerUid: data.walletManagerUid,
    walletManagerName: data.walletManagerName.trim(),
  };
}

export async function fetchExpenses(visibility: ExpenseVisibility): Promise<Expense[]> {
  const expenses = collection(db, EXPENSES);
  let snapshot;

  if (visibility.mode === 'all') {
    snapshot = await getDocs(query(expenses, orderBy('expenseDate', 'desc')));
  } else if (visibility.mode === 'wallet') {
    snapshot = await getDocs(query(expenses, where('walletManagerUid', '==', visibility.uid)));
  } else {
    snapshot = await getDocs(query(expenses, where('createdByUid', '==', visibility.uid)));
  }

  return snapshot.docs
    .map((docSnap) => mapExpense(docSnap.id, docSnap.data()))
    .sort((a, b) => b.expenseDate.getTime() - a.expenseDate.getTime());
}

export async function createExpense(
  data: ExpenseFormData,
  actor: { uid: string; name: string },
): Promise<string> {
  const now = Timestamp.now();
  const ref = await addDoc(collection(db, EXPENSES), {
    ...expensePayload(data),
    createdByUid: actor.uid,
    createdByName: actor.name,
    createdAt: now,
    updatedAt: now,
  });
  return ref.id;
}

export async function updateExpense(id: string, data: ExpenseFormData): Promise<void> {
  await updateDoc(doc(db, EXPENSES, id), {
    ...expensePayload(data),
    updatedAt: Timestamp.now(),
  });
}

export async function deleteExpense(id: string): Promise<void> {
  await deleteDoc(doc(db, EXPENSES, id));
}

export async function fetchExpenseInflows(visibility: ExpenseVisibility): Promise<ExpenseInflow[]> {
  const inflows = collection(db, INFLOWS);
  let snapshot;

  if (visibility.mode === 'all') {
    snapshot = await getDocs(query(inflows, orderBy('inflowDate', 'desc')));
  } else if (visibility.mode === 'wallet') {
    snapshot = await getDocs(query(inflows, where('walletManagerUid', '==', visibility.uid)));
  } else {
    snapshot = await getDocs(query(inflows, where('createdByUid', '==', visibility.uid)));
  }

  return snapshot.docs
    .map((docSnap) => mapInflow(docSnap.id, docSnap.data()))
    .sort((a, b) => b.inflowDate.getTime() - a.inflowDate.getTime());
}

export async function createExpenseInflow(
  data: ExpenseInflowFormData,
  actor: { uid: string; name: string },
): Promise<string> {
  const now = Timestamp.now();
  const ref = await addDoc(collection(db, INFLOWS), {
    walletManagerUid: data.walletManagerUid,
    walletManagerName: data.walletManagerName.trim(),
    amount: data.amount,
    inflowDate: Timestamp.fromDate(data.inflowDate),
    note: data.note.trim(),
    createdByUid: actor.uid,
    createdByName: actor.name,
    createdAt: now,
    updatedAt: now,
  });
  return ref.id;
}

export async function updateExpenseInflow(id: string, data: ExpenseInflowFormData): Promise<void> {
  await updateDoc(doc(db, INFLOWS, id), {
    walletManagerUid: data.walletManagerUid,
    walletManagerName: data.walletManagerName.trim(),
    amount: data.amount,
    inflowDate: Timestamp.fromDate(data.inflowDate),
    note: data.note.trim(),
    updatedAt: Timestamp.now(),
  });
}

export async function deleteExpenseInflow(id: string): Promise<void> {
  await deleteDoc(doc(db, INFLOWS, id));
}

export function computeWalletSummaries(
  expenses: Expense[],
  inflows: ExpenseInflow[],
): ManagerWalletSummary[] {
  const map = new Map<string, ManagerWalletSummary>();

  const ensure = (uid: string, name: string) => {
    let row = map.get(uid);
    if (!row) {
      row = {
        walletManagerUid: uid,
        walletManagerName: name,
        totalOutflow: 0,
        totalInflow: 0,
        debt: 0,
      };
      map.set(uid, row);
    } else if (name && !row.walletManagerName) {
      row.walletManagerName = name;
    }
    return row;
  };

  for (const expense of expenses) {
    if (!expense.walletManagerUid) continue;
    const row = ensure(expense.walletManagerUid, expense.walletManagerName);
    row.totalOutflow += expense.amount;
  }

  for (const inflow of inflows) {
    if (!inflow.walletManagerUid) continue;
    const row = ensure(inflow.walletManagerUid, inflow.walletManagerName);
    row.totalInflow += inflow.amount;
  }

  return [...map.values()]
    .map((row) => ({
      ...row,
      debt: Math.max(0, row.totalOutflow - row.totalInflow),
    }))
    .sort((a, b) => a.walletManagerName.localeCompare(b.walletManagerName));
}
