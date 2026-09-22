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
  Box,
  Typography,
} from '@mui/material';
import {
  defaultPermissions,
  emptyPermissions,
  fullPermissions,
  PERMISSION_CATALOG,
  PERMISSION_KEYS,
  ROLE_LABELS,
} from '@/auth/access';
import type { AppUser, Permission, UserFormData, UserRole } from '@/types';

function buildSchema(isEdit: boolean) {
  return yup.object({
    email: yup.string().when('noLogin', {
      is: true,
      then: (s) => s.optional(),
      otherwise: (s) => s.email('Invalid email').required('Email is required'),
    }),
    password: yup.string().when(['linkExisting', 'noLogin'], {
      is: (linkExisting: boolean, noLogin: boolean) =>
        !isEdit && !linkExisting && !noLogin,
      then: (s) =>
        s.min(6, 'Password must be at least 6 characters').required('Password is required'),
      otherwise: (s) => s.optional(),
    }),
    uid: yup.string().when(['linkExisting', 'noLogin'], {
      is: (linkExisting: boolean, noLogin: boolean) => linkExisting && !noLogin,
      then: (s) => s.required('UID is required for existing Auth users'),
      otherwise: (s) => s.optional(),
    }),
    name: yup.string().required('Name is required'),
    phone: yup.string().optional(),
    notes: yup.string().optional(),
    linkExisting: yup.boolean().required(),
    noLogin: yup.boolean().required(),
    role: yup
      .string()
      .oneOf(['super_admin', 'manager', 'field_staff'])
      .required('Role is required'),
    permissions: yup
      .object({
        dashboard: yup.boolean().required(),
        installations: yup.boolean().required(),
        payments: yup.boolean().required(),
        followups: yup.boolean().required(),
        statistics: yup.boolean().required(),
        expenses: yup.boolean().required(),
        inventory: yup.boolean().required(),
        import: yup.boolean().required(),
        users: yup.boolean().required(),
      })
      .required(),
  });
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: UserFormData) => Promise<void>;
  initialData?: AppUser;
  loading?: boolean;
  allowRoleEdit?: boolean;
  lockAccess?: boolean;
  canAssignSuperAdmin?: boolean;
  assignablePermissions?: Permission[];
}

export function UserFormDialog({
  open,
  onClose,
  onSubmit,
  initialData,
  loading,
  allowRoleEdit = false,
  lockAccess = false,
  canAssignSuperAdmin = false,
  assignablePermissions = [],
}: Props) {
  const isEdit = Boolean(initialData);
  const directoryOnly = initialData ? !initialData.hasLogin : false;
  const assignable = new Set(assignablePermissions);
  const resolver = yupResolver(buildSchema(isEdit));

  const {
    control,
    handleSubmit,
    watch,
    reset,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<UserFormData>({
    resolver: resolver as never,
    defaultValues: {
      email: '',
      password: '',
      uid: '',
      name: '',
      phone: '',
      notes: '',
      linkExisting: false,
      noLogin: false,
      role: 'field_staff',
      permissions: defaultPermissions('field_staff'),
    },
  });

  const linkExisting = watch('linkExisting');
  const noLogin = watch('noLogin');
  const role = watch('role');

  useEffect(() => {
    if (open) {
      const nextRole = initialData?.role ?? 'field_staff';
      const isDirectory = initialData ? !initialData.hasLogin : false;
      reset({
        email: initialData?.email ?? '',
        password: '',
        uid: initialData?.uid ?? '',
        name: initialData?.name ?? '',
        phone: initialData?.phone ?? '',
        notes: initialData?.notes ?? '',
        linkExisting: false,
        noLogin: isDirectory,
        role: isDirectory ? 'field_staff' : nextRole,
        permissions: isDirectory
          ? emptyPermissions()
          : nextRole === 'super_admin'
            ? fullPermissions()
            : (initialData?.permissions ?? defaultPermissions(nextRole)),
      });
    }
  }, [open, initialData, reset]);

  const showAccessEditor = allowRoleEdit && !lockAccess && !noLogin;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? 'Edit User' : 'Add User'}</DialogTitle>
      <DialogContent>
        {!isEdit && (
          <>
            <Alert severity="info" sx={{ mt: 1, mb: 2 }}>
              Create a login account, link an existing Firebase Auth user, or add a directory-only
              person (no email/login) for SED representative lists.
            </Alert>
            <Controller
              name="noLogin"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={field.value}
                      onChange={(event) => {
                        const checked = event.target.checked;
                        field.onChange(checked);
                        if (checked) {
                          setValue('linkExisting', false);
                          setValue('email', '');
                          setValue('password', '');
                          setValue('uid', '');
                          setValue('role', 'field_staff');
                          setValue('permissions', emptyPermissions());
                        } else {
                          setValue('permissions', defaultPermissions(getValues('role')));
                        }
                      }}
                    />
                  }
                  label="No login access (directory only — no email)"
                />
              )}
            />
            {!noLogin && (
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
            )}
          </>
        )}

        {isEdit && directoryOnly && (
          <Alert severity="info" sx={{ mt: 1, mb: 1 }}>
            This person has no login. They appear in lists like SED Representative, but cannot sign
            in.
          </Alert>
        )}

        {!isEdit && !noLogin && linkExisting && (
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

        {!noLogin && (
          <Controller
            name="email"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label="Email"
                margin="normal"
                disabled={isEdit && directoryOnly}
                error={!!errors.email}
                helperText={errors.email?.message}
              />
            )}
          />
        )}

        {!isEdit && !noLogin && !linkExisting && (
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

        {lockAccess && (
          <Alert severity="info" sx={{ mt: 2 }}>
            You can update your profile details. Another person with user access has to change your
            role or permissions.
          </Alert>
        )}

        {noLogin && !isEdit && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Directory-only people are saved as field staff with no app access. Use them for SED
            Representative and similar dropdowns.
          </Alert>
        )}

        {showAccessEditor && (
          <>
            <Controller
              name="role"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  fullWidth
                  label="Role"
                  margin="normal"
                  onChange={(event) => {
                    const nextRole = event.target.value as UserRole;
                    field.onChange(nextRole);
                    const defaults = defaultPermissions(nextRole);
                    const current = getValues('permissions');
                    for (const key of PERMISSION_KEYS) {
                      if (!assignable.has(key)) defaults[key] = Boolean(current?.[key]);
                    }
                    setValue('permissions', defaults);
                  }}
                >
                  {canAssignSuperAdmin && (
                    <MenuItem value="super_admin">{ROLE_LABELS.super_admin}</MenuItem>
                  )}
                  <MenuItem value="manager">{ROLE_LABELS.manager}</MenuItem>
                  <MenuItem value="field_staff">{ROLE_LABELS.field_staff}</MenuItem>
                </TextField>
              )}
            />

            {role === 'super_admin' ? (
              <Alert severity="info" sx={{ mt: 1 }}>
                Super admin has every area, including expenses, inventory, statistics, and users.
              </Alert>
            ) : (
              <Box
                sx={{
                  mt: 2,
                  p: 1.5,
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 2,
                }}
              >
                <Typography variant="subtitle2">Access</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Turn on only the areas this person should see. Dashboard and statistics show
                  current company data. Expenses and inventory stay hidden until you grant them.
                </Typography>
                {PERMISSION_CATALOG.map((item) => (
                  <Controller
                    key={item.key}
                    name={`permissions.${item.key}`}
                    control={control}
                    render={({ field }) => (
                      <FormControlLabel
                        sx={{ alignItems: 'flex-start', display: 'flex', ml: 0, my: 0.5 }}
                        control={
                          <Checkbox
                            checked={Boolean(field.value)}
                            onChange={(event) => field.onChange(event.target.checked)}
                            disabled={!assignable.has(item.key)}
                            sx={{ pt: 0.25 }}
                          />
                        }
                        label={
                          <Box>
                            <Typography variant="body2">{item.label}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {item.description}
                            </Typography>
                          </Box>
                        }
                      />
                    )}
                  />
                ))}
              </Box>
            )}
          </>
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
