import * as XLSX from 'xlsx';
import type { DeviceType, ExcelImportRow, ImportResult, ImportValidationError } from '@/types';
import { IMPORT_FILE_EXTENSIONS, REGIONS } from '@/constants';
import {
  computeDeviceQuantity,
  normalizeDeviceType,
  parseFlexibleNumber,
  parseImportDate,
} from '@/utils';
import { importInstallations, buildReceiptImportIndex } from './installationService';

export type ImportProgressPhase = 'checking' | 'writing';

export type ImportProgressCallback = (
  phase: ImportProgressPhase,
  done: number,
  total: number,
) => void;

function parseNumber(value: unknown): number | null {
  return parseFlexibleNumber(value);
}

function getFileExtension(fileName: string): string {
  const match = fileName.toLowerCase().match(/(\.[a-z0-9]+)$/);
  return match?.[1] ?? '';
}

export function isSupportedImportFile(file: File): boolean {
  const ext = getFileExtension(file.name);
  return (IMPORT_FILE_EXTENSIONS as readonly string[]).includes(ext);
}

function getCell(row: Record<string, unknown>, key: string): unknown {
  if (key in row) return row[key];

  const normalizedKey = key.trim().toLowerCase();
  const match = Object.keys(row).find((column) => column.trim().toLowerCase() === normalizedKey);
  return match ? row[match] : undefined;
}

function sheetHasData(sheet: XLSX.WorkSheet): boolean {
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
  return rows.length > 0;
}

function sheetHeaders(sheet: XLSX.WorkSheet): string[] {
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });
  const headerRow = Array.isArray(rows[0]) ? rows[0] : [];
  return headerRow.map((cell) => String(cell ?? '').trim().toLowerCase());
}

function pickImportSheet(workbook: XLSX.WorkBook): string {
  const required = ['receipt id', 'device type', 'farmer name', 'total amount'];
  const match = workbook.SheetNames.find((name) => {
    const sheet = workbook.Sheets[name];
    if (!sheet || !sheetHasData(sheet)) return false;
    const headers = sheetHeaders(sheet);
    return required.every((column) => headers.includes(column));
  });

  return (
    match ??
    workbook.SheetNames.find((name) => sheetHasData(workbook.Sheets[name])) ??
    workbook.SheetNames[0]
  );
}

function parseDeviceQuantity(value: unknown): number | null {
  if (isCellEmpty(value)) return null;
  const parsed = parseNumber(value);
  if (parsed === null) return null;
  if (parsed < 1 || Math.abs(parsed - Math.round(parsed)) > 0.001) return null;
  return Math.round(parsed);
}

/**
 * Parse Excel (.xlsx/.xls) or Apple Numbers (.numbers) into row objects.
 * Prefers the sheet that has Receipt ID / Device Type / Farmer Name / Total Amount.
 */
export async function parseExcelFile(file: File): Promise<Record<string, unknown>[]> {
  if (!isSupportedImportFile(file)) {
    throw new Error(
      `Unsupported file type. Please upload ${IMPORT_FILE_EXTENSIONS.join(', ')}.`,
    );
  }

  const data = new Uint8Array(await file.arrayBuffer());

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(data, { type: 'array', cellDates: true });
  } catch {
    const ext = getFileExtension(file.name);
    if (ext === '.numbers') {
      throw new Error(
        'Could not read this Apple Numbers file. Export as Excel (.xlsx) from Numbers, or use a Numbers 3.0+ / iWork 2013+ file.',
      );
    }
    throw new Error('Failed to parse spreadsheet. Please check the file format.');
  }

  if (!workbook.SheetNames.length) {
    throw new Error('The spreadsheet contains no sheets.');
  }

  const sheetName = pickImportSheet(workbook);
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error('The spreadsheet contains no readable sheets.');
  }

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
  return rows;
}

function getPaidAmount(row: Record<string, unknown>): number | null {
  return (
    parseNumber(getCell(row, 'Paid Amount')) ??
    parseNumber(getCell(row, 'Amount Received')) ??
    parseNumber(getCell(row, 'Paid amount'))
  );
}

function isCellEmpty(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string' && !value.trim()) return true;
  return false;
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
    const deviceQuantityRaw = getCell(row, 'Device Quantity') ?? getCell(row, 'Quantity');
    const deviceQuantityPresent = !isCellEmpty(deviceQuantityRaw);
    const parsedDeviceQuantity = deviceQuantityPresent ? parseDeviceQuantity(deviceQuantityRaw) : null;
    const followupDate = parseImportDate(getCell(row, 'Followup Date'));
    const receiptId = String(getCell(row, 'Receipt ID') ?? getCell(row, 'Latest Receipt ID') ?? '').trim();
    const paidAmount = getPaidAmount(row);
    const recoveredRaw = getCell(row, 'Recovered Amount');
    const recoveredPresent = !isCellEmpty(recoveredRaw);
    const recoveredAmount = recoveredPresent ? parseNumber(recoveredRaw) : null;
    const paidForTotals = paidAmount && paidAmount > 0 ? paidAmount : 0;
    const recoveredForTotals = recoveredAmount && recoveredAmount > 0 ? recoveredAmount : 0;

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
    if (deviceQuantityPresent && parsedDeviceQuantity === null) {
      errors.push({
        row: rowNum,
        field: 'Device Quantity',
        message: 'Must be a whole number of at least 1',
      });
    }
    if (paidAmount !== null && paidAmount < 0) {
      errors.push({ row: rowNum, field: 'Paid Amount', message: 'Cannot be negative' });
    }
    if (recoveredPresent && recoveredAmount === null) {
      errors.push({ row: rowNum, field: 'Recovered Amount', message: 'Invalid amount' });
    }
    if (recoveredAmount !== null && recoveredAmount < 0) {
      errors.push({ row: rowNum, field: 'Recovered Amount', message: 'Cannot be negative' });
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
    if (
      recoveredForTotals > 0 &&
      totalAmount !== null &&
      paidForTotals + recoveredForTotals > totalAmount
    ) {
      errors.push({
        row: rowNum,
        field: 'Recovered Amount',
        message: 'Paid + recovered cannot exceed total amount',
      });
    }
    if (!receiptId) {
      errors.push({
        row: rowNum,
        field: 'Receipt ID',
        message: 'Required',
      });
    }
    if (receiptId) {
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
      deviceQuantity:
        parsedDeviceQuantity ??
        computeDeviceQuantity(deviceType as DeviceType, totalAmount!),
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
      receiptId,
      paidAmount: paidForTotals > 0 ? paidForTotals : undefined,
      recoveredAmount: recoveredForTotals > 0 ? recoveredForTotals : undefined,
      followupDate,
    });
  });

  return { validRows, errors };
}

export async function confirmImport(
  rows: ExcelImportRow[],
  userEmail: string,
  onProgress?: ImportProgressCallback,
): Promise<ImportResult> {
  if (!userEmail.trim()) {
    throw new Error('You must be logged in to import records.');
  }

  let receiptIndex: Awaited<ReturnType<typeof buildReceiptImportIndex>>;

  try {
    onProgress?.('checking', 0, rows.length || 1);
    receiptIndex = await buildReceiptImportIndex();
    onProgress?.('checking', rows.length || 1, rows.length || 1);
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
    return await importInstallations(
      rows,
      userEmail,
      (done, total) => {
        onProgress?.('writing', done, total);
      },
      receiptIndex,
    );
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
  deviceQuantity?: number;
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
    'Device Quantity': i.deviceQuantity ?? 1,
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
