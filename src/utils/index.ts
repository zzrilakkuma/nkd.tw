// 格式化價格
export const formatPrice = (price: number): string => {
  return `NT$${Math.round(price).toLocaleString('zh-TW')}`;
};

// 格式化日期
export const formatDate = (date: string): string => {
  return new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(date));
};

// 生成唯一 ID (6位純數字)
let lastTimestamp = 0;
let sequence = 0;

export const generateId = (): string => {
  // 使用時間戳後4位 + 2位流水號，確保唯一性
  const now = Date.now();

  if (now === lastTimestamp) {
    // 同一毫秒內，流水號遞增
    sequence = (sequence + 1) % 100;
  } else {
    // 新的毫秒，重置流水號
    lastTimestamp = now;
    sequence = 0;
  }

  const timestamp4 = now.toString().slice(-4); // 時間戳後4位
  const seq2 = sequence.toString().padStart(2, '0'); // 流水號2位

  return timestamp4 + seq2;
};

// 驗證 email 格式
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// 計算購物車總金額
export const calculateCartTotal = (items: Array<{product: {price: number}, quantity: number}>): number => {
  return items.reduce((total, item) => total + (item.product.price * item.quantity), 0);
};

// 本地儲存工具函數
export const storage = {
  get: <T>(key: string): T | null => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  },
  set: <T>(key: string, value: T): void => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('儲存資料失敗:', error);
    }
  },
  remove: (key: string): void => {
    localStorage.removeItem(key);
  }
};