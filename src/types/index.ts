// 使用者相關類型
export interface User {
  id: string;
  email: string;
  username: string;
  createdAt: string;
  isAdmin?: boolean;
}

// 品牌 / 類別
export interface Brand {
  id: string;
  name: string;
  sort_order?: number;
  is_active?: boolean;
}

export interface Category {
  id: string;
  name: string;
  sort_order?: number;
  is_active?: boolean;
}

// SKU（實際購買單位，價格與庫存的載體）
export interface SKU {
  id: string;
  product_id: string;
  flavor?: string;
  spec?: string;
  unit?: string;
  price: number;
  stock: number;
  reserved: number;
  available: number;
  is_active: boolean;
}

// 商品相關類型
export interface Product {
  id: string;
  name: string;
  description: string;
  brand_id?: string | null;
  category_id?: string | null;
  brand?: Brand | null;
  category?: Category | null;
  main_image?: string | null;
  images?: string[] | null;
  is_published?: boolean;
  skus: SKU[];

  // 由 API 正規化後填入的衍生/相容欄位（供列表與購物車顯示）
  image?: string;     // = main_image
  price?: number;     // = 預設 SKU 價格
  stock?: number;     // = 預設 SKU 可購買數量
}

// 購物車項目類型（以 SKU 為單位）
export interface CartItem {
  product: Product;
  sku: SKU;
  quantity: number;
}

// 訂單相關類型
export interface Order {
  id: string;
  userId: string;
  items: CartItem[];
  subtotal?: number;
  shippingFee?: number;
  totalAmount: number;
  status: OrderStatus;
  deliveryMethod?: string;
  paymentDeadline?: string | null;
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
  PENDING_REVIEW = 'pending_review',    // 等待管理員核對
  PENDING_PAYMENT = 'pending_payment',  // 等待付款
  PENDING_CONFIRM = 'pending_confirm',  // 等待入帳確認
  PREPARING = 'preparing',              // 準備出貨
  COMPLETED = 'completed',              // 已完成
  CANCELLED = 'cancelled',              // 已取消
  EXPIRED = 'expired'                   // 已逾期
}

// 配送方式
export enum DeliveryMethod {
  HOME_DELIVERY = 'home_delivery',
  CVS_711 = 'cvs_711',
  SELF_PICKUP = 'self_pickup',
}

// 自取地點
export interface PickupLocation {
  id: string;
  name: string;
  address?: string;
  contact?: string;
  note?: string;
  sort_order?: number;
  is_active?: boolean;
}

// 配送資訊類型（依方式帶不同欄位）
export interface ShippingInfo {
  name?: string;
  phone?: string;
  // 宅配
  address?: string;
  city?: string;
  postalCode?: string;
  note?: string;
  // 7-11
  store_name?: string;
  store_code?: string;
  // 自取（快照）
  pickup_location_id?: string;
  location_name?: string;
  contact?: string;
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