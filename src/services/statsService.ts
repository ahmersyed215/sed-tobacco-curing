import type {
  DashboardStats,
  DepoReportRow,
  InstallationFilters,
  InstallationWithCalculations,
  MonthlyCollectionPoint,
  RegionReportRow,
  RepresentativeReportRow,
  ChartDataPoint,
  Payment,
  DailyInstallationPoint,
  FilteredStatsSummary,
  DeviceType,
  DailyInstallationSummary,
} from '@/types';
import { DEVICE_TYPE_LABELS, NEAR_FUTURE_FOLLOWUP_DAYS } from '@/constants';
import {
  ensureDate,
  isFollowupDue,
  isFollowupNearOrOverdue,
  isSameCalendarDay,
  isWithinDateRange,
  toDateKey,
} from '@/utils';

export function filterInstallations(
  installations: InstallationWithCalculations[],
  filters: InstallationFilters,
): InstallationWithCalculations[] {
  return installations.filter((item) => {
    if (filters.region && item.region !== filters.region) return false;
    if (filters.depo && !item.depo?.toLowerCase().includes(filters.depo.trim().toLowerCase())) {
      return false;
    }
    if (filters.deviceType && item.deviceType !== filters.deviceType) return false;
    if (filters.sedRepresentative && item.sedRepresentative !== filters.sedRepresentative) return false;
    if (filters.ptcRepresentative && item.ptcRepresentative !== filters.ptcRepresentative) return false;

    if (filters.installationDateFrom || filters.installationDateTo) {
      if (
        !isWithinDateRange(
          item.installationDate,
          filters.installationDateFrom,
          filters.installationDateTo,
        )
      ) {
        return false;
      }
    }
    if (filters.pendingPaymentsOnly && item.amountPending <= 0) return false;
    if (filters.fullyPaidOnly && item.amountPending !== 0) return false;
    if (filters.followupDueOnly && !isFollowupDue(item.followupDate, item.amountPending)) return false;

    if (filters.search?.trim()) {
      const query = filters.search.trim().toLowerCase();
      const queryNormalized = query.replace(/[-\s]/g, '');
      const haystack = [
        item.farmerName,
        item.farmerNumber,
        item.farmerCNIC,
        item.deviceId ?? '',
        item.sedRepresentative,
        item.ptcRepresentative,
        item.depo,
        item.latestReceiptId ?? '',
        ...item.receiptIds,
      ]
        .join(' ')
        .toLowerCase();
      const haystackNormalized = haystack.replace(/[-\s]/g, '');

      if (!haystack.includes(query) && !haystackNormalized.includes(queryNormalized)) return false;
    }

    return true;
  });
}

export function computeDashboardStats(
  installations: InstallationWithCalculations[],
  allPayments: Payment[],
): DashboardStats {
  const totalContractValue = installations.reduce((sum, i) => sum + i.totalAmount, 0);
  const totalAmountCollected = installations.reduce((sum, i) => sum + i.amountReceived, 0);

  return {
    totalInstallations: installations.length,
    totalHygrometers: installations.filter((i) => i.deviceType === 'HYGROMETER').length,
    totalHygrometersWithSolar: installations.filter((i) => i.deviceType === 'HYGROMETER_WITH_SOLAR')
      .length,
    totalTradomation: installations.filter((i) => i.deviceType === 'TRADOMATION').length,
    totalContractValue,
    totalAmountCollected,
    totalAmountPending: totalContractValue - totalAmountCollected,
    fullyPaidInstallations: installations.filter((i) => i.amountPending === 0).length,
    partiallyPaidInstallations: installations.filter(
      (i) => i.amountPending > 0 && i.amountReceived > 0,
    ).length,
    unpaidInstallations: installations.filter((i) => i.amountReceived === 0).length,
    pendingFollowups: installations.filter((i) => i.amountPending > 0).length,
    followupsDueToday: installations.filter((i) =>
      isFollowupDue(i.followupDate, i.amountPending),
    ).length,
    totalReceiptsIssued: allPayments.length,
  };
}

export function getInstallationsByDepo(
  installations: InstallationWithCalculations[],
  region?: string,
): ChartDataPoint[] {
  const filtered = region
    ? installations.filter((item) => item.region === region)
    : installations;

  const counts = filtered.reduce<Record<string, number>>((acc, item) => {
    const depo = item.depo?.trim() || 'Unassigned';
    acc[depo] = (acc[depo] ?? 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

export function getInstallationsPerDay(
  installations: InstallationWithCalculations[],
): DailyInstallationPoint[] {
  const counts = installations.reduce<
    Record<string, { HYGROMETER: number; HYGROMETER_WITH_SOLAR: number; TRADOMATION: number }>
  >((acc, item) => {
    const date = toDateKey(ensureDate(item.installationDate));
    if (!acc[date]) acc[date] = { HYGROMETER: 0, HYGROMETER_WITH_SOLAR: 0, TRADOMATION: 0 };

    if (
      item.deviceType === 'HYGROMETER' ||
      item.deviceType === 'HYGROMETER_WITH_SOLAR' ||
      item.deviceType === 'TRADOMATION'
    ) {
      acc[date][item.deviceType] += 1;
    }

    return acc;
  }, {});

  return Object.entries(counts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, deviceCounts]) => {
      const [year, month, day] = date.split('-').map(Number);
      const labelDate = new Date(year, month - 1, day);

      return {
        date,
        label: labelDate.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
        }),
        hygrometer: deviceCounts.HYGROMETER,
        hygrometerWithSolar: deviceCounts.HYGROMETER_WITH_SOLAR,
        tradomation: deviceCounts.TRADOMATION,
        total:
          deviceCounts.HYGROMETER +
          deviceCounts.HYGROMETER_WITH_SOLAR +
          deviceCounts.TRADOMATION,
      };
    });
}

export function computeFilteredStatsSummary(
  installations: InstallationWithCalculations[],
): FilteredStatsSummary {
  const totalContractValue = installations.reduce((sum, i) => sum + i.totalAmount, 0);
  const amountCollected = installations.reduce((sum, i) => sum + i.amountReceived, 0);
  const amountPending = totalContractValue - amountCollected;

  return {
    totalInstallations: installations.length,
    totalHygrometers: installations.filter((i) => i.deviceType === 'HYGROMETER').length,
    totalHygrometersWithSolar: installations.filter((i) => i.deviceType === 'HYGROMETER_WITH_SOLAR')
      .length,
    totalTradomation: installations.filter((i) => i.deviceType === 'TRADOMATION').length,
    totalContractValue,
    amountCollected,
    amountPending,
    collectionPercentage:
      totalContractValue > 0 ? (amountCollected / totalContractValue) * 100 : 0,
  };
}

export function getDepoOptions(
  installations: InstallationWithCalculations[],
  region: string,
  knownDepos: string[],
): string[] {
  const fromData = installations
    .filter((item) => item.region === region && item.depo?.trim())
    .map((item) => item.depo.trim());

  return [...new Set([...knownDepos, ...fromData])].sort();
}

export function getInstallationsByRegion(installations: InstallationWithCalculations[]): ChartDataPoint[] {
  const counts = installations.reduce<Record<string, number>>((acc, item) => {
    const regionName = item.region?.trim() || 'Unassigned';
    acc[regionName] = (acc[regionName] ?? 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts).map(([name, value]) => ({ name, value }));
}

export function getInstallationsByDeviceType(installations: InstallationWithCalculations[]): ChartDataPoint[] {
  const counts = installations.reduce<Record<string, number>>((acc, item) => {
    acc[item.deviceType] = (acc[item.deviceType] ?? 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts).map(([name, value]) => ({
    name: DEVICE_TYPE_LABELS[name as DeviceType] ?? name,
    value,
  }));
}

export function getCollectionsByMonth(payments: Payment[]): MonthlyCollectionPoint[] {
  const counts = payments.reduce<Record<string, number>>((acc, payment) => {
    const month = payment.paymentDate.toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    });
    acc[month] = (acc[month] ?? 0) + payment.amount;
    return acc;
  }, {});

  return Object.entries(counts).map(([month, amount]) => ({ month, amount }));
}

export function getRegionWiseCollection(installations: InstallationWithCalculations[]): ChartDataPoint[] {
  const totals = installations.reduce<Record<string, number>>((acc, item) => {
    acc[item.region] = (acc[item.region] ?? 0) + item.amountReceived;
    return acc;
  }, {});

  return Object.entries(totals).map(([name, value]) => ({ name, value }));
}

export function getRepresentativePerformance(
  installations: InstallationWithCalculations[],
  field: 'sedRepresentative' | 'ptcRepresentative',
): ChartDataPoint[] {
  const totals = installations.reduce<Record<string, number>>((acc, item) => {
    const rep = item[field];
    acc[rep] = (acc[rep] ?? 0) + item.amountReceived;
    return acc;
  }, {});

  return Object.entries(totals)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);
}

export function computeRegionReport(installations: InstallationWithCalculations[]): RegionReportRow[] {
  const grouped = installations.reduce<Record<string, InstallationWithCalculations[]>>((acc, item) => {
    if (!acc[item.region]) acc[item.region] = [];
    acc[item.region].push(item);
    return acc;
  }, {});

  return Object.entries(grouped).map(([region, items]) => {
    const totalContractValue = items.reduce((sum, i) => sum + i.totalAmount, 0);
    const amountCollected = items.reduce((sum, i) => sum + i.amountReceived, 0);
    const amountPending = totalContractValue - amountCollected;

    return {
      region,
      totalInstallations: items.length,
      totalContractValue,
      amountCollected,
      amountPending,
      collectionPercentage: totalContractValue > 0 ? (amountCollected / totalContractValue) * 100 : 0,
    };
  });
}

export function computeDepoReport(installations: InstallationWithCalculations[]): DepoReportRow[] {
  const grouped = installations.reduce<Record<string, InstallationWithCalculations[]>>((acc, item) => {
    const key = `${item.region}::${item.depo}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  return Object.entries(grouped).map(([key, items]) => {
    const [region, depo] = key.split('::');
    const totalContractValue = items.reduce((sum, i) => sum + i.totalAmount, 0);
    const amountCollected = items.reduce((sum, i) => sum + i.amountReceived, 0);
    const amountPending = totalContractValue - amountCollected;

    return {
      region,
      depo,
      totalInstallations: items.length,
      totalContractValue,
      amountCollected,
      amountPending,
      collectionPercentage: totalContractValue > 0 ? (amountCollected / totalContractValue) * 100 : 0,
    };
  });
}

export function computeRepresentativeReport(
  installations: InstallationWithCalculations[],
  field: 'sedRepresentative' | 'ptcRepresentative',
): RepresentativeReportRow[] {
  const grouped = installations.reduce<Record<string, InstallationWithCalculations[]>>((acc, item) => {
    const rep = item[field];
    if (!acc[rep]) acc[rep] = [];
    acc[rep].push(item);
    return acc;
  }, {});

  return Object.entries(grouped)
    .map(([representative, items]) => ({
      representative,
      installations: items.length,
      contractValue: items.reduce((sum, i) => sum + i.totalAmount, 0),
      amountCollected: items.reduce((sum, i) => sum + i.amountReceived, 0),
      pendingAmount: items.reduce((sum, i) => sum + i.amountPending, 0),
    }))
    .sort((a, b) => b.contractValue - a.contractValue);
}

export function getFollowupInstallations(
  installations: InstallationWithCalculations[],
): InstallationWithCalculations[] {
  return installations
    .filter((installation) => {
      if (!installation.followupDate) return false;
      const date = ensureDate(installation.followupDate);
      return !Number.isNaN(date.getTime());
    })
    .sort((a, b) => ensureDate(a.followupDate!).getTime() - ensureDate(b.followupDate!).getTime());
}

export function getUrgentFollowups(
  installations: InstallationWithCalculations[],
  nearFutureDays = NEAR_FUTURE_FOLLOWUP_DAYS,
): InstallationWithCalculations[] {
  return installations
    .filter(
      (installation) =>
        installation.followupDate &&
        isFollowupNearOrOverdue(installation.followupDate, nearFutureDays),
    )
    .sort((a, b) => ensureDate(a.followupDate!).getTime() - ensureDate(b.followupDate!).getTime());
}

export function summarizeInstallationsOnDate(
  installations: InstallationWithCalculations[],
  date: Date,
): DailyInstallationSummary {
  const onDate = installations.filter((item) =>
    isSameCalendarDay(ensureDate(item.installationDate), date),
  );

  return {
    total: onDate.length,
    hygrometer: onDate.filter((item) => item.deviceType === 'HYGROMETER').length,
    hygrometerWithSolar: onDate.filter((item) => item.deviceType === 'HYGROMETER_WITH_SOLAR').length,
    tradomation: onDate.filter((item) => item.deviceType === 'TRADOMATION').length,
  };
}
