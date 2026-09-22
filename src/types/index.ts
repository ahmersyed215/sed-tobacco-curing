export type DeviceType = 'HYGROMETER' | 'HYGROMETER_WITH_SOLAR' | 'TRADOMATION';

export type PaymentStatus = 'PAID' | 'PARTIALLY_PAID' | 'UNPAID';

export interface Installation {
  id: string;
  deviceType: DeviceType;
  deviceQuantity: number;
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
  followupDate?: Date;
  latestReceiptId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Payment {
  id: string;
  installationId: string;
  receiptId: string;
  amount: number;
  paymentDate: Date;
  notes?: string;
  createdAt: Date;
  createdBy: string;
}

export interface InstallationWithCalculations extends Installation {
  amountReceived: number;
  amountPending: number;
  paymentStatus: PaymentStatus;
  receiptIds: string[];
}

export interface InstallationFormData {
  deviceType: DeviceType;
  deviceQuantity: number;
  deviceId?: string;
  farmerName: string;
  farmerNumber: string;
  farmerCNIC: string;
  region: string;
  depo?: string;
  location?: string;
  sedRepresentative: string;
  ptcRepresentative?: string;
  installationDate: Date;
  totalAmount: number;
  followupDate?: Date | null;
  receiptId: string;
  paidAmount?: number;
  autoGenerateReceipt?: boolean;
}

export interface PaymentFormData {
  receiptId: string;
  amount: number;
  paymentDate: Date;
  notes?: string;
  autoGenerateReceipt?: boolean;
}

export interface InstallationFilters {
  region?: string;
  depo?: string;
  deviceType?: DeviceType | '';
  sedRepresentative?: string;
  ptcRepresentative?: string;
  installationDateFrom?: Date | null;
  installationDateTo?: Date | null;
  pendingPaymentsOnly?: boolean;
  fullyPaidOnly?: boolean;
  followupDueOnly?: boolean;
  search?: string;
  receiptId?: string;
}

export interface DashboardStats {
  totalInstallations: number;
  totalHygrometers: number;
  totalHygrometersWithSolar: number;
  totalTradomation: number;
  totalContractValue: number;
  totalAmountCollected: number;
  totalAmountPending: number;
  fullyPaidInstallations: number;
  partiallyPaidInstallations: number;
  unpaidInstallations: number;
  pendingFollowups: number;
  followupsDueToday: number;
  totalReceiptsIssued: number;
  totalRecords: number;
}

export interface RegionReportRow {
  region: string;
  totalInstallations: number;
  totalContractValue: number;
  amountCollected: number;
  amountPending: number;
  collectionPercentage: number;
}

export interface DepoReportRow {
  region: string;
  depo: string;
  totalInstallations: number;
  totalContractValue: number;
  amountCollected: number;
  amountPending: number;
  collectionPercentage: number;
}

export interface RepresentativeReportRow {
  representative: string;
  installations: number;
  contractValue: number;
  amountCollected: number;
  pendingAmount: number;
}

export interface ExcelImportRow {
  deviceType: string;
  deviceQuantity: number;
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
  receiptId: string;
  paidAmount?: number;
  recoveredAmount?: number;
  followupDate?: Date;
}

export interface ImportValidationError {
  row: number;
  field: string;
  message: string;
}

export interface ImportResult {
  created: number;
  updated: number;
  total: number;
}

export interface DailyInstallationSummary {
  total: number;
  hygrometer: number;
  hygrometerWithSolar: number;
  tradomation: number;
}

export interface ChartDataPoint {
  name: string;
  value: number;
}

export interface DailyInstallationPoint {
  date: string;
  label: string;
  hygrometer: number;
  hygrometerWithSolar: number;
  tradomation: number;
  total: number;
}

export interface FilteredStatsSummary {
  totalInstallations: number;
  totalHygrometers: number;
  totalHygrometersWithSolar: number;
  totalTradomation: number;
  totalContractValue: number;
  amountCollected: number;
  amountPending: number;
  collectionPercentage: number;
}

export interface MonthlyCollectionPoint {
  month: string;
  amount: number;
}

export type UserRole = 'super_admin' | 'manager' | 'field_staff';

export type ExpenseType =
  | 'TRANSPORT'
  | 'OFFICE'
  | 'FOOD'
  | 'MOBILE_PACKAGE'
  | 'INSTALLATION'
  | 'MISCELLANEOUS';

export type TransportSubtype = 'FUEL' | 'CAR_RENT' | 'MAINTENANCE' | 'M_TAG';
export type OfficeSubtype = 'MAINTENANCE' | 'UTILITY_BILLS' | 'OTHERS';
export type FoodSubtype = 'DEPO' | 'OFFICE';
export type InstallationExpenseSubtype = 'TOOLS' | 'EQUIPMENT' | 'HOTEL_ROOM' | 'GENERATOR';

export type ExpenseSubtype =
  | TransportSubtype
  | OfficeSubtype
  | FoodSubtype
  | InstallationExpenseSubtype;

export interface Expense {
  id: string;
  type: ExpenseType;
  subtype?: ExpenseSubtype;
  expenseDate: Date;
  amount: number;
  note: string;
  sedRepresentative?: string;
  region?: string;
  depo?: string;
  walletManagerUid: string;
  walletManagerName: string;
  createdByUid: string;
  createdByName: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExpenseFormData {
  type: ExpenseType;
  subtype?: ExpenseSubtype | '';
  expenseDate: Date;
  amount: number;
  note: string;
  sedRepresentative?: string;
  region?: string;
  depo?: string;
  walletManagerUid: string;
  walletManagerName: string;
}

export interface ExpenseFilters {
  dateFrom?: Date | null;
  dateTo?: Date | null;
  date?: Date | null;
  type?: ExpenseType | '';
  subtype?: ExpenseSubtype | '';
  region?: string;
  depo?: string;
  month?: string;
}

export interface ExpenseInflow {
  id: string;
  walletManagerUid: string;
  walletManagerName: string;
  amount: number;
  inflowDate: Date;
  note: string;
  createdByUid: string;
  createdByName: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExpenseInflowFormData {
  walletManagerUid: string;
  walletManagerName: string;
  amount: number;
  inflowDate: Date;
  note: string;
}

export interface ManagerWalletSummary {
  walletManagerUid: string;
  walletManagerName: string;
  totalOutflow: number;
  totalInflow: number;
  debt: number;
}

export type Permission =
  | 'dashboard'
  | 'installations'
  | 'payments'
  | 'followups'
  | 'statistics'
  | 'expenses'
  | 'inventory'
  | 'import'
  | 'users';

export type UserPermissions = Record<Permission, boolean>;

export interface AppUser {
  id: string;
  uid: string;
  email: string;
  name: string;
  phone?: string;
  notes?: string;
  role: UserRole;
  permissions: UserPermissions;
  hasLogin: boolean;
  isDeleted: boolean;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
  deletedAt?: Date;
  deletedBy?: string;
}

export interface UserFormData {
  email: string;
  password?: string;
  uid?: string;
  name: string;
  phone?: string;
  notes?: string;
  linkExisting: boolean;
  noLogin: boolean;
  role: UserRole;
  permissions: UserPermissions;
}
