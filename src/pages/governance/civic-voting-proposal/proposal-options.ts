export const DEFAULT_OPTION_LABELS = ['Support', 'Oppose', 'Abstain'];

/** One label per line; the default trio means "no custom options". */
export function parseOptionLines(text: string): Array<{ label: string }> {
  const labels = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (labels.length === 0) return [];
  if (labels.length === 3 && labels.every((label, i) => label.toLowerCase() === DEFAULT_OPTION_LABELS[i].toLowerCase())) {
    return [];
  }
  return labels.map((label) => ({ label }));
}

