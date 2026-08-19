import { OrderStatus } from '../types';

// 狀態中文標籤（7 態）
export const ORDER_STATUS_TEXT: Record<string, string> = {
  pending_review: '等待核對',
  pending_payment: '等待付款',
  pending_confirm: '等待入帳確認',
  preparing: '準備出貨',
  completed: '已完成',
  cancelled: '已取消',
  expired: '已逾期',
};

// 對應既有 CSS 狀態色票 class
export const ORDER_STATUS_CLASS: Record<string, string> = {
  pending_review: 'status-pending',
  pending_payment: 'status-payment-submitted',
  pending_confirm: 'status-confirmed',
  preparing: 'status-shipped',
  completed: 'status-delivered',
  cancelled: 'status-cancelled',
  expired: 'status-cancelled',
};

// 各狀態的合法下一步（需與後端 order_state.ALLOWED_TRANSITIONS 一致）
export const NEXT_STATUSES: Record<string, OrderStatus[]> = {
  pending_review: [OrderStatus.PENDING_PAYMENT, OrderStatus.CANCELLED],
  pending_payment: [OrderStatus.PENDING_CONFIRM, OrderStatus.CANCELLED, OrderStatus.EXPIRED],
  pending_confirm: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
  preparing: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
  completed: [],
  cancelled: [],
  expired: [],
};

export const statusText = (s: string) => ORDER_STATUS_TEXT[s] || s;
export const statusClass = (s: string) => ORDER_STATUS_CLASS[s] || '';
