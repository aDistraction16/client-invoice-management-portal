export interface User {
  id: number;
  email: string;
  companyName?: string;
  contactPerson?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Client {
  id: number;
  userId: number;
  clientName: string;
  contactPerson?: string;
  email?: string;
  address?: string;
  phoneNumber?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: number;
  clientId: number;
  projectName: string;
  description?: string;
  hourlyRate: string;
  currency: string;
  status: 'active' | 'completed' | 'paused';
  createdAt: string;
  updatedAt: string;
  clientName?: string;
  clientEmail?: string;
}

export interface TimeEntry {
  id: number;
  projectId: number;
  userId: number;
  date: string;
  hoursLogged: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  projectName?: string;
  clientName?: string;
}

export interface Invoice {
  id: number;
  clientId: number;
  userId: number;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  totalAmount: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  paymentLink?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  clientName?: string;
  clientEmail?: string;
  clientAddress?: string;
  clientPhone?: string;
  items?: InvoiceItem[];
}

export interface InvoiceItem {
  id: number;
  invoiceId: number;
  description: string;
  quantity: string;
  unitPrice: string;
  total: string;
  createdAt: string;
}

// Form interfaces
export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  email: string;
  password: string;
  companyName?: string;
  contactPerson?: string;
}

export interface ClientFormData {
  clientName: string;
  contactPerson?: string;
  email?: string;
  address?: string;
  phoneNumber?: string;
}

export interface ProjectFormData {
  clientId: number;
  projectName: string;
  description?: string;
  hourlyRate: number;
  currency: string;
  status: 'active' | 'completed' | 'paused';
}

export interface TimeEntryFormData {
  projectId: number;
  date: string;
  hoursLogged: number;
  description?: string;
}

export interface InvoiceFormData {
  clientId: number;
  issueDate: string;
  dueDate: string;
  items: InvoiceItemFormData[];
  notes?: string;
}

export interface InvoiceItemFormData {
  description: string;
  quantity: number;
  unitPrice: number;
}

// API Response interfaces
export interface ApiResponse<T> {
  data?: T;
  message?: string;
  error?: string;
}

export interface AuthResponse {
  user: User;
  message: string;
}

export interface ClientsResponse {
  clients: Client[];
  total: number;
}

export interface ProjectsResponse {
  projects: Project[];
  total: number;
}

export interface TimeEntriesResponse {
  timeEntries: TimeEntry[];
  total: number;
}

export interface InvoicesResponse {
  invoices: Invoice[];
  total: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface TimeEntryFilters extends PaginationParams {
  projectId?: number;
  startDate?: string;
  endDate?: string;
}
