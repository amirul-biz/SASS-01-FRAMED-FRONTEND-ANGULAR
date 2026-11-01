import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency } from '../pricing/currency.util';
import { getOrderReference } from './order-reference.util';

export interface ReceiptPdfData {
  id: string;
  createdAt: string;
  email: string;
  items: { photoName: string; formatLabel: string; price: number }[];
  subtotal: number;
  discountAmount: number;
  total: number;
}

export function downloadReceiptPdf(receipt: ReceiptPdfData): void {
  const reference = getOrderReference(receipt.id);
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text('FRAMED — Receipt', 14, 18);
  doc.setFontSize(10);
  doc.text(`Order #${reference}`, 14, 26);
  doc.text(`Date: ${new Date(receipt.createdAt).toLocaleDateString()}`, 14, 32);
  doc.text(`Email: ${receipt.email}`, 14, 38);

  autoTable(doc, {
    startY: 46,
    head: [['Photo', 'Format', 'Price']],
    body: receipt.items.map((item) => [item.photoName, item.formatLabel, formatCurrency(item.price)]),
  });

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  doc.text(`Subtotal: ${formatCurrency(receipt.subtotal)}`, 14, finalY + 10);
  doc.text(`Discount: ${formatCurrency(receipt.discountAmount)}`, 14, finalY + 16);
  doc.setFontSize(12);
  doc.text(`Total: ${formatCurrency(receipt.total)}`, 14, finalY + 24);

  doc.save(`framed-receipt-${reference}.pdf`);
}
