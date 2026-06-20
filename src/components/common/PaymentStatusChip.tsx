import { Chip } from '@mui/material';
import type { PaymentStatus } from '@/types';
import { getPaymentStatusColor, getPaymentStatusLabel } from '@/utils';

interface Props {
  status: PaymentStatus;
}

export function PaymentStatusChip({ status }: Props) {
  return (
    <Chip
      label={getPaymentStatusLabel(status)}
      color={getPaymentStatusColor(status)}
      size="small"
      variant="outlined"
    />
  );
}
