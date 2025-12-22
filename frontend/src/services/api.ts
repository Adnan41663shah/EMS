import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { toast } from 'react-toastify';
import { ApiResponse } from '@/types';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: import.meta.env.VITE_API_URL || '/api',
      timeout: 60000, // Increased timeout for file uploads
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true,
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle errors
    this.api.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      (error) => {
        // Only show toast for non-login/register requests to avoid duplicate toasts
        const isAuthRequest = error.config?.url?.includes('/auth/login') || error.config?.url?.includes('/auth/register');
        
        if (error.response?.status === 401) {
          // Token expired or invalid
          if (!isAuthRequest) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
            toast.error('Session expired. Please login again.');
          }
        } else if (error.response?.status === 403 && !isAuthRequest) {
          toast.error('Access denied. Insufficient permissions.');
        } else if (error.response?.status >= 500 && !isAuthRequest) {
          toast.error('Server error. Please try again later.');
        } else if (error.response?.status === 400 && !isAuthRequest) {
          // Don't show toast for 400 errors - let components handle validation/error messages
          // This prevents duplicate toasts when components show their own error messages
        } else if (error.response?.data?.message && !isAuthRequest) {
          toast.error(error.response.data.message);
        } else if (!isAuthRequest) {
          toast.error('An error occurred. Please try again.');
        }
        return Promise.reject(error);
      }
    );
  }

  // Generic request method
  private async request<T = any>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      const response = await this.api.request({
        method,
        url,
        data,
        ...config,
      });

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Auth endpoints
  auth = {
    login: (credentials: { email: string; password: string }) =>
      this.request('POST', '/auth/login', credentials),
    
    register: (userData: any) =>
      this.request('POST', '/auth/register', userData),
    
    getProfile: () =>
      this.request('GET', '/auth/profile'),
    
    updateProfile: (userData: any) =>
      this.request('PUT', '/auth/profile', userData),
  };

  // Inquiry endpoints
  inquiries = {
    getAll: (params?: any) =>
      this.request('GET', '/inquiries', undefined, { params }),
    
    getById: (id: string) =>
      this.request('GET', `/inquiries/${id}`),
    
    create: (data: any) =>
      this.request('POST', '/inquiries', data),
    
    update: (id: string, data: any) =>
      this.request('PUT', `/inquiries/${id}`, data),
    
    delete: (id: string) =>
      this.request('DELETE', `/inquiries/${id}`),
    
    assign: (id: string, assignedTo: string) =>
      this.request('POST', `/inquiries/${id}/assign`, { assignedTo }),

    claim: (id: string) =>
      this.request('POST', `/inquiries/${id}/claim`),

    moveToUnattended: (id: string) =>
      this.request('POST', `/inquiries/${id}/move-to-unattended`),

    forwardToSales: (id: string) =>
      this.request('POST', `/inquiries/${id}/forward-to-sales`),

    reassignToPresales: (id: string, targetUserId: string) =>
      this.request('POST', `/inquiries/${id}/reassign`, { targetUserId }),
    
    reassignToSales: (id: string, targetUserId: string) =>
      this.request('POST', `/inquiries/${id}/reassign-sales`, { targetUserId }),
    
    addFollowUp: (id: string, data: any) =>
      this.request('POST', `/inquiries/${id}/follow-up`, data),
    
    updateFollowUp: (id: string, followUpId: string, data: any) =>
      this.request('PUT', `/inquiries/${id}/follow-up/${followUpId}`, data),
    
    deleteFollowUp: (id: string, followUpId: string) =>
      this.request('DELETE', `/inquiries/${id}/follow-up/${followUpId}`),
    
    getDashboardStats: () =>
      this.request('GET', '/inquiries/dashboard'),
    
    getUnattendedCounts: () =>
      this.request('GET', '/inquiries/unattended-counts'),
    
    getMyFollowUps: () =>
      this.request('GET', '/inquiries/my-follow-ups'),
    
    checkPhoneExists: (phone: string) =>
      this.request('GET', '/inquiries/check-phone', undefined, { params: { phone } }),
  };

  // User endpoints
  users = {
    getAll: (params?: any) =>
      this.request('GET', '/users', undefined, { params }),
    
    getById: (id: string) =>
      this.request('GET', `/users/${id}`),
    
    create: (data: any) =>
      this.request('POST', '/users', data),
    
    update: (id: string, data: any) =>
      this.request('PUT', `/users/${id}`, data),
    
    delete: (id: string) =>
      this.request('DELETE', `/users/${id}`),
    
    toggleStatus: (id: string) =>
      this.request('PATCH', `/users/${id}/toggle-status`),
  };

  // Options endpoints (admin only)
  options = {
    get: () => this.request('GET', '/options'),
    update: (data: { courses?: string[]; locations?: string[]; statuses?: string[]; leadStages?: Array<{ label: string; subStages: string[] }> }) => this.request('PUT', '/options', data),
  };

  // Student endpoints (admin only)
  students = {
    import: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return this.api.post('/students/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 300000, // 5 minutes for large file uploads
        withCredentials: true,
      }).then(response => response.data);
    },
    getAll: (params?: any) =>
      this.request('GET', '/students', undefined, { params }),
    deleteAll: () =>
      this.request('DELETE', '/students/all'),
  };

}

export const apiService = new ApiService();
export default apiService;
