/** Known acronyms that should render fully uppercased */
const DIVISION_ACRONYMS = new Set(['pmso']);

/** Format a division slug (e.g. "pmso", "operations") for display */
export function formatDivision(division: string): string {
  if (!division) return '-';
  const lower = division.toLowerCase();
  if (DIVISION_ACRONYMS.has(lower)) return lower.toUpperCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}
