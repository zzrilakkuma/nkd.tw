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
    const isLoginRequest = error.config?.url?.includes('/auth/login');
    if (error.response?.status === 401 && !isLoginRequest) {
      // Token 過期，清除登入資訊（登入本身的 401 是帳密錯誤，交給表單顯示訊息）
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// 認證 API
// 註：Phase 1 不開放公開註冊，帳號一律由管理員於後台建立。
export const authAPI = {
  login: async (credentials: { email: string; password: string }) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  changePassword: async (data: { old_password: string; new_password: string }) => {
    const response = await api.put('/auth/password', data);
    return response.data;
  },

  updateProfile: async (data: {
    saved_address?: Array<{ id: string; label?: string; name: string; phone: string; postalCode: string; city: string; address: string }>;
    company_name?: string;
    contact_name?: string;
    contact_phone?: string;
    tax_id?: string;
  }) => {
    const response = await api.put('/auth/profile', data);
    return response.data;
  },
};

// 管理員 - 帳號管理 API
export const adminUsersAPI = {
  list: async () => {
    const response = await api.get('/admin/users');
    return response.data;
  },

  create: async (data: {
    email: string;
    username: string;
    is_admin?: boolean;
    company_name?: string;
    contact_name?: string;
    contact_phone?: string;
    tax_id?: string;
  }) => {
    const response = await api.post('/admin/users', data);
    return response.data; // { user, temp_password }
  },

  resetPassword: async (userId: string) => {
    const response = await api.post(`/admin/users/${userId}/reset-password`);
    return response.data; // { user, temp_password }
  },

  update: async (userId: string, data: { is_active?: boolean; company_name?: string; contact_name?: string; contact_phone?: string; tax_id?: string }) => {
    const response = await api.patch(`/admin/users/${userId}`, data);
    return response.data;
  },
};

// 將後端商品正規化：補上供舊畫面/購物車使用的衍生欄位（image / price / stock）
export const normalizeProduct = (p: any) => {
  const activeSkus = Array.isArray(p.skus) ? p.skus.filter((s: any) => s.is_active) : [];
  const defaultSku = activeSkus[0] || (p.skus && p.skus[0]) || null;
  return {
    ...p,
    image: p.main_image || '/images/placeholder.svg',
    price: defaultSku ? defaultSku.price : 0,
    stock: defaultSku ? defaultSku.available : 0,
  };
};

// 商品 API
export const productsAPI = {
  getAll: async (params?: { brand_id?: string; category_id?: string }) => {
    const response = await api.get('/products', { params: params || {} });
    return (response.data as any[]).map(normalizeProduct);
  },

  getAllAdmin: async () => {
    const response = await api.get('/products/admin/all');
    return (response.data as any[]).map(normalizeProduct);
  },

  getById: async (id: string) => {
    const response = await api.get(`/products/${id}`);
    return normalizeProduct(response.data);
  },

  create: async (productData: any) => {
    const response = await api.post('/products', productData);
    return normalizeProduct(response.data);
  },

  update: async (id: string, productData: any) => {
    const response = await api.put(`/products/${id}`, productData);
    return normalizeProduct(response.data);
  },

  delete: async (id: string) => {
    const response = await api.delete(`/products/${id}`);
    return response.data;
  },

  // SKU（掛在商品下）
  createSku: async (productId: string, skuData: any) => {
    const response = await api.post(`/products/${productId}/skus`, skuData);
    return response.data;
  },
  updateSku: async (productId: string, skuId: string, skuData: any) => {
    const response = await api.put(`/products/${productId}/skus/${skuId}`, skuData);
    return response.data;
  },
  deleteSku: async (productId: string, skuId: string) => {
    const response = await api.delete(`/products/${productId}/skus/${skuId}`);
    return response.data;
  },
};

// 品牌 API
export const brandsAPI = {
  list: async () => (await api.get('/brands')).data,
  create: async (data: any) => (await api.post('/brands', data)).data,
  update: async (id: string, data: any) => (await api.put(`/brands/${id}`, data)).data,
  delete: async (id: string) => (await api.delete(`/brands/${id}`)).data,
};

// 類別 API
export const categoriesAPI = {
  list: async () => (await api.get('/categories')).data,
  create: async (data: any) => (await api.post('/categories', data)).data,
  update: async (id: string, data: any) => (await api.put(`/categories/${id}`, data)).data,
  delete: async (id: string) => (await api.delete(`/categories/${id}`)).data,
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

  // 客戶：提交付款（等待付款 → 等待入帳確認）
  pay: async (id: string, last5Digits: string) => {
    const response = await api.post(`/orders/${id}/pay`, { last5Digits });
    return response.data;
  },

  // 客戶/管理員：取消訂單（限提交付款前）
  cancel: async (id: string) => {
    const response = await api.post(`/orders/${id}/cancel`);
    return response.data;
  },

  // 管理員：等待核對階段調整品項/數量（可含折扣）
  updateItems: async (id: string, items: Array<{ sku_id: string; quantity: number }>, discount?: number) => {
    const response = await api.put(`/orders/${id}/items`, { items, discount });
    return response.data;
  },

  // 管理員：核對完成並輸入運費與折扣（一般 → 等待付款；月結 → 視同已付款直接準備出貨）
  verify: async (id: string, shipping_fee: number, discount = 0, payment_type: 'normal' | 'monthly' = 'normal') => {
    const response = await api.post(`/orders/${id}/verify`, { shipping_fee, discount, payment_type });
    return response.data;
  },

  // 管理員：變更狀態（後端驗證合法轉換）
  changeStatus: async (id: string, status: string) => {
    const response = await api.put(`/orders/${id}/status`, { status });
    return response.data;
  },

  getAllOrders: async () => {
    const response = await api.get('/orders/admin/all');
    return response.data;
  },
};

// 圖片 API（上傳後回傳絕對網址，跨網域部署也能正確顯示）
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/v1\/?$/, '');
export const imagesAPI = {
  upload: async (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    const response = await api.post('/images', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return { ...response.data, absoluteUrl: API_ORIGIN + response.data.url };
  },
};

// 自取地點 API
export const pickupLocationsAPI = {
  list: async (activeOnly = false) => {
    const response = await api.get('/pickup-locations', { params: activeOnly ? { active_only: true } : {} });
    return response.data;
  },
  create: async (data: any) => (await api.post('/pickup-locations', data)).data,
  update: async (id: string, data: any) => (await api.put(`/pickup-locations/${id}`, data)).data,
  delete: async (id: string) => (await api.delete(`/pickup-locations/${id}`)).data,
};

export default api;
