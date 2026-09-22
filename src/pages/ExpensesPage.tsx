import { useMemo, useState } from 'react';
import { Box, Button, IconButton, Tooltip, Typography } from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PaymentsIcon from '@mui/icons-material/Payments';
import { EXPENSE_SUBTYPES, EXPENSE_TYPES } from '@/constants';
import { ExpenseFiltersPanel } from '@/features/expenses/ExpenseFiltersPanel';
import { ExpenseFormDialog } from '@/features/expenses/ExpenseFormDialog';
import { ExpenseInflowFormDialog } from '@/features/expenses/ExpenseInflowFormDialog';
import { ExpenseWalletSummary } from '@/features/expenses/ExpenseWalletSummary';
import { useAccess } from '@/hooks/useAdmin';
import {
  useCreateExpense,
  useCreateExpenseInflow,
  useDeleteExpense,
  useDeleteExpenseInflow,
  useExpenseInflows,
  useExpenses,
  useUpdateExpense,
  useUpdateExpenseInflow,
} from '@/hooks/useExpenses';
import { useManagers, useActiveUsers } from '@/hooks/useUsers';
import { computeWalletSummaries } from '@/services/expenseService';
import { AppSnackbar } from '@/components/common/AppSnackbar';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import type {
  Expense,
  ExpenseFilters,
  ExpenseFormData,
  ExpenseInflow,
  ExpenseInflowFormData,
} from '@/types';
import { formatCurrency, formatDate, isSameCalendarDay, isWithinDateRange } from '@/utils';

const typeLabel = Object.fromEntries(EXPENSE_TYPES.map((item) => [item.value, item.label]));
const subtypeLabel = Object.fromEntries(
  Object.values(EXPENSE_SUBTYPES)
    .flat()
    .map((item) => [item.value, item.label]),
);

function filterExpenses(expenses: Expense[], filters: ExpenseFilters): Expense[] {
  return expenses.filter((expense) => {
    if (filters.type && expense.type !== filters.type) return false;
    if (filters.subtype && expense.subtype !== filters.subtype) return false;
    if (filters.region && expense.region !== filters.region) return false;
    if (filters.depo && expense.depo !== filters.depo) return false;
    if (filters.date) {
      if (!isSameCalendarDay(expense.expenseDate, filters.date)) return false;
    } else {
      if (filters.month) {
        const [year, month] = filters.month.split('-').map(Number);
        if (
          expense.expenseDate.getFullYear() !== year ||
          expense.expenseDate.getMonth() + 1 !== month
        ) {
          return false;
        }
      }
      if (filters.dateFrom || filters.dateTo) {
        if (!isWithinDateRange(expense.expenseDate, filters.dateFrom, filters.dateTo)) {
          return false;
        }
      }
    }
    return true;
  });
}

export function ExpensesPage() {
  const { isSuperAdmin, profile } = useAccess();
  const isManager = profile?.role === 'manager';
  const canManageInflows = isSuperAdmin || isManager;

  const { data: expenses = [], isLoading: loadingExpenses, isError: expensesError } = useExpenses();
  const { data: inflows = [], isLoading: loadingInflows } = useExpenseInflows();
  const { data: managers = [] } = useManagers();
  const { data: users = [] } = useActiveUsers();

  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();
  const createInflow = useCreateExpenseInflow();
  const updateInflow = useUpdateExpenseInflow();
  const deleteInflow = useDeleteExpenseInflow();

  const [filters, setFilters] = useState<ExpenseFilters>({
    dateFrom: null,
    dateTo: null,
    date: null,
    type: '',
    subtype: '',
    region: '',
    depo: '',
    month: '',
  });
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | undefined>();
  const [inflowDialogOpen, setInflowDialogOpen] = useState(false);
  const [editingInflow, setEditingInflow] = useState<ExpenseInflow | undefined>();
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });

  const defaultWallet = isManager
    ? {
        uid: profile!.uid,
        name: profile!.name || profile!.email,
      }
    : undefined;

  const filteredExpenses = useMemo(() => filterExpenses(expenses, filters), [expenses, filters]);

  const walletSummaries = useMemo(() => {
    const summaries = computeWalletSummaries(expenses, inflows);
    if (isManager && profile) {
      const own = summaries.find((row) => row.walletManagerUid === profile.uid);
      return [
        own ?? {
          walletManagerUid: profile.uid,
          walletManagerName: profile.name || profile.email,
          totalOutflow: 0,
          totalInflow: 0,
          debt: 0,
        },
      ];
    }
    return summaries;
  }, [expenses, inflows, isManager, profile]);

  const filteredInflows = useMemo(() => {
    return inflows.filter((inflow) => {
      if (filters.date) {
        if (!isSameCalendarDay(inflow.inflowDate, filters.date)) return false;
      } else {
        if (filters.month) {
          const [year, month] = filters.month.split('-').map(Number);
          if (
            inflow.inflowDate.getFullYear() !== year ||
            inflow.inflowDate.getMonth() + 1 !== month
          ) {
            return false;
          }
        }
        if (filters.dateFrom || filters.dateTo) {
          if (!isWithinDateRange(inflow.inflowDate, filters.dateFrom, filters.dateTo)) {
            return false;
          }
        }
      }
      return true;
    });
  }, [inflows, filters]);

  const handleExpenseSubmit = async (data: ExpenseFormData) => {
    try {
      if (editingExpense) {
        await updateExpense.mutateAsync({ id: editingExpense.id, data });
        setSnackbar({ open: true, message: 'Expense updated', severity: 'success' });
      } else {
        await createExpense.mutateAsync(data);
        setSnackbar({ open: true, message: 'Expense added', severity: 'success' });
      }
      setExpenseDialogOpen(false);
      setEditingExpense(undefined);
    } catch (error) {
      setSnackbar({
        open: true,
        message: error instanceof Error ? error.message : 'Failed to save expense',
        severity: 'error',
      });
    }
  };

  const handleInflowSubmit = async (data: ExpenseInflowFormData) => {
    try {
      if (editingInflow) {
        await updateInflow.mutateAsync({ id: editingInflow.id, data });
        setSnackbar({ open: true, message: 'Reimbursement updated', severity: 'success' });
      } else {
        await createInflow.mutateAsync(data);
        setSnackbar({ open: true, message: 'Reimbursement added', severity: 'success' });
      }
      setInflowDialogOpen(false);
      setEditingInflow(undefined);
    } catch (error) {
      setSnackbar({
        open: true,
        message: error instanceof Error ? error.message : 'Failed to save reimbursement',
        severity: 'error',
      });
    }
  };

  const handleDeleteExpense = async (expense: Expense) => {
    if (!window.confirm('Delete this expense?')) return;
    try {
      await deleteExpense.mutateAsync(expense.id);
      setSnackbar({ open: true, message: 'Expense deleted', severity: 'success' });
    } catch (error) {
      setSnackbar({
        open: true,
        message: error instanceof Error ? error.message : 'Failed to delete expense',
        severity: 'error',
      });
    }
  };

  const handleDeleteInflow = async (inflow: ExpenseInflow) => {
    if (!window.confirm('Delete this reimbursement?')) return;
    try {
      await deleteInflow.mutateAsync(inflow.id);
      setSnackbar({ open: true, message: 'Reimbursement deleted', severity: 'success' });
    } catch (error) {
      setSnackbar({
        open: true,
        message: error instanceof Error ? error.message : 'Failed to delete reimbursement',
        severity: 'error',
      });
    }
  };

  const expenseColumns: GridColDef[] = useMemo(() => {
    const cols: GridColDef[] = [
      {
        field: 'expenseDate',
        headerName: 'Date',
        width: 120,
        valueFormatter: (value: Date) => formatDate(value),
      },
      {
        field: 'type',
        headerName: 'Type',
        width: 140,
        valueFormatter: (value: string) => typeLabel[value] ?? value,
      },
      {
        field: 'subtype',
        headerName: 'Subtype',
        width: 130,
        valueFormatter: (value: string | undefined) =>
          value ? (subtypeLabel[value] ?? value) : '—',
      },
      {
        field: 'amount',
        headerName: 'Amount',
        width: 120,
        valueFormatter: (value: number) => formatCurrency(value),
      },
      { field: 'sedRepresentative', headerName: 'SED Rep', width: 130 },
      { field: 'region', headerName: 'Region', width: 110 },
      { field: 'depo', headerName: 'Depo', width: 120 },
      { field: 'note', headerName: 'Note', flex: 1, minWidth: 160 },
    ];

    if (isSuperAdmin) {
      cols.push({ field: 'walletManagerName', headerName: 'Wallet', width: 150 });
    }

    cols.push({
      field: 'actions',
      headerName: 'Actions',
      width: 110,
      sortable: false,
      renderCell: (params) => (
        <Box>
          <Tooltip title="Edit">
            <IconButton
              size="small"
              onClick={() => {
                setEditingExpense(params.row as Expense);
                setExpenseDialogOpen(true);
              }}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton
              size="small"
              color="error"
              onClick={() => handleDeleteExpense(params.row as Expense)}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    });

    return cols;
  }, [isSuperAdmin]);

  const inflowColumns: GridColDef[] = useMemo(
    () => [
      {
        field: 'inflowDate',
        headerName: 'Date',
        width: 120,
        valueFormatter: (value: Date) => formatDate(value),
      },
      {
        field: 'amount',
        headerName: 'Amount',
        width: 140,
        valueFormatter: (value: number) => formatCurrency(value),
      },
      { field: 'walletManagerName', headerName: 'Wallet', width: 160 },
      { field: 'note', headerName: 'Note', flex: 1, minWidth: 180 },
      {
        field: 'actions',
        headerName: 'Actions',
        width: 110,
        sortable: false,
        renderCell: (params) => (
          <Box>
            <Tooltip title="Edit">
              <IconButton
                size="small"
                onClick={() => {
                  setEditingInflow(params.row as ExpenseInflow);
                  setInflowDialogOpen(true);
                }}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton
                size="small"
                color="error"
                onClick={() => handleDeleteInflow(params.row as ExpenseInflow)}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        ),
      },
    ],
    [],
  );

  if (loadingExpenses || (canManageInflows && loadingInflows)) {
    return <LoadingScreen />;
  }

  const filteredTotal = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
        <Typography variant="h5" fontWeight={700}>
          Expenses
        </Typography>
        <Box display="flex" gap={1} flexWrap="wrap">
          {canManageInflows && (
            <Button
              variant="outlined"
              startIcon={<PaymentsIcon />}
              onClick={() => {
                setEditingInflow(undefined);
                setInflowDialogOpen(true);
              }}
            >
              Add Reimbursement
            </Button>
          )}
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setEditingExpense(undefined);
              setExpenseDialogOpen(true);
            }}
          >
            Add Expense
          </Button>
        </Box>
      </Box>

      {canManageInflows && (
        <ExpenseWalletSummary summaries={walletSummaries} isSuperAdmin={isSuperAdmin} />
      )}

      <ExpenseFiltersPanel filters={filters} onChange={setFilters} />

      {expensesError && (
        <Typography color="error" mb={2}>
          Could not load expenses. Deploy the latest Firestore rules and confirm Expenses access.
        </Typography>
      )}

      <Typography variant="body2" color="text.secondary" mb={1}>
        Showing {filteredExpenses.length} expenses · {formatCurrency(filteredTotal)}
      </Typography>

      <Box sx={{ height: 480, bgcolor: 'background.paper', borderRadius: 2, mb: 3 }}>
        <DataGrid
          rows={filteredExpenses}
          columns={expenseColumns}
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
          disableRowSelectionOnClick
          density="compact"
        />
      </Box>

      {canManageInflows && (
        <>
          <Typography variant="h6" fontWeight={600} mb={1}>
            Reimbursements (inflows)
          </Typography>
          <Box sx={{ height: 320, bgcolor: 'background.paper', borderRadius: 2 }}>
            <DataGrid
              rows={filteredInflows}
              columns={inflowColumns}
              pageSizeOptions={[10, 25]}
              initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
              disableRowSelectionOnClick
              density="compact"
            />
          </Box>
        </>
      )}

      <ExpenseFormDialog
        open={expenseDialogOpen}
        onClose={() => {
          setExpenseDialogOpen(false);
          setEditingExpense(undefined);
        }}
        onSubmit={handleExpenseSubmit}
        initialData={editingExpense}
        loading={createExpense.isPending || updateExpense.isPending}
        managers={managers}
        users={users}
        lockWallet={isManager}
        defaultWallet={defaultWallet}
      />

      {canManageInflows && (
        <ExpenseInflowFormDialog
          open={inflowDialogOpen}
          onClose={() => {
            setInflowDialogOpen(false);
            setEditingInflow(undefined);
          }}
          onSubmit={handleInflowSubmit}
          initialData={editingInflow}
          loading={createInflow.isPending || updateInflow.isPending}
          managers={managers}
          lockWallet={isManager}
          defaultWallet={defaultWallet}
        />
      )}

      <AppSnackbar
        open={snackbar.open}
        message={snackbar.message}
        severity={snackbar.severity}
        onClose={() => setSnackbar((current) => ({ ...current, open: false }))}
      />
    </Box>
  );
}
