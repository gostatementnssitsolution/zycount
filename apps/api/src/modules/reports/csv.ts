/**
 * Minimal RFC 4180 CSV writer for report exports.
 *
 * A leading `=`, `+`, `-` or `@` is prefixed with a quote so spreadsheet apps
 * treat the cell as text rather than executing it as a formula.
 */
function escapeCell(value: string): string {
  const guarded = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\n\r]/.test(guarded) ? `"${guarded.replace(/"/g, '""')}"` : guarded;
}

export function toCsv(headers: string[], rows: string[][], footers: string[][] = []): string {
  const lines = [headers, ...rows, ...footers].map((row) => row.map(escapeCell).join(","));
  // The BOM makes Excel open UTF-8 exports correctly on Windows.
  return `﻿${lines.join("\r\n")}\r\n`;
}
