import { mockProducts, mockUsers } from './mockData';

// 初始化應用資料
export const initializeAppData = () => {
  // 初始化商品資料
  if (!localStorage.getItem('products')) {
    localStorage.setItem('products', JSON.stringify(mockProducts));
  }

  // 初始化使用者資料（包含預設管理員帳號）
  if (!localStorage.getItem('users')) {
    const defaultAdmin = {
      ...mockUsers[0],
      password: 'admin123' // 預設密碼
    };
    localStorage.setItem('users', JSON.stringify([defaultAdmin]));
  }

  // 初始化訂單資料
  if (!localStorage.getItem('orders')) {
    localStorage.setItem('orders', JSON.stringify([]));
  }

  // 初始化購物車
  if (!localStorage.getItem('cart')) {
    localStorage.setItem('cart', JSON.stringify([]));
  }
};

// 獲取當前登入使用者
export const getCurrentUser = () => {
  return JSON.parse(localStorage.getItem('user') || 'null');
};

// 檢查使用者是否為管理員
export const isAdmin = () => {
  const user = getCurrentUser();
  return user && user.isAdmin === true;
};

// 登出使用者
export const logout = () => {
  localStorage.removeItem('user');
};

// 獲取所有商品
export const getProducts = () => {
  return JSON.parse(localStorage.getItem('products') || '[]');
};

// 獲取使用者的訂單
export const getUserOrders = (userId: string) => {
  const orders = JSON.parse(localStorage.getItem('orders') || '[]');
  return orders.filter((order: any) => order.userId === userId);
};

// 獲取所有訂單 (僅管理員)
export const getAllOrders = () => {
  return JSON.parse(localStorage.getItem('orders') || '[]');
};