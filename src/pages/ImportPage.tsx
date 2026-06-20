import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Typography,
  Paper,
  Alert,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  LinearProgress,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { useQueryClient } from '@tanstack/react-query';
import { EXCEL_COLUMNS, EXCEL_IMPORT_NOTES, QUERY_KEYS } from '@/constants';
import {
  parseExcelFile,
  validateImportRows,
  confirmImport,
} from '@/services/exportService';
import { useAuth } from '@/contexts/AuthContext';
import type { ExcelImportRow, ImportValidationError } from '@/types';

type Step = 'upload' | 'preview' | 'importing' | 'done';

export function ImportPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('upload');
  const [validRows, setValidRows] = useState<ExcelImportRow[]>([]);
  const [errors, setErrors] = useState<ImportValidationError[]>([]);
  const [importedCount, setImportedCount] = useState(0);
  const [fileError, setFileError] = useState('');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileError('');
    try {
      const rows = await parseExcelFile(file);
      if (rows.length === 0) {
        setFileError('The uploaded file contains no data rows.');
        return;
      }

      const { validRows: valid, errors: validationErrors } = validateImportRows(rows);
      setValidRows(valid);
      setErrors(validationErrors);
      setStep('preview');
    } catch {
      setFileError('Failed to parse Excel file. Please check the format.');
    }

    e.target.value = '';
  };

  const handleImport = async () => {
    if (validRows.length === 0) return;

    if (!user?.email) {
      setFileError('You must be logged in to import records.');
      return;
    }

    setFileError('');
    setStep('importing');

    try {
      const count = await confirmImport(validRows, user.email);
      setImportedCount(count);
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.installations });
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.allPayments });
      setStep('done');
    } catch (error) {
      setFileError(
        error instanceof Error ? error.message : 'Import failed. Please try again.',
      );
      setStep('preview');
    }
  };

  const reset = () => {
    setStep('upload');
    setValidRows([]);
    setErrors([]);
    setImportedCount(0);
    setFileError('');
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={2}>
        Import Excel
      </Typography>

      <Paper sx={{ p: 3, mb: 2 }}>
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          Expected Columns
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={1}>
          {EXCEL_COLUMNS.join(' · ')}
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={0.5}>
          Farmer Name: {EXCEL_IMPORT_NOTES.farmerName}
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={0.5}>
          PTC Representative: {EXCEL_IMPORT_NOTES.ptcRepresentative}
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={0.5}>
          Installation Date / Followup Date: {EXCEL_IMPORT_NOTES.dates}
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={0.5}>
          Total Amount: {EXCEL_IMPORT_NOTES.totalAmount} · Depo: {EXCEL_IMPORT_NOTES.depo}
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Receipt ID: {EXCEL_IMPORT_NOTES.receiptId} · Paid Amount: {EXCEL_IMPORT_NOTES.paidAmount}
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block" mb={2}>
          If import fails with permission errors, deploy Firestore rules: firebase deploy --only firestore
        </Typography>

        {fileError && step !== 'upload' && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {fileError}
          </Alert>
        )}

        {step === 'upload' && (
          <>
            <Button variant="contained" component="label" startIcon={<UploadFileIcon />}>
              Upload XLSX / XLS
              <input type="file" hidden accept=".xlsx,.xls" onChange={handleFileChange} />
            </Button>
            {fileError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {fileError}
              </Alert>
            )}
          </>
        )}

        {step === 'preview' && (
          <>
            <Alert severity={errors.length ? 'warning' : 'success'} sx={{ mb: 2 }}>
              {validRows.length} valid records found
              {errors.length > 0 && ` · ${errors.length} validation errors`}
            </Alert>

            {errors.length > 0 && (
              <Table size="small" sx={{ mb: 2 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Row</TableCell>
                    <TableCell>Field</TableCell>
                    <TableCell>Error</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {errors.slice(0, 20).map((err, i) => (
                    <TableRow key={i}>
                      <TableCell>{err.row}</TableCell>
                      <TableCell>{err.field}</TableCell>
                      <TableCell>{err.message}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {validRows.length > 0 && (
              <>
                <Typography variant="subtitle2" mb={1}>
                  Preview (first 5 records)
                </Typography>
                <Table size="small" sx={{ mb: 2 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Farmer</TableCell>
                      <TableCell>Region</TableCell>
                      <TableCell>Device</TableCell>
                      <TableCell>Total</TableCell>
                      <TableCell>Paid</TableCell>
                      <TableCell>Remaining</TableCell>
                      <TableCell>Receipt ID</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {validRows.slice(0, 5).map((row, i) => (
                      <TableRow key={i}>
                        <TableCell>{row.farmerName}</TableCell>
                        <TableCell>{row.region}</TableCell>
                        <TableCell>{row.deviceType}</TableCell>
                        <TableCell>{row.totalAmount}</TableCell>
                        <TableCell>{row.paidAmount ?? 0}</TableCell>
                        <TableCell>{row.totalAmount - (row.paidAmount ?? 0)}</TableCell>
                        <TableCell>{row.receiptId ?? '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <Box display="flex" gap={2}>
                  <Button variant="contained" onClick={handleImport} disabled={validRows.length === 0}>
                    Confirm Import ({validRows.length} records)
                  </Button>
                  <Button variant="outlined" onClick={reset}>
                    Cancel
                  </Button>
                </Box>
              </>
            )}
          </>
        )}

        {step === 'importing' && (
          <Box>
            <Typography mb={2}>Importing records to Firestore...</Typography>
            <LinearProgress />
          </Box>
        )}

        {step === 'done' && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Successfully imported {importedCount} installation records. Open Installations to view them.
          </Alert>
        )}

        {step === 'done' && (
          <Box display="flex" gap={2}>
            <Button variant="contained" onClick={() => navigate('/installations')}>
              View Installations
            </Button>
            <Button variant="outlined" onClick={reset}>
              Import Another File
            </Button>
          </Box>
        )}
      </Paper>
    </Box>
  );
}
