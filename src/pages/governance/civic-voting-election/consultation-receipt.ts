/** 24-hex receipt shown as 4-character groups so it can be read back or compared by eye. */
export function formatReceipt(receipt: string): string {
  return receipt.replace(/(.{4})(?=.)/g, '$1-').toUpperCase();
}
