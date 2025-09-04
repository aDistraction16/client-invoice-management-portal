import PDFDocument from 'pdfkit';
import { PassThrough } from 'stream';

export interface InvoiceData {
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  clientName: string;
  clientEmail?: string;
  clientAddress?: string;
  clientPhone?: string;
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  totalAmount: number;
  notes?: string;
}

export class PDFService {
  generateInvoicePDF(invoiceData: InvoiceData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          resolve(pdfBuffer);
        });

        // Header
        doc.fontSize(20)
           .text(invoiceData.companyName || 'Your Company', 50, 50);

        doc.fontSize(10)
           .text(invoiceData.companyAddress || '', 50, 80)
           .text(invoiceData.companyPhone || '', 50, 95)
           .text(invoiceData.companyEmail || '', 50, 110);

        // Invoice title
        doc.fontSize(20)
           .text('INVOICE', 400, 50);

        // Invoice details
        doc.fontSize(10)
           .text(`Invoice Number: ${invoiceData.invoiceNumber}`, 400, 80)
           .text(`Issue Date: ${invoiceData.issueDate}`, 400, 95)
           .text(`Due Date: ${invoiceData.dueDate}`, 400, 110);

        // Bill to section
        doc.fontSize(12)
           .text('Bill To:', 50, 150);

        doc.fontSize(10)
           .text(invoiceData.clientName, 50, 170)
           .text(invoiceData.clientEmail || '', 50, 185)
           .text(invoiceData.clientAddress || '', 50, 200)
           .text(invoiceData.clientPhone || '', 50, 215);

        // Table header
        const tableTop = 250;
        doc.fontSize(10)
           .text('Description', 50, tableTop)
           .text('Qty', 350, tableTop)
           .text('Unit Price', 400, tableTop)
           .text('Total', 480, tableTop);

        // Draw line under header
        doc.moveTo(50, tableTop + 15)
           .lineTo(550, tableTop + 15)
           .stroke();

        // Table items
        let yPosition = tableTop + 30;
        invoiceData.items.forEach((item) => {
          doc.fontSize(9)
             .text(item.description, 50, yPosition)
             .text(item.quantity.toString(), 350, yPosition)
             .text(`$${item.unitPrice.toFixed(2)}`, 400, yPosition)
             .text(`$${item.total.toFixed(2)}`, 480, yPosition);
          
          yPosition += 20;
        });

        // Total section
        const totalY = yPosition + 20;
        doc.moveTo(350, totalY)
           .lineTo(550, totalY)
           .stroke();

        doc.fontSize(12)
           .text('Total Amount:', 350, totalY + 10)
           .text(`$${invoiceData.totalAmount.toFixed(2)}`, 480, totalY + 10);

        // Notes section
        if (invoiceData.notes) {
          doc.fontSize(10)
             .text('Notes:', 50, totalY + 50)
             .text(invoiceData.notes, 50, totalY + 70, { width: 500 });
        }

        // Footer
        doc.fontSize(8)
           .text('Thank you for your business!', 50, 700, { align: 'center' });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  generateReportPDF(reportData: {
    title: string;
    period: string;
    totalRevenue: number;
    totalInvoices: number;
    paidInvoices: number;
    outstandingInvoices: number;
    overdueInvoices: number;
    clientBreakdown: Array<{
      clientName: string;
      totalAmount: number;
      invoiceCount: number;
    }>;
  }): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          resolve(pdfBuffer);
        });

        // Header
        doc.fontSize(20)
           .text(reportData.title, 50, 50);

        doc.fontSize(12)
           .text(`Period: ${reportData.period}`, 50, 80);

        // Summary section
        doc.fontSize(14)
           .text('Summary', 50, 120);

        doc.fontSize(10)
           .text(`Total Revenue: $${reportData.totalRevenue.toFixed(2)}`, 50, 150)
           .text(`Total Invoices: ${reportData.totalInvoices}`, 50, 170)
           .text(`Paid Invoices: ${reportData.paidInvoices}`, 50, 190)
           .text(`Outstanding Invoices: ${reportData.outstandingInvoices}`, 50, 210)
           .text(`Overdue Invoices: ${reportData.overdueInvoices}`, 50, 230);

        // Client breakdown
        if (reportData.clientBreakdown.length > 0) {
          doc.fontSize(14)
             .text('Client Breakdown', 50, 270);

          let yPos = 300;
          doc.fontSize(10)
             .text('Client Name', 50, yPos)
             .text('Total Amount', 300, yPos)
             .text('Invoice Count', 450, yPos);

          // Draw line under header
          doc.moveTo(50, yPos + 15)
             .lineTo(550, yPos + 15)
             .stroke();

          yPos += 30;
          reportData.clientBreakdown.forEach((client) => {
            doc.fontSize(9)
               .text(client.clientName, 50, yPos)
               .text(`$${client.totalAmount.toFixed(2)}`, 300, yPos)
               .text(client.invoiceCount.toString(), 450, yPos);
            
            yPos += 20;
          });
        }

        // Footer
        doc.fontSize(8)
           .text(`Generated on ${new Date().toLocaleDateString()}`, 50, 700, { align: 'center' });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}

export const pdfService = new PDFService();
