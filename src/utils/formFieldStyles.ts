import type { SxProps, Theme } from '@mui/material';

export function isEmptyFormValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (typeof value === 'number') return value === 0;
  return false;
}

export function emptyFieldHighlightSx(
  highlight: boolean,
  isEmpty: boolean,
  hasError: boolean,
): SxProps<Theme> {
  if (!highlight || !isEmpty || hasError) return {};

  return {
    '& .MuiOutlinedInput-root': {
      bgcolor: 'warning.50',
      '& fieldset': {
        borderColor: 'warning.main',
        borderWidth: 2,
      },
      '&:hover fieldset': {
        borderColor: 'warning.dark',
      },
    },
    '& .MuiInputLabel-root': {
      color: 'warning.dark',
      fontWeight: 600,
    },
  };
}
