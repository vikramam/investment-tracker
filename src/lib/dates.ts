export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function fmtDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Given an ISO date, returns the same day-of-month one month later.
 * If the target month is shorter (e.g. deposit on the 31st, next month is
 * February), the date CLAMPS to the last day of that month rather than
 * rolling forward into the following month. This was an explicit default
 * called out during design — flag to the owner if the rollover behavior
 * should be reversed.
 */
export function nextMonthSameDay(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  const day = d.getDate();
  const firstOfNextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  const lastDayOfNextMonth = new Date(
    firstOfNextMonth.getFullYear(),
    firstOfNextMonth.getMonth() + 1,
    0
  ).getDate();
  firstOfNextMonth.setDate(Math.min(day, lastDayOfNextMonth));
  return firstOfNextMonth.toISOString().slice(0, 10);
}

/** Formats a month count as "X yr Y mo" for the Analytics break-even estimate. */
export function fmtYearsMonths(months: number | null): string | null {
  if (months === null || months === undefined) return null;
  const years = Math.floor(months / 12);
  const remMonths = months % 12;
  if (years === 0) return `${remMonths} month${remMonths === 1 ? '' : 's'}`;
  if (remMonths === 0) return `${years} year${years === 1 ? '' : 's'}`;
  return `${years} yr${years === 1 ? '' : 's'} ${remMonths} mo`;
}
