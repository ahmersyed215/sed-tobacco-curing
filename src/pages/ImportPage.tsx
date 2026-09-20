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
import { EXCEL_COLUMNS, EXCEL_IMPORT_NOTES, IMPORT_FILE_ACCEPT, QUERY_KEYS } from '@/constants';
import {
  parseExcelFile,
  validateImportRows,
  confirmImport,
  type ImportProgressPhase,
} from '@/services/exportService';
import { buildReceiptImportIndex } from '@/services/installationService';
import { useAuth } from '@/contexts/AuthContext';
import type { ExcelImportRow, ImportResult, ImportValidationError } from '@/types';

type Step = 'upload' | 'preview' | 'importing' | 'done';

export function ImportPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('upload');
  const [validRows, setValidRows] = useState<ExcelImportRow[]>([]);
  const [errors, setErrors] = useState<ImportValidationError[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [previewCounts, setPreviewCounts] = useState<{ create: number; update: number } | null>(
    null,
  );
  const [fileError, setFileError] = useState('');
  const [progress, setProgress] = useState<{
    phase: ImportProgressPhase;
    done: number;
    total: number;
  } | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileError('');
    setPreviewCounts(null);
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

      if (valid.length > 0) {
        try {
          const receiptIndex = await buildReceiptImportIndex();
          let create = 0;
          let update = 0;
          valid.forEach((row) => {
            if (receiptIndex.has(row.receiptId.trim())) update += 1;
            else create += 1;
          });
          setPreviewCounts({ create, update });
        } catch {
          setPreviewCounts(null);
        }
      }
    } catch (error) {
      setFileError(
        error instanceof Error
          ? error.message
          : 'Failed to parse spreadsheet. Please check the format.',
      );
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
    setProgress({ phase: 'checking', done: 0, total: 1 });
    setStep('importing');

    try {
      const result = await confirmImport(validRows, user.email, (phase, done, total) => {
        setProgress({ phase, done, total });
      });
      setImportResult(result);
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.installations });
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.allPayments });
      setProgress(null);
      setStep('done');
    } catch (error) {
      setProgress(null);
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
    setImportResult(null);
    setPreviewCounts(null);
    setFileError('');
    setProgress(null);
  };

  const progressPercent =
    progress && progress.total > 0
      ? Math.min(100, Math.round((progress.done / progress.total) * 100))
      : 0;

  const progressLabel =
    progress?.phase === 'checking'
      ? 'Matching receipt IDs…'
      : progress && progress.total > 0
        ? `Imported ${progress.done.toLocaleString()} / ${progress.total.toLocaleString()} records…`
        : 'Importing records to Firestore…';

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={2}>
        Import Data
      </Typography>

      <Paper sx={{ p: 3, mb: 2 }}>
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          Expected Columns
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={1}>
          {EXCEL_COLUMNS.join(' · ')}
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={0.5}>
          Supported files: {EXCEL_IMPORT_NOTES.fileFormats}
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
          Total Amount: {EXCEL_IMPORT_NOTES.totalAmount} · Device Quantity:{' '}
          {EXCEL_IMPORT_NOTES.deviceQuantity}
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={0.5}>
          Depo: {EXCEL_IMPORT_NOTES.depo}
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={0.5}>
          Receipt ID: {EXCEL_IMPORT_NOTES.receiptId}
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Paid Amount: {EXCEL_IMPORT_NOTES.paidAmount} · Recovered Amount:{' '}
          {EXCEL_IMPORT_NOTES.recoveredAmount}
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
              Upload XLSX / XLS / Numbers
              <input
                type="file"
                hidden
                accept={IMPORT_FILE_ACCEPT}
                onChange={handleFileChange}
              />
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
              {previewCounts &&
                ` · ${previewCounts.create} new · ${previewCounts.update} will overwrite`}
            </Alert>

            {validRows.length > 0 && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Receipt ID is the unique key. Re-importing an existing Receipt ID overwrites that
                installation and its payments for that receipt. Duplicate Receipt IDs in the file are
                rejected.
              </Alert>
            )}

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
                      <TableCell>Qty</TableCell>
                      <TableCell>Total</TableCell>
                      <TableCell>Paid</TableCell>
                      <TableCell>Recovered</TableCell>
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
                        <TableCell>{row.deviceQuantity}</TableCell>
                        <TableCell>{row.totalAmount}</TableCell>
                        <TableCell>{row.paidAmount ?? 0}</TableCell>
                        <TableCell>{row.recoveredAmount ?? 0}</TableCell>
                        <TableCell>
                          {row.totalAmount - (row.paidAmount ?? 0) - (row.recoveredAmount ?? 0)}
                        </TableCell>
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
            <Typography mb={2}>{progressLabel}</Typography>
            <LinearProgress
              variant={
                progress?.phase === 'writing' && progress.total > 0
                  ? 'determinate'
                  : 'indeterminate'
              }
              value={progressPercent}
            />
            {progress?.phase === 'writing' && progress.total > 0 && (
              <Typography variant="caption" color="text.secondary" mt={1} display="block">
                {progressPercent}%
              </Typography>
            )}
          </Box>
        )}

        {step === 'done' && importResult && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Imported {importResult.total} records ({importResult.created} created,{' '}
            {importResult.updated} overwritten). Open Installations to view them.
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
