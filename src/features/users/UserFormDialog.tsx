import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControlLabel,
  Checkbox,
  Alert,
  MenuItem,
} from '@mui/material';
import type { AppUser, UserFormData } from '@/types';

const schema = yup.object({
  email: yup.string().email('Invalid email').required('Email is required'),
  password: yup.string().when('linkExisting', {
    is: false,
    then: (s) => s.min(6, 'Password must be at least 6 characters').required('Password is required'),
    otherwise: (s) => s.optional(),
  }),
  uid: yup.string().when('linkExisting', {
    is: true,
    then: (s) => s.required('UID is required for existing Auth users'),
    otherwise: (s) => s.optional(),
  }),
  name: yup.string().required('Name is required'),
  phone: yup.string().optional(),
  notes: yup.string().optional(),
  linkExisting: yup.boolean().required(),
});

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: UserFormData) => Promise<void>;
  initialData?: AppUser;
  loading?: boolean;
  allowRoleEdit?: boolean;
}

export function UserFormDialog({
  open,
  onClose,
  onSubmit,
  initialData,
  loading,
  allowRoleEdit = false,
}: Props) {
  const isEdit = Boolean(initialData);

  const {
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<UserFormData>({
    resolver: yupResolver(schema),
    defaultValues: {
      email: '',
      password: '',
      uid: '',
      name: '',
      phone: '',
      notes: '',
      linkExisting: false,
      role: 'user',
    },
  });

  const linkExisting = watch('linkExisting');

  useEffect(() => {
    if (open) {
      reset({
        email: initialData?.email ?? '',
        password: '',
        uid: initialData?.uid ?? '',
        name: initialData?.name ?? '',
        phone: initialData?.phone ?? '',
        notes: initialData?.notes ?? '',
        linkExisting: false,
        role: initialData?.role ?? 'user',
      });
    }
  }, [open, initialData, reset]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? 'Edit User' : 'Add User'}</DialogTitle>
      <DialogContent>
        {!isEdit && (
          <>
            <Alert severity="info" sx={{ mt: 1, mb: 2 }}>
              Create a new Firebase Auth account, or link a profile to a user already created in
              Firebase Authentication (copy UID from the Firebase console).
            </Alert>
            <Controller
              name="linkExisting"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Checkbox {...field} checked={field.value} />}
                  label="User already exists in Firebase Authentication"
                />
              )}
            />
          </>
        )}

        {!isEdit && linkExisting && (
          <Controller
            name="uid"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label="Firebase UID"
                margin="normal"
                error={!!errors.uid}
                helperText={errors.uid?.message}
              />
            )}
          />
        )}

        <Controller
          name="email"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              label="Email"
              margin="normal"
              error={!!errors.email}
              helperText={errors.email?.message}
            />
          )}
        />

        {!isEdit && !linkExisting && (
          <Controller
            name="password"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                type="password"
                fullWidth
                label="Password"
                margin="normal"
                error={!!errors.password}
                helperText={errors.password?.message}
              />
            )}
          />
        )}

        <Controller
          name="name"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              label="Full Name"
              margin="normal"
              error={!!errors.name}
              helperText={errors.name?.message}
            />
          )}
        />

        <Controller
          name="phone"
          control={control}
          render={({ field }) => (
            <TextField {...field} fullWidth label="Phone (Optional)" margin="normal" />
          )}
        />

        <Controller
          name="notes"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              label="Notes (Optional)"
              margin="normal"
              multiline
              rows={2}
            />
          )}
        />

        {allowRoleEdit && (
          <Controller
            name="role"
            control={control}
            render={({ field }) => (
              <TextField {...field} select fullWidth label="Role" margin="normal">
                <MenuItem value="user">User</MenuItem>
                <MenuItem value="admin">Administrator</MenuItem>
              </TextField>
            )}
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit(onSubmit)} disabled={loading}>
          {loading ? 'Saving...' : isEdit ? 'Update User' : 'Create User'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
