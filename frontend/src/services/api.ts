import axios, { AxiosResponse } from 'axios';
import {
  User,
  Client,
  Project,
  TimeEntry,
  Invoice,
  LoginFormData,
  RegisterFormData,
  ClientFormData,
  ProjectFormData,
  TimeEntryFormData,
  InvoiceFormData,
  AuthResponse,
  ClientsResponse,
  ProjectsResponse,
  TimeEntriesResponse,
  InvoicesResponse,
  TimeEntryFilters
} from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Important for session cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle authentication errors
    if (error.response?.status === 401) {
      console.warn('🔐 Authentication required - redirecting to login');
      
      // Clear any stored auth state
      localStorage.removeItem('user');
      
      // Only redirect if not already on login page
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    
    // Handle network errors
    if (!error.response) {
      console.error('🌐 Network Error - Check if backend is running');
      
      // Don't redirect on network errors, just show error
      if (error.code === 'ERR_NETWORK') {
        error.message = 'Network Error: Please check if the server is running';
      }
    }
    
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: async (data: RegisterFormData): Promise<AuthResponse> => {
    const response: AxiosResponse<AuthResponse> = await api.post('/auth/register', data);
    return response.data;
  },

  login: async (data: LoginFormData): Promise<AuthResponse> => {
    const response: AxiosResponse<AuthResponse> = await api.post('/auth/login', data);
    return response.data;
  },

  logout: async (): Promise<{ message: string }> => {
    const response: AxiosResponse<{ message: string }> = await api.post('/auth/logout');
    return response.data;
  },

  getCurrentUser: async (): Promise<{ user: User }> => {
    try {
      // Use session check endpoint for better reliability
      const response: AxiosResponse<{ authenticated: boolean; user: User }> = await api.get('/session-check');
      
      if (!response.data.authenticated || !response.data.user) {
        throw new Error('Not authenticated');
      }
      
      return { user: response.data.user };
    } catch (error) {
      // Fallback to legacy endpoint if session-check fails
      console.warn('⚠️ Session check failed, trying legacy endpoint:', error);
      const response: AxiosResponse<{ user: User }> = await api.get('/auth/me');
      return response.data;
    }
  },
};

// Clients API
export const clientsAPI = {
  getAll: async (): Promise<ClientsResponse> => {
    const response: AxiosResponse<ClientsResponse> = await api.get('/clients');
    return response.data;
  },

  getById: async (id: number): Promise<{ client: Client }> => {
    const response: AxiosResponse<{ client: Client }> = await api.get(`/clients/${id}`);
    return response.data;
  },

  create: async (data: ClientFormData): Promise<{ client: Client; message: string }> => {
    const response: AxiosResponse<{ client: Client; message: string }> = await api.post('/clients', data);
    return response.data;
  },

  update: async (id: number, data: Partial<ClientFormData>): Promise<{ client: Client; message: string }> => {
    const response: AxiosResponse<{ client: Client; message: string }> = await api.put(`/clients/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<{ message: string }> => {
    const response: AxiosResponse<{ message: string }> = await api.delete(`/clients/${id}`);
    return response.data;
  },
};

// Projects API
export const projectsAPI = {
  getAll: async (): Promise<ProjectsResponse> => {
    const response: AxiosResponse<ProjectsResponse> = await api.get('/projects');
    return response.data;
  },

  getById: async (id: number): Promise<{ project: Project }> => {
    const response: AxiosResponse<{ project: Project }> = await api.get(`/projects/${id}`);
    return response.data;
  },

  getByClientId: async (clientId: number): Promise<ProjectsResponse> => {
    const response: AxiosResponse<ProjectsResponse> = await api.get(`/projects/client/${clientId}`);
    return response.data;
  },

  create: async (data: ProjectFormData): Promise<{ project: Project; message: string }> => {
    const response: AxiosResponse<{ project: Project; message: string }> = await api.post('/projects', data);
    return response.data;
  },

  update: async (id: number, data: Partial<ProjectFormData>): Promise<{ project: Project; message: string }> => {
    const response: AxiosResponse<{ project: Project; message: string }> = await api.put(`/projects/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<{ message: string }> => {
    const response: AxiosResponse<{ message: string }> = await api.delete(`/projects/${id}`);
    return response.data;
  },
};

// Time Entries API
export const timeEntriesAPI = {
  getAll: async (filters?: TimeEntryFilters): Promise<TimeEntriesResponse> => {
    const params = new URLSearchParams();
    if (filters?.projectId) params.append('projectId', filters.projectId.toString());
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    
    const response: AxiosResponse<TimeEntriesResponse> = await api.get(`/time-entries?${params.toString()}`);
    return response.data;
  },

  getById: async (id: number): Promise<{ timeEntry: TimeEntry }> => {
    const response: AxiosResponse<{ timeEntry: TimeEntry }> = await api.get(`/time-entries/${id}`);
    return response.data;
  },

  getByProjectId: async (projectId: number): Promise<TimeEntriesResponse> => {
    const response: AxiosResponse<TimeEntriesResponse> = await api.get(`/time-entries/project/${projectId}`);
    return response.data;
  },

  create: async (data: TimeEntryFormData): Promise<{ timeEntry: TimeEntry; message: string }> => {
    const response: AxiosResponse<{ timeEntry: TimeEntry; message: string }> = await api.post('/time-entries', data);
    return response.data;
  },

  update: async (id: number, data: Partial<TimeEntryFormData>): Promise<{ timeEntry: TimeEntry; message: string }> => {
    const response: AxiosResponse<{ timeEntry: TimeEntry; message: string }> = await api.put(`/time-entries/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<{ message: string }> => {
    const response: AxiosResponse<{ message: string }> = await api.delete(`/time-entries/${id}`);
    return response.data;
  },
};

// Invoices API
export const invoicesAPI = {
  getAll: async (): Promise<InvoicesResponse> => {
    const response: AxiosResponse<InvoicesResponse> = await api.get('/invoices');
    return response.data;
  },

  getById: async (id: number): Promise<{ invoice: Invoice }> => {
    const response: AxiosResponse<{ invoice: Invoice }> = await api.get(`/invoices/${id}`);
    return response.data;
  },

  create: async (data: InvoiceFormData): Promise<{ invoice: Invoice; message: string }> => {
    const response: AxiosResponse<{ invoice: Invoice; message: string }> = await api.post('/invoices', data);
    return response.data;
  },

  update: async (id: number, data: Partial<Pick<Invoice, 'issueDate' | 'dueDate' | 'status' | 'notes'>>): Promise<{ invoice: Invoice; message: string }> => {
    const response: AxiosResponse<{ invoice: Invoice; message: string }> = await api.put(`/invoices/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<{ message: string }> => {
    const response: AxiosResponse<{ message: string }> = await api.delete(`/invoices/${id}`);
    return response.data;
  },

  markAsSent: async (id: number): Promise<{ invoice: Invoice; message: string }> => {
    const response: AxiosResponse<{ invoice: Invoice; message: string }> = await api.patch(`/invoices/${id}/send`);
    return response.data;
  },

  markAsPaid: async (id: number): Promise<{ invoice: Invoice; message: string }> => {
    const response: AxiosResponse<{ invoice: Invoice; message: string }> = await api.patch(`/invoices/${id}/pay`);
    return response.data;
  },

  updateStatus: async (id: number, status: string, reason?: string): Promise<{ invoice: Invoice; message: string; previousStatus: string }> => {
    const response: AxiosResponse<{ invoice: Invoice; message: string; previousStatus: string }> = await api.patch(`/invoices/${id}/status`, { status, reason });
    return response.data;
  },

  sendReminder: async (id: number): Promise<{ message: string; daysPastDue: number; reminderType: string }> => {
    const response: AxiosResponse<{ message: string; daysPastDue: number; reminderType: string }> = await api.post(`/invoices/${id}/remind`);
    return response.data;
  },
};

export default api;
