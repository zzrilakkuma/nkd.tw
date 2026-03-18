import React, { useEffect } from 'react';
import { OrderStatus } from '../../types';
import { formatPrice, formatDate } from '../../utils';
import { ApiOrder } from './AdminDashboard';

interface Props {
  order: ApiOrder | null;
  onClose: () => void;
  onStatusChange: (orderId: string, status: OrderStatus) => Promise<void>;
  updatingId: string | null;
}

const STATUS_TEXT: Record<string, string> = {
  pending: '待付款',
  payment_submitted: '待確認',
  confirmed: '已確認',
  shipped: '已出貨',
  delivered: '已送達',
  cancelled: '已取消',
};

const STATUS_CLASS: Record<string, string> = {
  pending: 'status-pending',
  payment_submitted: 'status-payment-submitted',
  confirmed: 'status-confirmed',
  shipped: 'status-shipped',
  delivered: 'status-delivered',
  cancelled: 'status-cancelled',
};

const STATUS_STEPS = [
  OrderStatus.PENDING,
  OrderStatus.PAYMENT_SUBMITTED,
  OrderStatus.CONFIRMED,
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
];

const AdminOrderDrawer: React.FC<Props> = ({ order, onClose, onStatusChange, updatingId }) => {
  // ESC 關閉
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // 防止背景 scroll
  useEffect(() => {
    if (order) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [order]);

  if (!order) return null;

  const currentStepIndex = STATUS_STEPS.indexOf(order.status as OrderStatus);
  const isCancelled = order.status === OrderStatus.CANCELLED;

  return (
    <>
      {/* Backdrop */}
      <div className="drawer-backdrop" onClick={onClose} />

      {/* Drawer */}
      <div className="order-drawer">
        {/* Header */}
        <div className="drawer-header">
          <div className="drawer-title">
            <span className="drawer-order-id">
              #{order.id.length > 10 ? `${order.id.slice(0, 8)}…` : order.id}
            </span>
            <span className={`status ${STATUS_CLASS[order.status]}`}>
              {STATUS_TEXT[order.status]}
            </span>
          </div>
          <button className="drawer-close" onClick={onClose} title="關閉 (ESC)">✕</button>
        </div>

        <div className="drawer-body">
          {/* 時間資訊 */}
          <div className="drawer-meta">
            <span>下單時間：{formatDate(order.created_at)}</span>
            <span>最後更新：{formatDate(order.updated_at)}</span>
          </div>

          {/* 訂單進度 */}
          {!isCancelled && (
            <div className="drawer-section">
              <h4>訂單進度</h4>
              <div className="order-steps">
                {STATUS_STEPS.map((step, i) => (
                  <div
                    key={step}
                    className={`step ${i <= currentStepIndex ? 'done' : ''} ${i === currentStepIndex ? 'current' : ''}`}
                  >
                    <div className="step-dot" />
                    {i < STATUS_STEPS.length - 1 && <div className="step-line" />}
                    <span className="step-label">{STATUS_TEXT[step]}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 收件資訊 */}
          <div className="drawer-section">
            <h4>收件資訊</h4>
            <div className="info-grid">
              <div className="info-row">
                <span className="info-label">姓名</span>
                <span className="info-value">{order.shipping_info.name}</span>
              </div>
              <div className="info-row">
                <span className="info-label">電話</span>
                <span className="info-value">{order.shipping_info.phone}</span>
              </div>
              <div className="info-row">
                <span className="info-label">地址</span>
                <span className="info-value">
                  {order.shipping_info.postalCode} {order.shipping_info.city} {order.shipping_info.address}
                </span>
              </div>
            </div>
          </div>

          {/* 商品明細 */}
          <div className="drawer-section">
            <h4>商品明細</h4>
            <div className="order-items-detail">
              {order.items.map((item) => (
                <div key={item.id} className="order-item-row">
                  <img
                    src={item.product?.image || '/images/placeholder.svg'}
                    alt={item.product?.name}
                    className="item-thumb"
                    onError={(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.svg'; }}
                  />
                  <div className="item-info">
                    <div className="item-name">{item.product?.name || item.product_id}</div>
                    <div className="item-price-row">
                      <span className="item-unit-price">{formatPrice(item.price)} × {item.quantity}</span>
                      <span className="item-subtotal">{formatPrice(item.price * item.quantity)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="order-total-row">
              <span>合計</span>
              <span className="total-amount">{formatPrice(order.total_amount)}</span>
            </div>
          </div>

          {/* 付款資訊 */}
          {order.payment_info && (
            <div className="drawer-section">
              <h4>付款資訊</h4>
              <div className="info-grid">
                <div className="info-row">
                  <span className="info-label">轉帳末五碼</span>
                  <span className="info-value payment-digits">{order.payment_info.last5Digits}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">提交時間</span>
                  <span className="info-value">{formatDate(order.payment_info.completedAt)}</span>
                </div>
              </div>
            </div>
          )}

          {/* 更改狀態 */}
          <div className="drawer-section">
            <h4>更改狀態</h4>
            <div className="drawer-status-action">
              <select
                value={order.status}
                onChange={(e) => onStatusChange(order.id, e.target.value as OrderStatus)}
                className="status-select drawer-select"
                disabled={updatingId === order.id}
              >
                <option value={OrderStatus.PENDING}>待付款</option>
                <option value={OrderStatus.PAYMENT_SUBMITTED}>待確認</option>
                <option value={OrderStatus.CONFIRMED}>已確認</option>
                <option value={OrderStatus.SHIPPED}>已出貨</option>
                <option value={OrderStatus.DELIVERED}>已送達</option>
                <option value={OrderStatus.CANCELLED}>已取消</option>
              </select>
              {updatingId === order.id && (
                <span className="updating-label">更新中...</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminOrderDrawer;
