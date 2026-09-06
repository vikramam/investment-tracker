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
