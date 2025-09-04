import sgMail from '@sendgrid/mail';
import dotenv from 'dotenv';

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
      console.log(`✅ Email sent successfully to ${options.to}`);
      return true;
    } catch (error) {
      console.error('❌ Email sending failed:', error);
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
    }
  ): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Invoice ${invoiceData.invoiceNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
          .invoice-details { background-color: #e9ecef; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .amount { font-size: 24px; font-weight: bold; color: #28a745; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; font-size: 14px; color: #6c757d; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Invoice from ${invoiceData.companyName || 'Your Company'}</h1>
          </div>
          
          <p>Dear ${invoiceData.clientName},</p>
          
          <p>Thank you for your business! Please find your invoice details below:</p>
          
          <div class="invoice-details">
            <p><strong>Invoice Number:</strong> ${invoiceData.invoiceNumber}</p>
            <p><strong>Total Amount:</strong> <span class="amount">$${invoiceData.totalAmount}</span></p>
            <p><strong>Due Date:</strong> ${invoiceData.dueDate}</p>
          </div>
          
          <p>Please review the invoice and process payment by the due date. If you have any questions, please don't hesitate to contact us.</p>
          
          <p>Best regards,<br>
          ${invoiceData.companyName || 'Your Company'}</p>
          
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: clientEmail,
      subject: `Invoice ${invoiceData.invoiceNumber} from ${invoiceData.companyName || 'Your Company'}`,
      html
    });
  }

  async sendPaymentReminderEmail(
    clientEmail: string,
    invoiceData: {
      invoiceNumber: string;
      clientName: string;
      totalAmount: string;
      dueDate: string;
      companyName?: string;
      daysPastDue: number;
    }
  ): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Payment Reminder - Invoice ${invoiceData.invoiceNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #fff3cd; padding: 20px; border-radius: 5px; margin-bottom: 20px; border-left: 4px solid #ffc107; }
          .invoice-details { background-color: #f8d7da; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #dc3545; }
          .amount { font-size: 24px; font-weight: bold; color: #dc3545; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; font-size: 14px; color: #6c757d; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⚠️ Payment Reminder</h1>
          </div>
          
          <p>Dear ${invoiceData.clientName},</p>
          
          <p>This is a friendly reminder that your invoice payment is ${invoiceData.daysPastDue > 0 ? `${invoiceData.daysPastDue} days overdue` : 'due today'}.</p>
          
          <div class="invoice-details">
            <p><strong>Invoice Number:</strong> ${invoiceData.invoiceNumber}</p>
            <p><strong>Outstanding Amount:</strong> <span class="amount">$${invoiceData.totalAmount}</span></p>
            <p><strong>Original Due Date:</strong> ${invoiceData.dueDate}</p>
            ${invoiceData.daysPastDue > 0 ? `<p><strong>Days Past Due:</strong> ${invoiceData.daysPastDue}</p>` : ''}
          </div>
          
          <p>Please arrange payment as soon as possible. If you have any questions about this invoice or need to discuss payment arrangements, please contact us immediately.</p>
          
          <p>Thank you for your prompt attention to this matter.</p>
          
          <p>Best regards,<br>
          ${invoiceData.companyName || 'Your Company'}</p>
          
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: clientEmail,
      subject: `Payment Reminder - Invoice ${invoiceData.invoiceNumber} ${invoiceData.daysPastDue > 0 ? 'OVERDUE' : 'Due Today'}`,
      html
    });
  }
}

export const emailService = new EmailService();
