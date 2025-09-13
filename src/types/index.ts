// 使用者相關類型
export interface User {
  id: string;
  email: string;
  username: string;
  createdAt: string;
  isAdmin?: boolean;
}

// 商品相關類型
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  stock: number;
  category: string;
}

// 購物車項目類型
export interface CartItem {
  product: Product;
  quantity: number;
}

// 訂單相關類型
export interface Order {
  id: string;
  userId: string;
  items: CartItem[];
  totalAmount: number;
  status: OrderStatus;
  createdAt: string;
  shippingInfo: ShippingInfo;
  paymentInfo?: PaymentInfo;
}

// 付款資訊類型
export interface PaymentInfo {
  last5Digits: string;
  completedAt: string;
}

export enum OrderStatus {
  PENDING = 'pending',
  PAYMENT_SUBMITTED = 'payment_submitted',
  CONFIRMED = 'confirmed',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled'
}

// 配送資訊類型
export interface ShippingInfo {
  name: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
}

// 表單相關類型
export interface LoginForm {
  email: string;
  password: string;
}

export interface RegisterForm {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface CheckoutForm {
  name: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  notes?: string;
}

// API 回應類型
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}