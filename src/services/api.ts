import axios from 'axios';

// 根據環境自動選擇 API 地址
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 開發環境下顯示當前使用的 API 地址
if (process.env.NODE_ENV === 'development') {
  console.log('🌐 API Base URL:', API_BASE_URL);
}

// 請求攔截器：自動添加 token
api.interceptors.request.use(
  (config) => {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (user && user.token) {
      config.headers.Authorization = `Bearer ${user.token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 響應攔截器：處理錯誤
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token 過期，清除登入資訊
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// 認證 API
export const authAPI = {
  register: async (userData: { email: string; username: string; password: string }) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  login: async (credentials: { email: string; password: string }) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

// 商品 API
export const productsAPI = {
  getAll: async (category?: string) => {
    const params = category ? { category } : {};
    const response = await api.get('/products', { params });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/products/${id}`);
    return response.data;
  },

  create: async (productData: any) => {
    const response = await api.post('/products', productData);
    return response.data;
  },

  update: async (id: string, productData: any) => {
    const response = await api.put(`/products/${id}`, productData);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete(`/products/${id}`);
    return response.data;
  },
};

// 訂單 API
export const ordersAPI = {
  create: async (orderData: any) => {
    const response = await api.post('/orders', orderData);
    return response.data;
  },

  getUserOrders: async () => {
    const response = await api.get('/orders');
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/orders/${id}`);
    return response.data;
  },

  update: async (id: string, orderData: any) => {
    const response = await api.put(`/orders/${id}`, orderData);
    return response.data;
  },

  getAllOrders: async () => {
    const response = await api.get('/orders/admin/all');
    return response.data;
  },
};

export default api;
