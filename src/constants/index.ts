export const REGIONS: Record<string, string[]> = {
  Mardan: ['Sher Garh', 'Jamal Garhi', 'Mandani', 'Shareefabad'],
  Swabi: ['Roshanpora', 'Yar Hussain', 'Faujoon', 'Azeemabad'],
  Mansehra: ['Baffa'],
  Mianwali: ['Pindigheb'],
  Buner: ['Buner'],
};

export const REGION_NAMES = Object.keys(REGIONS) as Array<keyof typeof REGIONS>;

export const DEVICE_TYPES = ['HYGROMETER', 'HYGROMETER_WITH_SOLAR', 'TRADOMATION'] as const;

export const DEVICE_TYPE_LABELS: Record<(typeof DEVICE_TYPES)[number], string> = {
  HYGROMETER: 'Hygrometer',
  HYGROMETER_WITH_SOLAR: 'Hygrometer with Solar Panel',
  TRADOMATION: 'Tradomation',
};

export const DEVICE_PRICING: Record<
  (typeof DEVICE_TYPES)[number],
  { totalAmount: number; defaultPaidAmount: number }
> = {
  HYGROMETER: { totalAmount: 12500, defaultPaidAmount: 5000 },
  HYGROMETER_WITH_SOLAR: { totalAmount: 18500, defaultPaidAmount: 5000 },
  TRADOMATION: { totalAmount: 80000, defaultPaidAmount: 20000 },
};

export const PAYMENT_STATUSES = ['PAID', 'PARTIALLY_PAID', 'UNPAID'] as const;

export const EXCEL_COLUMNS = [
  'Device Type',
  'Device ID',
  'Farmer Name',
  'Farmer Number',
  'Farmer CNIC',
  'Region',
  'Depo',
  'Location',
  'SED Representative',
  'PTC Representative',
  'Installation Date',
  'Total Amount',
  'Receipt ID',
  'Paid Amount',
  'Recovered Amount',
  'Followup Date',
] as const;

export const EXCEL_IMPORT_NOTES = {
  farmerName: 'Any text (e.g. Shayan Khan)',
  ptcRepresentative: 'Optional — leave blank if not assigned',
  dates: 'DD/MM/YYYY (e.g. 19/06/2026) or standard Excel/Numbers date cells',
  totalAmount: 'Numbers with commas/currency OK (e.g. 80,000 or Rs 80000)',
  depo: 'Any text — legacy depo names are accepted on import',
  receiptId:
    'Required unique key — re-importing the same Receipt ID overwrites that installation; duplicates in the file are rejected',
  paidAmount:
    'Optional — also accepts "Amount Received"; commas/currency OK; remaining = Total − Paid − Recovered',
  recoveredAmount: 'Optional — if filled, imported as a second payment on the same receipt',
  fileFormats: 'Excel (.xlsx, .xls) and Apple Numbers (.numbers)',
} as const;

/** File extensions accepted for spreadsheet import. */
export const IMPORT_FILE_EXTENSIONS = ['.xlsx', '.xls', '.numbers'] as const;

export const IMPORT_FILE_ACCEPT = IMPORT_FILE_EXTENSIONS.join(',');

export const NEAR_FUTURE_FOLLOWUP_DAYS = 7;

export const NAV_ITEMS = [
  { label: 'Dashboard', path: '/dashboard', icon: 'Dashboard' },
  { label: 'Installations', path: '/installations', icon: 'Installations' },
  { label: 'Payments', path: '/payments', icon: 'Payments' },
  { label: 'Followups', path: '/followups', icon: 'Followups' },
  { label: 'Statistics', path: '/statistics', icon: 'Statistics' },
  { label: 'Import Data', path: '/import', icon: 'Import' },
  { label: 'Users', path: '/users', icon: 'Users' },
] as const;

export const RECEIPT_PREFIX = {
  HYGROMETER: 'SED',
  HYGROMETER_WITH_SOLAR: 'SED',
  TRADOMATION: 'TRD',
} as const;

export const QUERY_KEYS = {
  installations: ['installations'] as const,
  installation: (id: string) => ['installations', id] as const,
  payments: (installationId: string) => ['payments', installationId] as const,
  allPayments: ['allPayments'] as const,
  dashboardStats: ['dashboardStats'] as const,
  receiptExists: (receiptId: string) => ['receiptExists', receiptId] as const,
  nextReceiptId: (deviceType: string) => ['nextReceiptId', deviceType] as const,
  users: (includeDeleted?: boolean) => ['users', { includeDeleted: !!includeDeleted }] as const,
  user: (id: string) => ['users', id] as const,
};
