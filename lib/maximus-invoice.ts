export type InvoiceLineInput = { description: string; quantity: number; unit_price: number };
export type ComputedInvoiceLine = InvoiceLineInput & { line_total: number; position: number };

// Single source of truth for HT/tax/TTC math — used server-side (authoritative, in the create
// route) and client-side (live totals preview in InvoicingWorkspace). Never trust a client-sent
// total: the API route always recomputes from the submitted lines + tax_rate.
export function computeInvoiceTotals(lines: InvoiceLineInput[], taxRate: number) {
  const computedLines: ComputedInvoiceLine[] = lines.map((line, index) => ({
    ...line,
    line_total: Math.round(line.quantity * line.unit_price * 100) / 100,
    position: index + 1,
  }));
  const priceExcludingTax = computedLines.reduce((sum, line) => sum + line.line_total, 0);
  const taxAmount = Math.round(priceExcludingTax * (taxRate / 100) * 100) / 100;
  const totalIncludingTax = Math.round((priceExcludingTax + taxAmount) * 100) / 100;
  return { computedLines, priceExcludingTax, taxAmount, totalIncludingTax };
}
