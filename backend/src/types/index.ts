// API Response types
export interface ApiResponse<T = any> {
  message?: string;
  data?: T;
  error?: string;
  details?: Array<{
    field: string;
    message: string;
  }>;
}

// Pagination types
export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export interface PaginationResponse {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Filter types
export interface TimeEntryFilters {
  projectId?: number;
  startDate?: Date;
  endDate?: Date;
}

export interface InvoiceFilters {
  clientId?: number;
  status?: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  startDate?: Date;
  endDate?: Date;
}

// Business logic types
export interface InvoiceItemInput {
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface CreateInvoiceInput {
  clientId: number;
  issueDate: Date;
  dueDate: Date;
  items: InvoiceItemInput[];
  notes?: string;
}

export interface DashboardStats {
  totalClients: number;
  totalProjects: number;
  totalInvoices: number;
  totalRevenue: number;
  outstandingInvoices: number;
  overdueInvoices: number;
}

// Error types
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

// Auth types
export interface AuthenticatedUser {
  id: number;
  email: string;
  companyName?: string;
  contactPerson?: string;
}
