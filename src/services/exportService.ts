import * as XLSX from 'xlsx';
import type { ExcelImportRow, ImportValidationError } from '@/types';
import { REGIONS } from '@/constants';
import { normalizeDeviceType, parseImportDate } from '@/utils';
import { importInstallations, checkReceiptIdExists } from './installationService';

function parseNumber(value: unknown): number | null {
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value.replace(/,/g, ''));
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

function getCell(row: Record<string, unknown>, key: string): unknown {
  if (key in row) return row[key];

  const normalizedKey = key.trim().toLowerCase();
  const match = Object.keys(row).find((column) => column.trim().toLowerCase() === normalizedKey);
  return match ? row[match] : undefined;
}

export function parseExcelFile(file: File): Promise<Record<string, unknown>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
        resolve(rows);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

function getPaidAmount(row: Record<string, unknown>): number | null {
  return (
    parseNumber(getCell(row, 'Paid Amount')) ??
    parseNumber(getCell(row, 'Amount Received')) ??
    parseNumber(getCell(row, 'Paid amount'))
  );
}

export function validateImportRows(rows: Record<string, unknown>[]): {
  validRows: ExcelImportRow[];
  errors: ImportValidationError[];
} {
  const validRows: ExcelImportRow[] = [];
  const errors: ImportValidationError[] = [];
  const receiptIdsInFile = new Map<string, number>();

  rows.forEach((row, index) => {
    const rowNum = index + 2;
    const deviceTypeRaw = String(getCell(row, 'Device Type') ?? '').trim();
    const deviceType = normalizeDeviceType(deviceTypeRaw);

    if (!deviceType) {
      errors.push({ row: rowNum, field: 'Device Type', message: 'Invalid device type' });
      return;
    }

    const farmerName = String(getCell(row, 'Farmer Name') ?? '').trim();
    const farmerNumber = String(getCell(row, 'Farmer Number') ?? '').trim();
    const farmerCNIC = String(getCell(row, 'Farmer CNIC') ?? '').trim();
    const region = String(getCell(row, 'Region') ?? '').trim();
    const depo = String(getCell(row, 'Depo') ?? '').trim();
    const sedRepresentative = String(getCell(row, 'SED Representative') ?? '').trim();
    const ptcRepresentative = String(getCell(row, 'PTC Representative') ?? '').trim();
    const installationDate = parseImportDate(getCell(row, 'Installation Date'));
    const totalAmount = parseNumber(getCell(row, 'Total Amount'));
    const followupDate = parseImportDate(getCell(row, 'Followup Date'));
    const receiptId = String(getCell(row, 'Receipt ID') ?? getCell(row, 'Latest Receipt ID') ?? '').trim();
    const paidAmount = getPaidAmount(row);

    if (!farmerName) errors.push({ row: rowNum, field: 'Farmer Name', message: 'Required' });
    if (!farmerNumber) errors.push({ row: rowNum, field: 'Farmer Number', message: 'Required' });
    if (!farmerCNIC) errors.push({ row: rowNum, field: 'Farmer CNIC', message: 'Required' });
    if (!region || !(region in REGIONS)) {
      errors.push({ row: rowNum, field: 'Region', message: 'Invalid region' });
    }
    if (!sedRepresentative) errors.push({ row: rowNum, field: 'SED Representative', message: 'Required' });
    if (!installationDate) {
      errors.push({
        row: rowNum,
        field: 'Installation Date',
        message: 'Invalid date — use DD/MM/YYYY (e.g. 19/06/2026)',
      });
    }
    if (totalAmount === null || totalAmount < 0) {
      errors.push({ row: rowNum, field: 'Total Amount', message: 'Invalid amount' });
    }
    if (paidAmount !== null && paidAmount < 0) {
      errors.push({ row: rowNum, field: 'Paid Amount', message: 'Cannot be negative' });
    }
    if (
      paidAmount !== null &&
      totalAmount !== null &&
      paidAmount > totalAmount
    ) {
      errors.push({
        row: rowNum,
        field: 'Paid Amount',
        message: 'Paid amount cannot exceed total amount',
      });
    }
    if ((paidAmount ?? 0) > 0 && !receiptId) {
      errors.push({
        row: rowNum,
        field: 'Receipt ID',
        message: 'Required when a paid amount is provided',
      });
    }
    if (receiptId && (paidAmount ?? 0) > 0) {
      const duplicateRow = receiptIdsInFile.get(receiptId);
      if (duplicateRow) {
        errors.push({
          row: rowNum,
          field: 'Receipt ID',
          message: `Duplicate receipt ID (also used on row ${duplicateRow})`,
        });
      } else {
        receiptIdsInFile.set(receiptId, rowNum);
      }
    }

    if (errors.some((e) => e.row === rowNum)) return;

    validRows.push({
      deviceType,
      deviceId: String(getCell(row, 'Device ID') ?? '').trim() || undefined,
      farmerName,
      farmerNumber,
      farmerCNIC,
      region,
      depo,
      location: String(getCell(row, 'Location') ?? '').trim() || undefined,
      sedRepresentative,
      ptcRepresentative: ptcRepresentative || '',
      installationDate: installationDate!,
      totalAmount: totalAmount!,
      receiptId: receiptId || undefined,
      paidAmount: paidAmount && paidAmount > 0 ? paidAmount : undefined,
      followupDate,
    });
  });

  return { validRows, errors };
}

export async function confirmImport(rows: ExcelImportRow[], userEmail: string): Promise<number> {
  if (!userEmail.trim()) {
    throw new Error('You must be logged in to import records.');
  }

  const receiptIds = rows
    .filter((row) => row.receiptId && (row.paidAmount ?? 0) > 0)
    .map((row) => row.receiptId!.trim());

  try {
    for (const receiptId of receiptIds) {
      const exists = await checkReceiptIdExists(receiptId);
      if (exists) {
        throw new Error(`Receipt ID already exists in the system: ${receiptId}`);
      }
    }
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error) {
      const code = String((error as { code: string }).code);
      if (code === 'permission-denied') {
        throw new Error(
          'Permission denied reading receipts. Run: firebase deploy --only firestore',
        );
      }
    }
    throw error;
  }

  try {
    return await importInstallations(rows, userEmail);
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error) {
      const code = String((error as { code: string }).code);
      if (code === 'permission-denied') {
        throw new Error(
          'Permission denied writing imports. Run: firebase deploy --only firestore and sign in as an admin.',
        );
      }
    }
    throw error;
  }
}

export function exportToExcel<T extends Record<string, unknown>>(
  data: T[],
  sheetName: string,
  fileName: string,
): void {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
}

export function exportToCsv<T extends Record<string, unknown>>(
  data: T[],
  fileName: string,
): void {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(worksheet);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${fileName}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function mapInstallationsForExport(installations: {
  deviceType: string;
  deviceId?: string;
  farmerName: string;
  farmerNumber: string;
  farmerCNIC: string;
  region: string;
  depo: string;
  location?: string;
  sedRepresentative: string;
  ptcRepresentative: string;
  installationDate: Date;
  totalAmount: number;
  amountReceived: number;
  amountPending: number;
  latestReceiptId?: string;
  followupDate?: Date;
  paymentStatus: string;
}[]) {
  return installations.map((i) => ({
    'Device Type': i.deviceType,
    'Device ID': i.deviceId ?? '',
    'Farmer Name': i.farmerName,
    'Farmer Number': i.farmerNumber,
    'Farmer CNIC': i.farmerCNIC,
    Region: i.region,
    Depo: i.depo,
    Location: i.location ?? '',
    'SED Representative': i.sedRepresentative,
    'PTC Representative': i.ptcRepresentative,
    'Installation Date': i.installationDate.toISOString().split('T')[0],
    'Total Amount': i.totalAmount,
    'Amount Received': i.amountReceived,
    'Amount Pending': i.amountPending,
    'Latest Receipt ID': i.latestReceiptId ?? '',
    'Followup Date': i.followupDate ? i.followupDate.toISOString().split('T')[0] : '',
    Status: i.paymentStatus,
  }));
}

export function mapFollowupsForExport(installations: {
  farmerName: string;
  farmerNumber: string;
  region: string;
  depo: string;
  sedRepresentative: string;
  ptcRepresentative: string;
  amountPending: number;
  followupDate?: Date;
}[]) {
  return installations.map((i) => ({
    'Farmer Name': i.farmerName,
    'Phone Number': i.farmerNumber,
    Region: i.region,
    Depo: i.depo,
    'SED Representative': i.sedRepresentative,
    'PTC Representative': i.ptcRepresentative,
    'Pending Amount': i.amountPending,
    'Followup Date': i.followupDate ? i.followupDate.toISOString().split('T')[0] : '',
  }));
}

export function mapPaymentsForExport(payments: {
  receiptId: string;
  paymentDate: Date;
  amount: number;
  notes?: string;
  createdBy: string;
  farmerName?: string;
}[]) {
  return payments.map((p) => ({
    'Receipt ID': p.receiptId,
    'Payment Date': p.paymentDate.toISOString().split('T')[0],
    Amount: p.amount,
    Notes: p.notes ?? '',
    'Created By': p.createdBy,
    'Farmer Name': p.farmerName ?? '',
  }));
}
