import sgMail from '@sendgrid/mail';
import * as dotenv from 'dotenv';

dotenv.config();

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{
    content: string;
    filename: string;
    type: string;
  }>;
}

export class EmailService {
  private fromEmail: string;

  constructor() {
    this.fromEmail = process.env.FROM_EMAIL || 'noreply@yourcompany.com';
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      const msg = {
        to: options.to,
        from: this.fromEmail,
        subject: options.subject,
        html: options.html,
        attachments: options.attachments
      };

      await sgMail.send(msg);
      return true;
    } catch (error) {
      return false;
    }
  }

  async sendInvoiceEmail(
    clientEmail: string,
    invoiceData: {
      invoiceNumber: string;
      clientName: string;
      totalAmount: string;
      dueDate: string;
      companyName?: string;
      currency?: 'USD' | 'PHP';
    },
    pdfBuffer?: Buffer
  ): Promise<boolean> {
    const currencySymbol = invoiceData.currency === 'PHP' ? '₱' : '$';
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Invoice ${invoiceData.invoiceNumber}</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            margin: 0; 
            padding: 0; 
            background-color: #f8f9fa;
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            padding: 20px; 
            background-color: #ffffff;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header { 
            background: linear-gradient(135deg, #2196F3, #1976D2);
            color: white;
            padding: 30px 20px; 
            border-radius: 10px 10px 0 0; 
            margin: -20px -20px 20px -20px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 300;
          }
          .invoice-details { 
            background-color: #f8f9fa; 
            padding: 20px; 
            border-radius: 8px; 
            margin: 20px 0;
            border-left: 4px solid #2196F3;
          }
          .amount { 
            font-size: 28px; 
            font-weight: bold; 
            color: #2196F3;
            text-align: center;
            background-color: #e3f2fd;
            padding: 15px;
            border-radius: 8px;
            margin: 15px 0;
          }
          .attachment-notice {
            background-color: #e8f5e8;
            border: 1px solid #4caf50;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
            text-align: center;
          }
          .footer { 
            margin-top: 30px; 
            padding-top: 20px; 
            border-top: 2px solid #e9ecef; 
            font-size: 14px; 
            color: #6c757d;
            text-align: center;
          }
          .cta-button {
            display: inline-block;
            background-color: #2196F3;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 25px;
            font-weight: bold;
            margin: 15px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📧 New Invoice</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">From ${invoiceData.companyName || 'Company Name'}</p>
          </div>
          
          <p>Dear <strong>${invoiceData.clientName}</strong>,</p>
          
          <p>Thank you for your business! We have prepared your invoice and it's ready for review.</p>
          
          <div class="invoice-details">
            <p><strong>📄 Invoice Number:</strong> ${invoiceData.invoiceNumber}</p>
            <p><strong>📅 Due Date:</strong> ${new Date(invoiceData.dueDate).toLocaleDateString()}</p>
          </div>
          
          <div class="amount">
            <div>Total Amount Due</div>
            <div>${currencySymbol}${invoiceData.totalAmount}</div>
          </div>

          ${pdfBuffer ? `
          <div class="attachment-notice">
            <strong>📎 Invoice PDF Attached</strong><br>
            Please find your detailed invoice attached as a PDF file.
          </div>
          ` : ''}
          
          <p>Please review the invoice details and arrange payment by the due date. We appreciate your prompt attention to this matter.</p>
          
          <p>If you have any questions or concerns about this invoice, please don't hesitate to reach out to us.</p>
          
          <p style="margin-top: 30px;">
            Best regards,<br>
            <strong>${invoiceData.companyName || 'Company Name'}</strong>
          </p>
          
          <div class="footer">
            <p>This is an automated message from our invoice management system.</p>
            <p>Thank you for choosing ${invoiceData.companyName || 'Company Name'}! 🙏</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const emailOptions: EmailOptions = {
      to: clientEmail,
      subject: `📧 Invoice ${invoiceData.invoiceNumber} - ${currencySymbol}${invoiceData.totalAmount} Due ${new Date(invoiceData.dueDate).toLocaleDateString()}`,
      html
    };

    // Add PDF attachment if provided
    if (pdfBuffer) {
      emailOptions.attachments = [{
        content: pdfBuffer.toString('base64'),
        filename: `invoice-${invoiceData.invoiceNumber}.pdf`,
        type: 'application/pdf'
      }];
    }

    return this.sendEmail(emailOptions);
  }

  async sendPaymentReminderEmail(
    clientEmail: string,
    invoiceData: {
      invoiceNumber: string;
      clientName: string;
      totalAmount: string;
      dueDate: string;
      companyName?: string;
      currency?: 'USD' | 'PHP';
      daysPastDue: number;
    }
  ): Promise<boolean> {
    const currencySymbol = invoiceData.currency === 'PHP' ? '₱' : '$';
    const isOverdue = invoiceData.daysPastDue > 0;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Payment Reminder - Invoice ${invoiceData.invoiceNumber}</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            margin: 0; 
            padding: 0; 
            background-color: #f8f9fa;
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            padding: 20px; 
            background-color: #ffffff;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header { 
            background: linear-gradient(135deg, ${isOverdue ? '#ff6b6b, #ee5a52' : '#ffc107, #ffab00'});
            color: white;
            padding: 30px 20px; 
            border-radius: 10px 10px 0 0; 
            margin: -20px -20px 20px -20px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 300;
          }
          .invoice-details { 
            background-color: ${isOverdue ? '#ffebee' : '#fff3e0'}; 
            padding: 20px; 
            border-radius: 8px; 
            margin: 20px 0;
            border-left: 4px solid ${isOverdue ? '#f44336' : '#ff9800'};
          }
          .amount { 
            font-size: 28px; 
            font-weight: bold; 
            color: ${isOverdue ? '#f44336' : '#ff9800'};
            text-align: center;
            background-color: ${isOverdue ? '#ffebee' : '#fff3e0'};
            padding: 15px;
            border-radius: 8px;
            margin: 15px 0;
          }
          .urgency-notice {
            background-color: ${isOverdue ? '#ffcdd2' : '#ffe0b2'};
            border: 2px solid ${isOverdue ? '#f44336' : '#ff9800'};
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            text-align: center;
            font-weight: bold;
          }
          .footer { 
            margin-top: 30px; 
            padding-top: 20px; 
            border-top: 2px solid #e9ecef; 
            font-size: 14px; 
            color: #6c757d;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${isOverdue ? '🚨' : '⏰'} Payment Reminder</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">From ${invoiceData.companyName || 'Company Name'}</p>
          </div>
          
          <p>Dear <strong>${invoiceData.clientName}</strong>,</p>
          
          ${isOverdue ? `
          <div class="urgency-notice">
            ⚠️ URGENT: This invoice is ${invoiceData.daysPastDue} days overdue
          </div>
          <p>This is an urgent reminder that your invoice payment is <strong>${invoiceData.daysPastDue} days past due</strong>. Immediate action is required to avoid any service interruptions or late fees.</p>
          ` : `
          <div class="urgency-notice">
            📅 This invoice payment is due today
          </div>
          <p>This is a friendly reminder that your invoice payment is <strong>due today</strong>. Please arrange payment to avoid any late fees.</p>
          `}
          
          <div class="invoice-details">
            <p><strong>📄 Invoice Number:</strong> ${invoiceData.invoiceNumber}</p>
            <p><strong>📅 Original Due Date:</strong> ${new Date(invoiceData.dueDate).toLocaleDateString()}</p>
            ${isOverdue ? `<p><strong>⏱️ Days Past Due:</strong> <span style="color: #f44336; font-weight: bold;">${invoiceData.daysPastDue} days</span></p>` : ''}
          </div>
          
          <div class="amount">
            <div>Outstanding Amount</div>
            <div>${currencySymbol}${invoiceData.totalAmount}</div>
          </div>
          
          <p>Please arrange payment as soon as possible. If you have already processed this payment, please disregard this notice.</p>
          
          <p>If you have any questions about this invoice or need to discuss payment arrangements, please contact us immediately at your earliest convenience.</p>
          
          <p style="margin-top: 30px;">
            ${isOverdue ? 'We appreciate your immediate attention to this urgent matter.' : 'Thank you for your prompt attention to this matter.'}
          </p>
          
          <p>
            Best regards,<br>
            <strong>${invoiceData.companyName || 'Company Name'}</strong>
          </p>
          
          <div class="footer">
            <p>This is an automated reminder from our invoice management system.</p>
            <p>Please contact us if you have any questions about this invoice.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: clientEmail,
      subject: `${isOverdue ? '🚨 URGENT' : '⏰'} Payment Reminder - Invoice ${invoiceData.invoiceNumber} ${isOverdue ? `(${invoiceData.daysPastDue} days overdue)` : '(Due Today)'}`,
      html
    });
  }

  async sendPaymentConfirmationEmail(
    clientEmail: string,
    paymentData: {
      invoiceNumber: string;
      clientName: string;
      amountPaid: string;
      paymentDate: string;
      paymentMethod?: string;
      companyName?: string;
      currency?: 'USD' | 'PHP';
    }
  ): Promise<boolean> {
    const currencySymbol = paymentData.currency === 'PHP' ? '₱' : '$';
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Payment Confirmation - Invoice ${paymentData.invoiceNumber}</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            margin: 0; 
            padding: 0; 
            background-color: #f8f9fa;
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            padding: 20px; 
            background-color: #ffffff;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header { 
            background: linear-gradient(135deg, #4caf50, #388e3c);
            color: white;
            padding: 30px 20px; 
            border-radius: 10px 10px 0 0; 
            margin: -20px -20px 20px -20px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 300;
          }
          .payment-details { 
            background-color: #e8f5e8; 
            padding: 20px; 
            border-radius: 8px; 
            margin: 20px 0;
            border-left: 4px solid #4caf50;
          }
          .amount { 
            font-size: 28px; 
            font-weight: bold; 
            color: #4caf50;
            text-align: center;
            background-color: #f1f8e9;
            padding: 15px;
            border-radius: 8px;
            margin: 15px 0;
          }
          .success-message {
            background-color: #d4edda;
            border: 2px solid #4caf50;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            text-align: center;
            font-weight: bold;
            color: #155724;
          }
          .footer { 
            margin-top: 30px; 
            padding-top: 20px; 
            border-top: 2px solid #e9ecef; 
            font-size: 14px; 
            color: #6c757d;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Payment Received</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Thank you for your payment!</p>
          </div>
          
          <div class="success-message">
            🎉 Your payment has been successfully processed!
          </div>
          
          <p>Dear <strong>${paymentData.clientName}</strong>,</p>
          
          <p>We are pleased to confirm that we have received your payment for the following invoice:</p>
          
          <div class="payment-details">
            <p><strong>📄 Invoice Number:</strong> ${paymentData.invoiceNumber}</p>
            <p><strong>💳 Payment Date:</strong> ${new Date(paymentData.paymentDate).toLocaleDateString()}</p>
            ${paymentData.paymentMethod ? `<p><strong>💸 Payment Method:</strong> ${paymentData.paymentMethod}</p>` : ''}
          </div>
          
          <div class="amount">
            <div>Amount Paid</div>
            <div>${currencySymbol}${paymentData.amountPaid}</div>
          </div>
          
          <p>Your account has been updated to reflect this payment. This invoice is now marked as <strong style="color: #4caf50;">PAID</strong> in our system.</p>
          
          <p>Thank you for your business! We appreciate your prompt payment and look forward to continuing our partnership.</p>
          
          <p>If you have any questions about this payment or need a receipt, please don't hesitate to contact us.</p>
          
          <p style="margin-top: 30px;">
            Best regards,<br>
            <strong>${paymentData.companyName || 'Company Name'}</strong>
          </p>
          
          <div class="footer">
            <p>This is an automated confirmation from our payment processing system.</p>
            <p>Keep this email for your records. 📁</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: clientEmail,
      subject: `✅ Payment Confirmed - Invoice ${paymentData.invoiceNumber} (${currencySymbol}${paymentData.amountPaid})`,
      html
    });
  }
}

export const emailService = new EmailService();
