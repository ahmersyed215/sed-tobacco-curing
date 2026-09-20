import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Button,
  Grid,
  Paper,
  Typography,
  Divider,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import PaymentsIcon from '@mui/icons-material/Payments';
import { useInstallation } from '@/hooks/useInstallations';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { PaymentStatusChip } from '@/components/common/PaymentStatusChip';
import { formatCurrency, formatDate, formatDeviceTypeLabel } from '@/utils';

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <Grid item xs={12} sm={6} md={4}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="body1" fontWeight={500}>{value || '—'}</Typography>
    </Grid>
  );
}

export function InstallationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: installation, isLoading } = useInstallation(id);

  if (isLoading) return <LoadingScreen />;
  if (!installation) {
    return (
      <Box>
        <Typography>Installation not found.</Typography>
        <Button onClick={() => navigate('/installations')}>Back to list</Button>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/installations')}>
          Back
        </Button>
        <Box display="flex" gap={1}>
          <Button startIcon={<PaymentsIcon />} variant="outlined" onClick={() => navigate(`/payments/${installation.id}`)}>
            View Payments
          </Button>
          <Button startIcon={<EditIcon />} variant="contained" onClick={() => navigate(`/installations/${installation.id}/edit`)}>
            Edit
          </Button>
        </Box>
      </Box>

      <Paper sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h5" fontWeight={700}>{installation.farmerName}</Typography>
          <PaymentStatusChip status={installation.paymentStatus} />
        </Box>
        <Divider sx={{ mb: 3 }} />

        <Grid container spacing={2}>
          <DetailRow label="Device Type" value={formatDeviceTypeLabel(installation.deviceType)} />
          <DetailRow label="Device Quantity" value={String(installation.deviceQuantity ?? 1)} />
          <DetailRow label="Device ID" value={installation.deviceId ?? ''} />
          <DetailRow label="Farmer Number" value={installation.farmerNumber} />
          <DetailRow label="CNIC" value={installation.farmerCNIC} />
          <DetailRow label="Region" value={installation.region} />
          <DetailRow label="Depo" value={installation.depo} />
          <DetailRow label="Location" value={installation.location ?? ''} />
          <DetailRow label="SED Representative" value={installation.sedRepresentative} />
          <DetailRow label="PTC Representative" value={installation.ptcRepresentative} />
          <DetailRow label="Installation Date" value={formatDate(installation.installationDate)} />
          <DetailRow label="Follow-up Date" value={formatDate(installation.followupDate)} />
          <DetailRow label="Total Amount" value={formatCurrency(installation.totalAmount)} />
          <DetailRow label="Amount Received" value={formatCurrency(installation.amountReceived)} />
          <DetailRow label="Amount Pending" value={formatCurrency(installation.amountPending)} />
          <DetailRow label="Latest Receipt ID" value={installation.latestReceiptId ?? ''} />
        </Grid>
      </Paper>
    </Box>
  );
}
