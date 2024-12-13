import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { getSession, signOut } from 'next-auth/react';
import { toast } from 'react-hot-toast';

interface ApiClientConfig extends AxiosRequestConfig {
  withAuth?: boolean;
  withToast?: boolean;
}

export class ApiClient {
  private client: AxiosInstance;
  private static instance: ApiClient;

  private constructor() {
    this.client = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  public static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }
    return ApiClient.instance;
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      async (config) => {
        if (config.withAuth !== false) {
          const session = await getSession();
          if (session?.accessToken) {
            config.headers.Authorization = `Bearer ${session.accessToken}`;
          }
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        if (response.config.withToast) {
          toast.success(response.data.message || 'Success!');
        }
        return response;
      },
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          await signOut({ redirect: true, callbackUrl: '/auth/login' });
          return Promise.reject(error);
        }

        if (error.response?.status === 403) {
          toast.error('You do not have permission to perform this action');
          return Promise.reject(error);
        }

        if (error.response?.status === 404) {
          toast.error('Resource not found');
          return Promise.reject(error);
        }

        if (error.response?.status === 422) {
          toast.error('Validation error. Please check your input.');
          return Promise.reject(error);
        }

        if (error.response?.status >= 500) {
          toast.error('An unexpected error occurred. Please try again later.');
          return Promise.reject(error);
        }

        if (error.config.withToast !== false) {
          toast.error(
            error.response?.data?.message ||
            'An unexpected error occurred'
          );
        }

        return Promise.reject(error);
      }
    );
  }

  public async get<T = any>(
    url: string,
    config?: ApiClientConfig
  ): Promise<AxiosResponse<T>> {
    return this.client.get<T>(url, config);
  }

  public async post<T = any>(
    url: string,
    data?: any,
    config?: ApiClientConfig
  ): Promise<AxiosResponse<T>> {
    return this.client.post<T>(url, data, config);
  }

  public async put<T = any>(
    url: string,
    data?: any,
    config?: ApiClientConfig
  ): Promise<AxiosResponse<T>> {
    return this.client.put<T>(url, data, config);
  }

  public async patch<T = any>(
    url: string,
    data?: any,
    config?: ApiClientConfig
  ): Promise<AxiosResponse<T>> {
    return this.client.patch<T>(url, data, config);
  }

  public async delete<T = any>(
    url: string,
    config?: ApiClientConfig
  ): Promise<AxiosResponse<T>> {
    return this.client.delete<T>(url, config);
  }

  public setAuthToken(token: string): void {
    this.client.defaults.headers.common.Authorization = `Bearer ${token}`;
  }

  public clearAuthToken(): void {
    delete this.client.defaults.headers.common.Authorization;
  }

  public getUri(config?: AxiosRequestConfig): string {
    return this.client.getUri(config);
  }
}
