import { Timestamp } from 'firebase/firestore';
import { DEVICE_PRICING, DEVICE_TYPE_LABELS } from '@/constants';
import type { DeviceType, Installation, Payment, PaymentStatus } from '@/types';

export function toDate(value: Timestamp | Date | undefined | null): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  return value.toDate();
}

export function toTimestamp(value: Date | undefined | null): Timestamp | null {
  if (!value) return null;
  return Timestamp.fromDate(value);
}

export function calculatePaymentStatus(amountReceived: number, totalAmount: number): PaymentStatus {
  if (amountReceived <= 0) return 'UNPAID';
  if (amountReceived >= totalAmount) return 'PAID';
  return 'PARTIALLY_PAID';
}

export function calculateAmounts(totalAmount: number, payments: Payment[]) {
  const amountReceived = payments.reduce((sum, p) => sum + p.amount, 0);
  const amountPending = Math.max(0, totalAmount - amountReceived);
  const paymentStatus = calculatePaymentStatus(amountReceived, totalAmount);
  const receiptIds = payments.map((p) => p.receiptId).filter((id) => !!id?.trim());
  const latestReceiptId = payments.length
    ? [...payments].sort((a, b) => b.paymentDate.getTime() - a.paymentDate.getTime())[0].receiptId
    : undefined;

  return { amountReceived, amountPending, paymentStatus, receiptIds, latestReceiptId };
}

/** Merge payment calcs with the installation doc — keep stored receipt when there are no payments. */
export function withInstallationCalculations(
  installation: Installation,
  payments: Payment[],
): Installation & ReturnType<typeof calculateAmounts> {
  const calculations = calculateAmounts(installation.totalAmount, payments);
  const latestReceiptId =
    calculations.latestReceiptId?.trim() || installation.latestReceiptId?.trim() || undefined;
  const receiptIds =
    calculations.receiptIds.length > 0
      ? calculations.receiptIds
      : latestReceiptId
        ? [latestReceiptId]
        : [];

  return {
    ...installation,
    ...calculations,
    latestReceiptId,
    receiptIds,
  };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Parse user/Excel amounts: commas, spaces, currency labels (Rs, PKR, $).
 * Returns null when the value is empty or not a number.
 */
export function parseFlexibleNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value !== 'string') return null;

  let raw = value.trim();
  if (!raw) return null;

  raw = raw.replace(/^(rs\.?|pkr|usd|eur|gbp)\s*/i, '');
  raw = raw.replace(/\s*(rs\.?|pkr|usd|eur|gbp)$/i, '');
  raw = raw.replace(/[$€£]/g, '');
  raw = raw.replace(/\s/g, '');

  if (!raw || raw === '-' || raw === '.' || raw === ',') return null;

  const hasComma = raw.includes(',');
  const hasDot = raw.includes('.');

  if (hasComma && hasDot) {
    if (raw.lastIndexOf(',') > raw.lastIndexOf('.')) {
      // 1.234,56
      raw = raw.replace(/\./g, '').replace(',', '.');
    } else {
      // 1,234.56
      raw = raw.replace(/,/g, '');
    }
  } else if (hasComma) {
    const parts = raw.split(',');
    if (parts.length === 2 && parts[1].length > 0 && parts[1].length <= 2) {
      // 12,5 → decimal
      raw = `${parts[0]}.${parts[1]}`;
    } else {
      // 12,500 → thousands
      raw = raw.replace(/,/g, '');
    }
  }

  if (!/^-?\d+(\.\d+)?$/.test(raw)) return null;

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Display helper for amount fields — empty string instead of a stuck "0". */
export function formatAmountInput(
  value: number | null | undefined,
  options?: { emptyWhenZero?: boolean },
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '';
  if ((options?.emptyWhenZero ?? true) && value === 0) return '';
  return String(value);
}

/** Parse amount field text into a number (empty → 0). */
export function parseAmountInput(raw: string): number {
  if (!raw.trim()) return 0;
  return parseFlexibleNumber(raw) ?? 0;
}

export function formatDate(date: Date | undefined | null): string {
  if (!date) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatDateInput(date: Date | undefined | null): string {
  if (!date) return '';
  const normalized = ensureDate(date);
  const year = normalized.getFullYear();
  const month = String(normalized.getMonth() + 1).padStart(2, '0');
  const day = String(normalized.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseImportDate(value: unknown): Date | undefined {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

  if (typeof value === 'number') {
    // Excel serial date codes are handled by the xlsx library when cellDates is enabled.
    const parsed = new Date((value - 25569) * 86400000);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  if (typeof value === 'string' && value.trim()) {
    const trimmed = value.trim();

    // DD/MM/YYYY or DD-MM-YYYY (e.g. 19/06/2026)
    const ddmmyyyy = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (ddmmyyyy) {
      const day = Number(ddmmyyyy[1]);
      const month = Number(ddmmyyyy[2]);
      const year = Number(ddmmyyyy[3]);
      const date = new Date(year, month - 1, day);
      if (
        date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day
      ) {
        return date;
      }
      return undefined;
    }

    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  return undefined;
}

export function parseDateInput(value: string): Date | undefined {
  return parseImportDate(value);
}

export function isFollowupDue(followupDate: Date | undefined, amountPending: number): boolean {
  if (!followupDate || amountPending <= 0) return false;
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return followupDate <= today;
}

export function addCalendarDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Follow-up is overdue or within the next `nearFutureDays` calendar days. */
export function isFollowupNearOrOverdue(
  followupDate: Date | undefined,
  nearFutureDays = 7,
): boolean {
  if (!followupDate) return false;
  const due = startOfDay(ensureDate(followupDate));
  const horizon = endOfDay(addCalendarDays(new Date(), nearFutureDays));
  return due <= horizon;
}

export type FollowupUrgency = 'overdue' | 'today' | 'soon';

export function getFollowupUrgency(followupDate: Date): FollowupUrgency {
  const due = startOfDay(ensureDate(followupDate));
  const today = startOfDay(new Date());
  if (due < today) return 'overdue';
  if (due.getTime() === today.getTime()) return 'today';
  return 'soon';
}

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/** Parse `<input type="date">` value as local calendar date (avoids UTC shift). */
export function parseInputDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function ensureDate(value: unknown): Date {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}

export function toDateKey(date: Date): string {
  const normalized = ensureDate(date);
  const year = normalized.getFullYear();
  const month = String(normalized.getMonth() + 1).padStart(2, '0');
  const day = String(normalized.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isSameCalendarDay(a: Date, b: Date): boolean {
  return toDateKey(a) === toDateKey(b);
}

export function isWithinDateRange(date: Date, from?: Date | null, to?: Date | null): boolean {
  const value = ensureDate(date);

  if (from && to) {
    return value >= startOfDay(from) && value <= endOfDay(to);
  }

  if (from) {
    return value >= startOfDay(from) && value <= endOfDay(from);
  }

  if (to) {
    return value >= startOfDay(to) && value <= endOfDay(to);
  }

  return true;
}

export function getPaymentStatusColor(status: PaymentStatus): 'success' | 'warning' | 'error' {
  switch (status) {
    case 'PAID':
      return 'success';
    case 'PARTIALLY_PAID':
      return 'warning';
    default:
      return 'error';
  }
}

export function getPaymentStatusLabel(status: PaymentStatus): string {
  switch (status) {
    case 'PAID':
      return 'Paid';
    case 'PARTIALLY_PAID':
      return 'Partially Paid';
    default:
      return 'Unpaid';
  }
}

export function normalizeDeviceType(value: string): Installation['deviceType'] | null {
  const normalized = value.trim().toUpperCase().replace(/\s+/g, ' ');
  if (normalized === 'HYGROMETER' || normalized === 'HYGRO') return 'HYGROMETER';
  if (
    normalized === 'HYGROMETER WITH SOLAR' ||
    normalized === 'HYGROMETER WITH SOLAR PANEL' ||
    normalized === 'HYGRO WITH SOLAR' ||
    normalized === 'HYGROMETER_WITH_SOLAR' ||
    normalized === 'HYGRO_SOLAR'
  ) {
    return 'HYGROMETER_WITH_SOLAR';
  }
  if (normalized === 'TRADOMATION' || normalized === 'TRD') return 'TRADOMATION';
  return null;
}

export function formatDeviceTypeLabel(deviceType: string): string {
  return DEVICE_TYPE_LABELS[deviceType as DeviceType] ?? deviceType;
}

export function getDeviceUnitPrice(deviceType: DeviceType): number {
  return DEVICE_PRICING[deviceType].totalAmount;
}

/**
 * Devices on a receipt: Total Amount ÷ unit price (Hygrometer 12,500 / Tradomation 80,000),
 * rounded to the nearest whole number and at least 1.
 */
export function computeDeviceQuantity(deviceType: DeviceType, totalAmount: number): number {
  const unit = getDeviceUnitPrice(deviceType);
  if (!unit || !Number.isFinite(totalAmount) || totalAmount <= 0) return 1;
  return Math.max(1, Math.round(totalAmount / unit));
}

export function resolveDeviceQuantity(
  deviceType: DeviceType,
  totalAmount: number,
  explicit?: number | null,
): number {
  if (typeof explicit === 'number' && Number.isFinite(explicit) && explicit >= 1) {
    return Math.round(explicit);
  }
  return computeDeviceQuantity(deviceType, totalAmount);
}

export function getDeviceQuantity(installation: {
  deviceType: DeviceType;
  totalAmount: number;
  deviceQuantity?: number;
}): number {
  return resolveDeviceQuantity(
    installation.deviceType,
    installation.totalAmount,
    installation.deviceQuantity,
  );
}

export function generateReceiptId(prefix: string, year: number, sequence: number): string {
  return `${prefix}-${year}-${String(sequence).padStart(5, '0')}`;
}

export function validateReceiptId(receiptId: string): boolean {
  return receiptId.trim().length > 0;
}

/** @deprecated Use validateReceiptId — receipt IDs are free text. */
export function validateReceiptIdFormat(receiptId: string): boolean {
  return validateReceiptId(receiptId);
}

export function debounce<T extends (...args: Parameters<T>) => void>(fn: T, delay: number) {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}
