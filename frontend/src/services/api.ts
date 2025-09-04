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

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    
    // Log the actual data being sent
    if (config.data) {
      console.log('📤 Request Data:');
      console.log(JSON.stringify(config.data, null, 2));
    }
    
    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.status} ${response.config.url}`);
    console.log('📥 Response Data:', response.data);
    return response;
  },
  (error) => {
    console.error('❌ Response Error:', error.response?.status, error.response?.data || error.message);
    
    // Show detailed validation errors
    if (error.response?.status === 400 && error.response?.data?.details) {
      console.error('🔍 Validation Details:', error.response.data.details);
      error.response.data.details.forEach((detail: any, index: number) => {
        console.error(`   ${index + 1}. ${detail.message} (Path: ${detail.path?.join('.')})`);
      });
    }
    
    // Handle authentication errors
    if (error.response?.status === 401) {
      // Redirect to login or clear user context
      window.location.href = '/login';
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
    const response: AxiosResponse<{ user: User }> = await api.get('/auth/me');
    return response.data;
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
};

export default api;
