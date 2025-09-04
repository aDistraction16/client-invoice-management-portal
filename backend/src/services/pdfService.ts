import puppeteer from 'puppeteer';

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
  currency?: 'USD' | 'PHP';
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
  private formatCurrency(amount: number, currency: 'USD' | 'PHP' = 'USD'): string {
    const currencySymbols = {
      USD: '$',
      PHP: '₱'
    };
    
    return `${currencySymbols[currency]}${amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }

  private generateInvoiceHTML(invoiceData: InvoiceData): string {
    const currency = invoiceData.currency || 'USD';
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Invoice ${invoiceData.invoiceNumber}</title>
      <style>
        body {
          font-family: 'Arial', sans-serif;
          margin: 0;
          padding: 40px;
          color: #333;
          line-height: 1.6;
        }
        
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 40px;
          border-bottom: 3px solid #2196F3;
          padding-bottom: 20px;
        }
        
        .company-info h1 {
          margin: 0;
          color: #2196F3;
          font-size: 28px;
          font-weight: bold;
        }
        
        .company-info p {
          margin: 5px 0;
          color: #666;
        }
        
        .invoice-info {
          text-align: right;
        }
        
        .invoice-info h2 {
          margin: 0;
          color: #333;
          font-size: 24px;
          margin-bottom: 10px;
        }
        
        .invoice-info p {
          margin: 5px 0;
          font-weight: bold;
        }
        
        .billing-section {
          display: flex;
          justify-content: space-between;
          margin: 40px 0;
        }
        
        .bill-to h3 {
          color: #2196F3;
          margin-bottom: 10px;
          font-size: 16px;
        }
        
        .bill-to p {
          margin: 5px 0;
        }
        
        .invoice-table {
          width: 100%;
          border-collapse: collapse;
          margin: 40px 0;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .invoice-table th {
          background-color: #2196F3;
          color: white;
          padding: 15px;
          text-align: left;
          font-weight: bold;
        }
        
        .invoice-table th:last-child,
        .invoice-table td:last-child {
          text-align: right;
        }
        
        .invoice-table td {
          padding: 15px;
          border-bottom: 1px solid #eee;
        }
        
        .invoice-table tr:nth-child(even) {
          background-color: #f9f9f9;
        }
        
        .total-section {
          margin-top: 30px;
          text-align: right;
        }
        
        .total-row {
          display: flex;
          justify-content: flex-end;
          margin: 10px 0;
        }
        
        .total-label {
          font-weight: bold;
          margin-right: 20px;
          min-width: 120px;
        }
        
        .total-amount {
          min-width: 100px;
          font-weight: bold;
        }
        
        .grand-total {
          border-top: 2px solid #2196F3;
          padding-top: 10px;
          font-size: 18px;
          color: #2196F3;
        }
        
        .notes {
          margin-top: 40px;
          padding: 20px;
          background-color: #f5f5f5;
          border-left: 4px solid #2196F3;
        }
        
        .notes h4 {
          margin-top: 0;
          color: #2196F3;
        }
        
        .footer {
          margin-top: 60px;
          text-align: center;
          padding-top: 20px;
          border-top: 1px solid #eee;
          color: #666;
          font-style: italic;
        }
        
        .currency-note {
          color: #666;
          font-size: 12px;
          margin-top: 10px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="company-info">
          <h1>${invoiceData.companyName || 'Company Name'}</h1>
          <p>${invoiceData.companyAddress || 'Your Company Address'}</p>
          <p>Phone: ${invoiceData.companyPhone || 'Your Phone Number'}</p>
          <p>Email: ${invoiceData.companyEmail || 'Your Email Address'}</p>
        </div>
        <div class="invoice-info">
          <h2>INVOICE</h2>
          <p>Invoice #: ${invoiceData.invoiceNumber}</p>
          <p>Issue Date: ${new Date(invoiceData.issueDate).toLocaleDateString()}</p>
          <p>Due Date: ${new Date(invoiceData.dueDate).toLocaleDateString()}</p>
        </div>
      </div>
      
      <div class="billing-section">
        <div class="bill-to">
          <h3>Bill To:</h3>
          <p><strong>${invoiceData.clientName}</strong></p>
          ${invoiceData.clientEmail ? `<p>Email: ${invoiceData.clientEmail}</p>` : ''}
          ${invoiceData.clientAddress ? `<p>${invoiceData.clientAddress}</p>` : ''}
          ${invoiceData.clientPhone ? `<p>Phone: ${invoiceData.clientPhone}</p>` : ''}
        </div>
      </div>
      
      <table class="invoice-table">
        <thead>
          <tr>
            <th style="width: 50%">Description</th>
            <th style="width: 15%">Quantity</th>
            <th style="width: 20%">Unit Price</th>
            <th style="width: 15%">Total</th>
          </tr>
        </thead>
        <tbody>
          ${invoiceData.items.map(item => `
            <tr>
              <td>${item.description}</td>
              <td>${item.quantity}</td>
              <td>${this.formatCurrency(item.unitPrice, currency)}</td>
              <td>${this.formatCurrency(item.total, currency)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <div class="total-section">
        <div class="total-row grand-total">
          <div class="total-label">Total Amount:</div>
          <div class="total-amount">${this.formatCurrency(invoiceData.totalAmount, currency)}</div>
        </div>
        <div class="currency-note">
          All amounts are displayed in ${currency === 'USD' ? 'US Dollars' : 'Philippine Pesos'}
        </div>
      </div>
      
      ${invoiceData.notes ? `
        <div class="notes">
          <h4>Notes:</h4>
          <p>${invoiceData.notes}</p>
        </div>
      ` : ''}
      
      <div class="footer">
        <p>Thank you for your business!</p>
        <p>Generated on ${new Date().toLocaleDateString()}</p>
      </div>
    </body>
    </html>
    `;
  }

  async generateInvoicePDF(invoiceData: InvoiceData): Promise<Buffer> {
    let browser;
    
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      const html = this.generateInvoiceHTML(invoiceData);
      
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        margin: {
          top: '20px',
          right: '20px',
          bottom: '20px',
          left: '20px'
        },
        printBackground: true
      });
      
      return Buffer.from(pdfBuffer);
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  async generateReportPDF(reportData: {
    title: string;
    period: string;
    totalRevenue: number;
    totalInvoices: number;
    paidInvoices: number;
    outstandingInvoices: number;
    overdueInvoices: number;
    currency?: 'USD' | 'PHP';
    clientBreakdown: Array<{
      clientName: string;
      totalAmount: number;
      invoiceCount: number;
    }>;
  }): Promise<Buffer> {
    let browser;
    
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      const currency = reportData.currency || 'USD';
      
      const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${reportData.title}</title>
        <style>
          body {
            font-family: 'Arial', sans-serif;
            margin: 0;
            padding: 40px;
            color: #333;
            line-height: 1.6;
          }
          
          .header {
            text-align: center;
            margin-bottom: 40px;
            border-bottom: 3px solid #2196F3;
            padding-bottom: 20px;
          }
          
          .header h1 {
            color: #2196F3;
            margin: 0;
            font-size: 28px;
          }
          
          .header p {
            color: #666;
            margin: 10px 0;
            font-size: 16px;
          }
          
          .summary-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
            margin: 40px 0;
          }
          
          .summary-card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #2196F3;
          }
          
          .summary-card h3 {
            margin: 0 0 10px 0;
            color: #2196F3;
            font-size: 14px;
            text-transform: uppercase;
            font-weight: bold;
          }
          
          .summary-card .value {
            font-size: 24px;
            font-weight: bold;
            color: #333;
          }
          
          .breakdown-section {
            margin-top: 40px;
          }
          
          .breakdown-section h2 {
            color: #2196F3;
            border-bottom: 2px solid #2196F3;
            padding-bottom: 10px;
          }
          
          .breakdown-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          
          .breakdown-table th {
            background-color: #2196F3;
            color: white;
            padding: 15px;
            text-align: left;
            font-weight: bold;
          }
          
          .breakdown-table th:last-child,
          .breakdown-table td:last-child {
            text-align: right;
          }
          
          .breakdown-table td {
            padding: 15px;
            border-bottom: 1px solid #eee;
          }
          
          .breakdown-table tr:nth-child(even) {
            background-color: #f9f9f9;
          }
          
          .footer {
            margin-top: 60px;
            text-align: center;
            padding-top: 20px;
            border-top: 1px solid #eee;
            color: #666;
            font-style: italic;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${reportData.title}</h1>
          <p>Period: ${reportData.period}</p>
        </div>
        
        <div class="summary-grid">
          <div class="summary-card">
            <h3>Total Revenue</h3>
            <div class="value">${this.formatCurrency(reportData.totalRevenue, currency)}</div>
          </div>
          <div class="summary-card">
            <h3>Total Invoices</h3>
            <div class="value">${reportData.totalInvoices}</div>
          </div>
          <div class="summary-card">
            <h3>Paid Invoices</h3>
            <div class="value">${reportData.paidInvoices}</div>
          </div>
          <div class="summary-card">
            <h3>Outstanding Invoices</h3>
            <div class="value">${reportData.outstandingInvoices}</div>
          </div>
        </div>
        
        ${reportData.clientBreakdown.length > 0 ? `
          <div class="breakdown-section">
            <h2>Client Breakdown</h2>
            <table class="breakdown-table">
              <thead>
                <tr>
                  <th>Client Name</th>
                  <th>Total Amount</th>
                  <th>Invoice Count</th>
                </tr>
              </thead>
              <tbody>
                ${reportData.clientBreakdown.map(client => `
                  <tr>
                    <td>${client.clientName}</td>
                    <td>${this.formatCurrency(client.totalAmount, currency)}</td>
                    <td>${client.invoiceCount}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}
        
        <div class="footer">
          <p>Generated on ${new Date().toLocaleDateString()}</p>
        </div>
      </body>
      </html>
      `;
      
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        margin: {
          top: '20px',
          right: '20px',
          bottom: '20px',
          left: '20px'
        },
        printBackground: true
      });
      
      return Buffer.from(pdfBuffer);
    } catch (error) {
      console.error('Error generating report PDF:', error);
      throw new Error(`Failed to generate report PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
}

export const pdfService = new PDFService();
