import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Paper,
  Typography
} from '@mui/material';
import { useFamilyData } from '@/data/useFamilyData';
import { exportAllDataToExcel } from '@/lib/export';
import {
  computeMarkInterestPreview,
  executeMarkInterestCollected,
  type MarkInterestSummary
} from '@/lib/historicalMigration';
import { monoSx } from '@/theme';

type DialogStep = 'closed' | 'preview' | 'processing' | 'done';

export function Settings() {
  const { members, refresh } = useFamilyData();

  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const [step, setStep] = useState<DialogStep>('closed');
  const [summary, setSummary] = useState<MarkInterestSummary | null>(null);

  async function handleExport() {
    setExporting(true);
    setExportError(null);
    try {
      await exportAllDataToExcel();
    } catch (err) {
      setExportError((err as Error).message);
    } finally {
      setExporting(false);
    }
  }

  const preview = computeMarkInterestPreview(members);

  async function handleConfirm() {
    setStep('processing');
    const result = await executeMarkInterestCollected(members);
    setSummary(result);
    await refresh();
    setStep('done');
  }

  return (
    <Box sx={{ animation: 'fadeUp 0.35s ease both' }}>
      <Typography variant="h4" fontSize={20} mb={2}>
        Settings
      </Typography>

      <Paper sx={{ p: 2, borderRadius: 1, mb: 1.5 }}>
        <Typography fontSize={14} fontWeight={700} mb={0.5}>
          Export data
        </Typography>
        <Typography fontSize={12} color="text.secondary" mb={1.5}>
          Download every family member, deposit, withdrawal, and interest record as an Excel
          file — a full backup of everything the app stores.
        </Typography>
        {exportError && (
          <Alert severity="error" sx={{ mb: 1.5 }}>
            {exportError}
          </Alert>
        )}
        <Button variant="contained" onClick={handleExport} disabled={exporting}>
          {exporting ? 'Exporting…' : 'Export to Excel'}
        </Button>
      </Paper>

      <Paper sx={{ p: 2, borderRadius: 1, mb: 1.5 }}>
        <Typography fontSize={14} fontWeight={700} mb={0.5}>
          Mark Interest Collected Till Date
        </Typography>
        <Typography fontSize={12} color="text.secondary" mb={1.5}>
          For historical deposits entered after the fact — marks every interest cycle due up
          to today as already collected. Safe to run more than once; it never creates
          duplicates or touches future cycles.
        </Typography>
        <Button variant="contained" onClick={() => setStep('preview')}>
          Run
        </Button>
      </Paper>

      <Dialog
        open={step !== 'closed'}
        onClose={() => step !== 'processing' && setStep('closed')}
        fullWidth
        maxWidth="xs"
      >
        {step === 'preview' && (
          <>
            <DialogTitle fontSize={16}>Mark Interest Collected Till Date</DialogTitle>
            <DialogContent>
              <Typography fontSize={13} color="text.secondary" mb={2}>
                The system will create interest/withdrawal records for all pending months up
                to the current due date.
              </Typography>

              {preview.rows.length === 0 ? (
                <Typography fontSize={13}>Nothing to do — everything is already up to date.</Typography>
              ) : (
                <>
                  {preview.rows.map((r) => (
                    <Box key={r.memberId} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                      <Typography fontSize={13}>{r.memberName}</Typography>
                      <Typography sx={monoSx} fontSize={13}>
                        {r.recordCount} record{r.recordCount === 1 ? '' : 's'}
                      </Typography>
                    </Box>
                  ))}
                  <Divider sx={{ my: 1.5 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography fontSize={13} fontWeight={700}>
                      Total records to create
                    </Typography>
                    <Typography sx={monoSx} fontSize={13} fontWeight={700}>
                      {preview.totalRecords}
                    </Typography>
                  </Box>
                  <Typography fontSize={11.5} color="text.secondary" mt={1.5}>
                    Existing records will not be duplicated.
                  </Typography>
                </>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setStep('closed')}>Cancel</Button>
              <Button variant="contained" onClick={handleConfirm} disabled={preview.totalRecords === 0}>
                Confirm
              </Button>
            </DialogActions>
          </>
        )}

        {step === 'processing' && (
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4, gap: 2 }}>
            <CircularProgress size={28} />
            <Typography fontSize={13} color="text.secondary">
              Processing…
            </Typography>
          </DialogContent>
        )}

        {step === 'done' && summary && (
          <>
            <DialogTitle fontSize={16}>Done</DialogTitle>
            <DialogContent>
              <SummaryRow label="Family members processed" value={summary.membersProcessed} />
              <SummaryRow label="Records created" value={summary.recordsCreated} />
              <SummaryRow label="Records marked collected" value={summary.recordsMarkedCollected} />
              <SummaryRow label="Records skipped (already existed)" value={summary.recordsSkipped} />
              {summary.errors.length > 0 && (
                <Alert severity="warning" sx={{ mt: 1.5 }}>
                  {summary.errors.length} error{summary.errors.length === 1 ? '' : 's'} occurred —
                  check the browser console for details.
                </Alert>
              )}
            </DialogContent>
            <DialogActions>
              <Button variant="contained" onClick={() => setStep('closed')}>
                Close
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}

function SummaryRow({ label, value }: { label: string; value: number }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
      <Typography fontSize={13} color="text.secondary">
        {label}
      </Typography>
      <Typography sx={monoSx} fontSize={13} fontWeight={600}>
        {value}
      </Typography>
    </Box>
  );
}
