/**
 * All money in this app is stored and computed as INTEGER PAISE, never
 * floats — identical convention to MIG Stock's formatMoney. Only the
 * display layer converts to rupees, and only ever for showing to a human.
 */
export function fmtMoney(paise: number): string {
  const rupees = paise / 100;
  return (
    'Rs. ' +
    rupees.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  );
}

/** Converts a rupee value typed into a form field into integer paise. */
export function rupeesToPaise(rupeeInput: string | number): number {
  const rupees = typeof rupeeInput === 'string' ? parseFloat(rupeeInput) : rupeeInput;
  if (!rupees || rupees <= 0 || Number.isNaN(rupees)) return 0;
  return Math.round(rupees * 100);
}

/**
 * Strips an amount-field's raw input down to digits + at most one decimal
 * point — this is the value actually stored in state and passed to
 * rupeesToPaise. Keeping this separate from the comma-formatted display
 * (formatAmountInput) means the stored value never has to be "un-formatted"
 * before parsing.
 */
export function sanitizeAmountInput(raw: string): string {
  const cleaned = raw.replace(/[^\d.]/g, '');
  const firstDot = cleaned.indexOf('.');
  if (firstDot === -1) return cleaned;
  return cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '');
}

/**
 * Live-formats a sanitized amount for display with Indian digit grouping
 * as the user types, e.g. "1000000" -> "10,00,000". The decimal part (if
 * any) is shown as-is, un-grouped, since the user may still be mid-typing
 * it.
 */
export function formatAmountInput(raw: string): string {
  const clean = sanitizeAmountInput(raw);
  const firstDot = clean.indexOf('.');
  const intPart = firstDot === -1 ? clean : clean.slice(0, firstDot);
  const decPart = firstDot === -1 ? '' : clean.slice(firstDot);
  if (!intPart) return decPart;
  return Number(intPart).toLocaleString('en-IN') + decPart;
}
