import { Chip } from '@mui/material';
import type { PaymentStatus } from '@/types';
import { getPaymentStatusLabel } from '@/utils';

interface Props {
  status: PaymentStatus;
}

const STATUS_HIGHLIGHT: Record<PaymentStatus, { bgcolor: string; color: string }> = {
  UNPAID: { bgcolor: '#8B0000', color: '#fff' },
  PARTIALLY_PAID: { bgcolor: '#F57C00', color: '#fff' },
  PAID: { bgcolor: '#2E7D32', color: '#fff' },
};

export function PaymentStatusChip({ status }: Props) {
  const colors = STATUS_HIGHLIGHT[status] ?? STATUS_HIGHLIGHT.UNPAID;

  return (
    <Chip
      label={getPaymentStatusLabel(status)}
      size="small"
      sx={{
        bgcolor: colors.bgcolor,
        color: colors.color,
        fontWeight: 700,
        border: 0,
      }}
    />
  );
}
