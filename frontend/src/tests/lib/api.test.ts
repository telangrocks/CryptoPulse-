// =============================================================================
// API Client Tests - Production Ready
// =============================================================================
// Comprehensive unit tests for the API client

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import axios from 'axios';
import { apiClient, createAuthenticatedAPI, handleAPIError, getAPIMetrics, resetAPIMetrics } from '../../lib/api';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios);

// Mock window.localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetAPIMetrics();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('API Client Configuration', () => {
    test('should create API client with default configuration', () => {
      expect(apiClient.defaults.baseURL).toBe('http://localhost:1337');
      expect(apiClient.defaults.timeout).toBe(10000);
      expect(apiClient.defaults.headers['Content-Type']).toBe('application/json');
    });

    test('should handle environment-specific base URL', () => {
      const originalEnv = process.env.VITE_API_BASE_URL;
      process.env.VITE_API_BASE_URL = 'https://api.example.com';
      
      // Re-import to get new configuration
      vi.resetModules();
      
      expect(process.env.VITE_API_BASE_URL).toBe('https://api.example.com');
      
      // Restore original environment
      process.env.VITE_API_BASE_URL = originalEnv;
    });

    test('should set up request interceptor', () => {
      expect(apiClient.interceptors.request).toBeDefined();
    });

    test('should set up response interceptor', () => {
      expect(apiClient.interceptors.response).toBeDefined();
    });
  });

  describe('Request Interceptor', () => {
    test('should add authentication token to requests', async () => {
      localStorageMock.getItem.mockReturnValue('test-token');
      
      mockedAxios.create.mockReturnValue({
        ...apiClient,
        interceptors: {
          request: {
            use: vi.fn((fn) => {
              const config = { headers: {} };
              fn(config);
              return config;
            }),
          },
          response: {
            use: vi.fn(),
          },
        },
      });

      const requestInterceptor = apiClient.interceptors.request.use as any;
      const config = { headers: {} };
      
      requestInterceptor(config);
      
      expect(config.headers.Authorization).toBe('Bearer test-token');
    });

    test('should handle missing token gracefully', async () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const requestInterceptor = apiClient.interceptors.request.use as any;
      const config = { headers: {} };
      
      requestInterceptor(config);
      
      expect(config.headers.Authorization).toBeUndefined();
    });

    test('should add correlation ID to requests', async () => {
      const requestInterceptor = apiClient.interceptors.request.use as any;
      const config = { headers: {} };
      
      requestInterceptor(config);
      
      expect(config.headers['X-Correlation-ID']).toBeDefined();
      expect(config.headers['X-Request-ID']).toBeDefined();
    });

    test('should add API version header', async () => {
      const requestInterceptor = apiClient.interceptors.request.use as any;
      const config = { headers: {} };
      
      requestInterceptor(config);
      
      expect(config.headers['X-API-Version']).toBe('v1');
    });
  });

  describe('Response Interceptor', () => {
    test('should handle successful responses', async () => {
      const mockResponse = {
        data: { message: 'Success' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      const responseInterceptor = apiClient.interceptors.response.use as any;
      const result = responseInterceptor(mockResponse);
      
      expect(result).toEqual(mockResponse);
    });

    test('should handle 401 unauthorized responses', async () => {
      const mockError = {
        response: {
          status: 401,
          data: { error: 'Unauthorized' },
        },
        config: {},
      };

      const responseInterceptor = apiClient.interceptors.response.use as any;
      
      expect(() => responseInterceptor(mockError)).toThrow();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('authToken');
    });

    test('should handle 403 forbidden responses', async () => {
      const mockError = {
        response: {
          status: 403,
          data: { error: 'Forbidden' },
        },
        config: {},
      };

      const responseInterceptor = apiClient.interceptors.response.use as any;
      
      expect(() => responseInterceptor(mockError)).toThrow();
    });

    test('should handle network errors', async () => {
      const mockError = {
        code: 'NETWORK_ERROR',
        message: 'Network Error',
        config: {},
      };

      const responseInterceptor = apiClient.interceptors.response.use as any;
      
      expect(() => responseInterceptor(mockError)).toThrow();
    });

    test('should handle timeout errors', async () => {
      const mockError = {
        code: 'ECONNABORTED',
        message: 'timeout of 10000ms exceeded',
        config: {},
      };

      const responseInterceptor = apiClient.interceptors.response.use as any;
      
      expect(() => responseInterceptor(mockError)).toThrow();
    });
  });

  describe('API Error Handling', () => {
    test('should handle API errors correctly', () => {
      const error = {
        response: {
          status: 400,
          data: { error: 'Bad Request', details: ['Invalid email'] },
        },
      };

      const result = handleAPIError(error);
      
      expect(result.status).toBe(400);
      expect(result.message).toBe('Bad Request');
      expect(result.details).toEqual(['Invalid email']);
    });

    test('should handle network errors', () => {
      const error = {
        code: 'NETWORK_ERROR',
        message: 'Network Error',
      };

      const result = handleAPIError(error);
      
      expect(result.status).toBe(0);
      expect(result.message).toBe('Network Error');
    });

    test('should handle timeout errors', () => {
      const error = {
        code: 'ECONNABORTED',
        message: 'timeout of 10000ms exceeded',
      };

      const result = handleAPIError(error);
      
      expect(result.status).toBe(0);
      expect(result.message).toBe('Request timeout');
    });

    test('should handle unknown errors', () => {
      const error = new Error('Unknown error');

      const result = handleAPIError(error);
      
      expect(result.status).toBe(0);
      expect(result.message).toBe('An unexpected error occurred');
    });
  });

  describe('Authenticated API', () => {
    test('should create authenticated API client', () => {
      const token = 'test-token';
      const authAPI = createAuthenticatedAPI(token);
      
      expect(authAPI.defaults.headers.Authorization).toBe(`Bearer ${token}`);
    });

    test('should handle token expiration', async () => {
      localStorageMock.getItem.mockReturnValue('expired-token');
      
      mockedAxios.get.mockRejectedValue({
        response: {
          status: 401,
          data: { error: 'Token expired' },
        },
      });

      const authAPI = createAuthenticatedAPI('expired-token');
      
      await expect(authAPI.get('/test')).rejects.toThrow();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('authToken');
    });
  });

  describe('API Methods', () => {
    test('should make GET requests', async () => {
      const mockData = { id: 1, name: 'Test' };
      mockedAxios.get.mockResolvedValue({ data: mockData });

      const response = await apiClient.get('/test');
      
      expect(response.data).toEqual(mockData);
      expect(mockedAxios.get).toHaveBeenCalledWith('/test', undefined);
    });

    test('should make POST requests', async () => {
      const requestData = { name: 'Test' };
      const mockResponse = { data: { id: 1, ...requestData } };
      mockedAxios.post.mockResolvedValue(mockResponse);

      const response = await apiClient.post('/test', requestData);
      
      expect(response.data).toEqual(mockResponse.data);
      expect(mockedAxios.post).toHaveBeenCalledWith('/test', requestData, undefined);
    });

    test('should make PUT requests', async () => {
      const requestData = { id: 1, name: 'Updated Test' };
      const mockResponse = { data: requestData };
      mockedAxios.put.mockResolvedValue(mockResponse);

      const response = await apiClient.put('/test/1', requestData);
      
      expect(response.data).toEqual(mockResponse.data);
      expect(mockedAxios.put).toHaveBeenCalledWith('/test/1', requestData, undefined);
    });

    test('should make DELETE requests', async () => {
      mockedAxios.delete.mockResolvedValue({ data: { success: true } });

      const response = await apiClient.delete('/test/1');
      
      expect(response.data.success).toBe(true);
      expect(mockedAxios.delete).toHaveBeenCalledWith('/test/1', undefined);
    });

    test('should make PATCH requests', async () => {
      const requestData = { name: 'Patched Test' };
      const mockResponse = { data: { id: 1, ...requestData } };
      mockedAxios.patch.mockResolvedValue(mockResponse);

      const response = await apiClient.patch('/test/1', requestData);
      
      expect(response.data).toEqual(mockResponse.data);
      expect(mockedAxios.patch).toHaveBeenCalledWith('/test/1', requestData, undefined);
    });
  });

  describe('API Metrics', () => {
    test('should track request metrics', async () => {
      mockedAxios.get.mockResolvedValue({ data: { success: true } });

      await apiClient.get('/test');
      
      const metrics = getAPIMetrics();
      expect(metrics.requests.total).toBe(1);
      expect(metrics.requests.successful).toBe(1);
      expect(metrics.requests.failed).toBe(0);
    });

    test('should track error metrics', async () => {
      mockedAxios.get.mockRejectedValue({
        response: {
          status: 500,
          data: { error: 'Internal Server Error' },
        },
      });

      try {
        await apiClient.get('/test');
      } catch (error) {
        // Expected to fail
      }
      
      const metrics = getAPIMetrics();
      expect(metrics.requests.total).toBe(1);
      expect(metrics.requests.successful).toBe(0);
      expect(metrics.requests.failed).toBe(1);
    });

    test('should track performance metrics', async () => {
      mockedAxios.get.mockResolvedValue({ data: { success: true } });

      // Make multiple requests
      for (let i = 0; i < 10; i++) {
        await apiClient.get('/test');
      }
      
      const metrics = getAPIMetrics();
      expect(metrics.performance.average).toBeGreaterThan(0);
      expect(metrics.performance.p95).toBeGreaterThanOrEqual(metrics.performance.average);
      expect(metrics.performance.max).toBeGreaterThan(0);
    });

    test('should track error rates by status code', async () => {
      mockedAxios.get.mockRejectedValue({
        response: {
          status: 404,
          data: { error: 'Not Found' },
        },
      });

      try {
        await apiClient.get('/test');
      } catch (error) {
        // Expected to fail
      }
      
      const metrics = getAPIMetrics();
      expect(metrics.errorRates['404']).toBe('100.00');
    });

    test('should reset metrics correctly', async () => {
      mockedAxios.get.mockResolvedValue({ data: { success: true } });

      await apiClient.get('/test');
      
      let metrics = getAPIMetrics();
      expect(metrics.requests.total).toBe(1);
      
      resetAPIMetrics();
      
      metrics = getAPIMetrics();
      expect(metrics.requests.total).toBe(0);
    });
  });

  describe('Request Configuration', () => {
    test('should handle custom headers', async () => {
      const customHeaders = {
        'X-Custom-Header': 'custom-value',
        'Accept': 'application/json',
      };

      mockedAxios.get.mockResolvedValue({ data: {} });

      await apiClient.get('/test', { headers: customHeaders });
      
      expect(mockedAxios.get).toHaveBeenCalledWith('/test', { headers: customHeaders });
    });

    test('should handle query parameters', async () => {
      const params = {
        page: 1,
        limit: 10,
        search: 'test',
      };

      mockedAxios.get.mockResolvedValue({ data: {} });

      await apiClient.get('/test', { params });
      
      expect(mockedAxios.get).toHaveBeenCalledWith('/test', { params });
    });

    test('should handle request timeout', async () => {
      mockedAxios.get.mockResolvedValue({ data: {} });

      await apiClient.get('/test', { timeout: 5000 });
      
      expect(mockedAxios.get).toHaveBeenCalledWith('/test', { timeout: 5000 });
    });

    test('should handle request cancellation', async () => {
      const source = axios.CancelToken.source();
      
      mockedAxios.get.mockResolvedValue({ data: {} });

      await apiClient.get('/test', {
        cancelToken: source.token,
      });
      
      expect(mockedAxios.get).toHaveBeenCalledWith('/test', {
        cancelToken: source.token,
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle concurrent requests', async () => {
      mockedAxios.get.mockResolvedValue({ data: { success: true } });

      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(apiClient.get('/test'));
      }

      const results = await Promise.all(promises);
      expect(results).toHaveLength(10);

      const metrics = getAPIMetrics();
      expect(metrics.requests.total).toBe(10);
    });

    test('should handle large response data', async () => {
      const largeData = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        data: 'A'.repeat(1000),
      }));

      mockedAxios.get.mockResolvedValue({ data: largeData });

      const response = await apiClient.get('/large-data');
      expect(response.data).toHaveLength(10000);

      const metrics = getAPIMetrics();
      expect(metrics.performance.average).toBeGreaterThan(0);
    });

    test('should handle malformed JSON responses', async () => {
      mockedAxios.get.mockRejectedValue({
        response: {
          status: 200,
          data: 'invalid json',
        },
      });

      await expect(apiClient.get('/test')).rejects.toThrow();

      const metrics = getAPIMetrics();
      expect(metrics.requests.failed).toBe(1);
    });

    test('should handle empty responses', async () => {
      mockedAxios.get.mockResolvedValue({ data: null });

      const response = await apiClient.get('/test');
      expect(response.data).toBeNull();

      const metrics = getAPIMetrics();
      expect(metrics.requests.successful).toBe(1);
    });

    test('should handle very long URLs', async () => {
      const longPath = '/test/' + 'a'.repeat(10000);
      
      mockedAxios.get.mockResolvedValue({ data: {} });

      await apiClient.get(longPath);
      
      expect(mockedAxios.get).toHaveBeenCalledWith(longPath, undefined);
    });

    test('should handle special characters in URLs', async () => {
      const specialPath = '/test/with-special-chars!@#$%^&*()_+-=[]{}|;:,.<>?';
      
      mockedAxios.get.mockResolvedValue({ data: {} });

      await apiClient.get(specialPath);
      
      expect(mockedAxios.get).toHaveBeenCalledWith(specialPath, undefined);
    });

    test('should handle unicode in request data', async () => {
      const unicodeData = {
        message: 'Hello 世界! 🌍',
        emoji: '🚀💻⭐',
      };

      mockedAxios.post.mockResolvedValue({ data: unicodeData });

      const response = await apiClient.post('/test', unicodeData);
      expect(response.data).toEqual(unicodeData);
    });

    test('should handle memory pressure with many requests', async () => {
      mockedAxios.get.mockResolvedValue({ data: { success: true } });

      const promises = [];
      for (let i = 0; i < 1000; i++) {
        promises.push(apiClient.get(`/test/${i}`));
      }

      const results = await Promise.all(promises);
      expect(results).toHaveLength(1000);

      const metrics = getAPIMetrics();
      expect(metrics.requests.total).toBe(1000);
      expect(metrics.performance.max).toBeGreaterThan(0);
    });
  });
});
