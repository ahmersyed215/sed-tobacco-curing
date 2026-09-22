import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Typography,
  IconButton,
  Tooltip,
  FormControlLabel,
  Checkbox,
  Chip,
} from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import RestoreIcon from '@mui/icons-material/Restore';
import {
  useUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  useRestoreUser,
} from '@/hooks/useUsers';
import { accessSummary, PERMISSION_KEYS, ROLE_LABELS } from '@/auth/access';
import { useAuth } from '@/contexts/AuthContext';
import { useAccess } from '@/hooks/useAdmin';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { AppSnackbar } from '@/components/common/AppSnackbar';
import { UserFormDialog } from '@/features/users/UserFormDialog';
import { formatDate } from '@/utils';
import type { AppUser, UserFormData } from '@/types';

export function UsersPage() {
  const { user } = useAuth();
  const { isSuperAdmin, profile } = useAccess();
  const assignablePermissions = PERMISSION_KEYS.filter(
    (key) => isSuperAdmin || profile?.permissions[key] === true,
  );
  const [showDeleted, setShowDeleted] = useState(false);
  const { data: users = [], isLoading } = useUsers(showDeleted);
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();
  const deleteMutation = useDeleteUser();
  const restoreMutation = useRestoreUser();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | undefined>();
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const actorEmail = user?.email ?? '';

  const handleCreate = async (data: UserFormData) => {
    if (!actorEmail) return;
    try {
      await createMutation.mutateAsync({
        data,
        actorEmail,
      });
      setDialogOpen(false);
      setSnackbar({ open: true, message: 'User created successfully', severity: 'success' });
    } catch (error) {
      setSnackbar({
        open: true,
        message: error instanceof Error ? error.message : 'Failed to create user',
        severity: 'error',
      });
    }
  };

  const handleUpdate = async (data: UserFormData) => {
    if (!actorEmail || !editingUser) return;
    try {
      await updateMutation.mutateAsync({
        id: editingUser.id,
        data: {
          email: data.email,
          name: data.name,
          phone: data.phone,
          notes: data.notes,
          role: data.role,
          permissions: data.permissions,
          noLogin: data.noLogin,
        },
        actorEmail,
      });
      setDialogOpen(false);
      setEditingUser(undefined);
      setSnackbar({ open: true, message: 'User updated successfully', severity: 'success' });
    } catch (error) {
      setSnackbar({
        open: true,
        message: error instanceof Error ? error.message : 'Failed to update user',
        severity: 'error',
      });
    }
  };

  const handleDelete = async (appUser: AppUser) => {
    if (!actorEmail) return;
    if (!window.confirm(`Delete profile for ${appUser.name || appUser.email}?`)) return;

    try {
      await deleteMutation.mutateAsync({ id: appUser.id, actorEmail });
      setSnackbar({ open: true, message: 'User marked as deleted', severity: 'success' });
    } catch (error) {
      setSnackbar({
        open: true,
        message: error instanceof Error ? error.message : 'Failed to delete user',
        severity: 'error',
      });
    }
  };

  const handleRestore = async (appUser: AppUser) => {
    if (!actorEmail) return;
    try {
      await restoreMutation.mutateAsync({ id: appUser.id, actorEmail });
      setSnackbar({ open: true, message: 'User restored', severity: 'success' });
    } catch (error) {
      setSnackbar({
        open: true,
        message: error instanceof Error ? error.message : 'Failed to restore user',
        severity: 'error',
      });
    }
  };

  const columns: GridColDef[] = useMemo(
    () => [
      { field: 'name', headerName: 'Name', flex: 1, minWidth: 150 },
      {
        field: 'email',
        headerName: 'Email',
        flex: 1,
        minWidth: 180,
        valueGetter: (_, row: AppUser) => (row.hasLogin ? row.email : '—'),
      },
      { field: 'phone', headerName: 'Phone', width: 130 },
      {
        field: 'login',
        headerName: 'Login',
        width: 120,
        valueGetter: (_, row: AppUser) => (row.hasLogin ? 'Login' : 'Directory'),
        renderCell: (params) => (
          <Chip
            size="small"
            label={params.value}
            color={params.value === 'Login' ? 'success' : 'default'}
            variant="outlined"
          />
        ),
      },
      {
        field: 'role',
        headerName: 'Role',
        width: 140,
        renderCell: (params) => {
          const role = (params.row as AppUser).role;
          return (
            <Chip
              size="small"
              label={ROLE_LABELS[role]}
              color={role === 'super_admin' ? 'primary' : role === 'manager' ? 'secondary' : 'default'}
              variant={role === 'field_staff' ? 'outlined' : 'filled'}
            />
          );
        },
      },
      {
        field: 'access',
        headerName: 'Access',
        flex: 1.2,
        minWidth: 220,
        sortable: false,
        valueGetter: (_, row: AppUser) => accessSummary(row),
      },
      {
        field: 'uid',
        headerName: 'UID',
        width: 220,
        valueGetter: (_, row: AppUser) => (row.hasLogin ? row.uid : '—'),
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 110,
        valueGetter: (_, row: AppUser) => (row.isDeleted ? 'Deleted' : 'Active'),
        renderCell: (params) => (
          <Chip
            size="small"
            label={params.value}
            color={params.value === 'Active' ? 'success' : 'default'}
            variant={params.value === 'Active' ? 'filled' : 'outlined'}
          />
        ),
      },
      { field: 'createdBy', headerName: 'Added By', width: 160 },
      {
        field: 'createdAt',
        headerName: 'Added On',
        width: 120,
        valueFormatter: (value: Date) => formatDate(value),
      },
      { field: 'updatedBy', headerName: 'Updated By', width: 160 },
      {
        field: 'updatedAt',
        headerName: 'Updated On',
        width: 120,
        valueFormatter: (value: Date) => formatDate(value),
      },
      { field: 'deletedBy', headerName: 'Deleted By', width: 160 },
      {
        field: 'actions',
        headerName: 'Actions',
        width: 120,
        sortable: false,
        renderCell: (params) => (
          <Box>
            {!params.row.isDeleted && (
              <>
                <Tooltip
                  title={
                    params.row.role === 'super_admin' && !isSuperAdmin
                      ? 'Only a super admin can change this account'
                      : 'Edit'
                  }
                >
                  <span>
                    <IconButton
                      size="small"
                      disabled={params.row.role === 'super_admin' && !isSuperAdmin}
                      onClick={() => {
                        setEditingUser(params.row);
                        setDialogOpen(true);
                      }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip
                  title={
                    params.row.role === 'super_admin' && !isSuperAdmin
                      ? 'Only a super admin can change this account'
                      : 'Delete'
                  }
                >
                  <span>
                    <IconButton
                      size="small"
                      color="error"
                      disabled={params.row.role === 'super_admin' && !isSuperAdmin}
                      onClick={() => handleDelete(params.row)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </>
            )}
            {params.row.isDeleted && (
              <Tooltip title="Restore">
                <IconButton size="small" color="primary" onClick={() => handleRestore(params.row)}>
                  <RestoreIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        ),
      },
    ],
    [isSuperAdmin],
  );

  if (isLoading) return <LoadingScreen />;

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
        <Typography variant="h5" fontWeight={700}>
          Users
        </Typography>
        <Box display="flex" alignItems="center" gap={2}>
          <FormControlLabel
            control={
              <Checkbox checked={showDeleted} onChange={(e) => setShowDeleted(e.target.checked)} />
            }
            label="Show deleted"
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setEditingUser(undefined);
              setDialogOpen(true);
            }}
          >
            Add User
          </Button>
        </Box>
      </Box>

      <Typography variant="body2" color="text.secondary" mb={2}>
        Choose a role and turn on the areas that person can open. For field staff who never sign in,
        check &quot;No login access&quot; — they still appear in SED Representative and other lists.
      </Typography>

      <Box sx={{ height: 620, bgcolor: 'background.paper', borderRadius: 2 }}>
        <DataGrid
          rows={users}
          columns={columns}
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
          disableRowSelectionOnClick
          density="compact"
          getRowClassName={(params) => (params.row.isDeleted ? 'deleted-row' : '')}
          sx={{
            '& .deleted-row': { opacity: 0.65 },
          }}
        />
      </Box>

      <UserFormDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingUser(undefined);
        }}
        onSubmit={editingUser ? handleUpdate : handleCreate}
        initialData={editingUser}
        loading={createMutation.isPending || updateMutation.isPending}
        allowRoleEdit
        lockAccess={editingUser?.uid === user?.uid}
        canAssignSuperAdmin={isSuperAdmin}
        assignablePermissions={assignablePermissions}
      />

      <AppSnackbar
        open={snackbar.open}
        message={snackbar.message}
        severity={snackbar.severity}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      />
    </Box>
  );
}
