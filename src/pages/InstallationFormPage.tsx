import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, Button, Typography, Paper, alpha, useTheme } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import EditIcon from '@mui/icons-material/Edit';
import { InstallationForm } from '@/features/installations/InstallationForm';
import { useCreateInstallation, useInstallation, useUpdateInstallation } from '@/hooks/useInstallations';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { AppSnackbar } from '@/components/common/AppSnackbar';
import type { InstallationFormData } from '@/types';

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = String((error as { code: string }).code);
    if (code === 'permission-denied') {
      return 'Permission denied. Deploy Firestore rules and ensure you are logged in.';
    }
  }
  return 'Failed to save installation';
}

export function InstallationFormPage() {
  const theme = useTheme();
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEdit = Boolean(id);
  const { data: installation, isLoading } = useInstallation(id);
  const createMutation = useCreateInstallation();
  const updateMutation = useUpdateInstallation();
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const handleSubmit = async (data: InstallationFormData) => {
    const initialPaid = isEdit ? 0 : (data.paidAmount ?? 0);
    if (!isEdit && initialPaid === 0 && !data.followupDate) {
      setSnackbar({
        open: true,
        message: 'Follow-up date is required when no initial payment is made',
        severity: 'error',
      });
      return;
    }

    if (!user?.email) {
      setSnackbar({ open: true, message: 'You must be logged in to save installations', severity: 'error' });
      return;
    }

    try {
      if (isEdit && id) {
        await updateMutation.mutateAsync({ id, data });
        setSnackbar({ open: true, message: 'Installation updated successfully', severity: 'success' });
        navigate(`/installations/${id}`);
      } else {
        const newId = await createMutation.mutateAsync({ data, userEmail: user.email });
        setSnackbar({ open: true, message: 'Installation created successfully', severity: 'success' });
        navigate(`/installations/${newId}`);
      }
    } catch (error) {
      setSnackbar({ open: true, message: getErrorMessage(error), severity: 'error' });
    }
  };

  if (isEdit && isLoading) return <LoadingScreen />;

  return (
    <Box>
      <Paper
        sx={{
          p: { xs: 2, md: 3 },
          mb: 3,
          borderRadius: 3,
          border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
          background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
        }}
      >
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ mb: 2 }}>
          Back
        </Button>
        <Box display="flex" alignItems="center" gap={1.5}>
          {isEdit ? (
            <EditIcon color="primary" fontSize="large" />
          ) : (
            <AddCircleOutlineIcon color="primary" fontSize="large" />
          )}
          <Box>
            <Typography variant="h4" fontWeight={700}>
              {isEdit ? 'Edit Installation' : 'Add Installation'}
            </Typography>
            <Typography variant="body2" color="text.secondary" mt={0.5}>
              {isEdit
                ? 'Update installation details and payment follow-up information.'
                : 'Enter farmer, device, receipt book ID, and payment details. Amounts are prefilled by device type but can be edited for concessions.'}
            </Typography>
          </Box>
        </Box>
      </Paper>

      <InstallationForm
        initialData={installation ?? undefined}
        amountReceived={installation?.amountReceived ?? 0}
        onSubmit={handleSubmit}
        loading={createMutation.isPending || updateMutation.isPending}
        highlightEmpty={!isEdit}
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
