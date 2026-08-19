import React, { useEffect, useState } from 'react';
import { OrderStatus } from '../../types';
import { formatPrice, formatDate } from '../../utils';
import { statusText as STATUS_TEXT_FN, statusClass as STATUS_CLASS_FN, NEXT_STATUSES } from '../../utils/orderStatus';
import { deliveryLabel } from '../../utils/delivery';
import { ApiOrder } from './AdminDashboard';

interface Props {
  order: ApiOrder | null;
  onClose: () => void;
  onStatusChange: (orderId: string, status: OrderStatus) => Promise<void>;
  onVerify: (orderId: string, shippingFee: number) => Promise<void>;
  updatingId: string | null;
}

// 正常流程進度（不含取消/逾期）
const STATUS_STEPS = [
  OrderStatus.PENDING_REVIEW,
  OrderStatus.PENDING_PAYMENT,
  OrderStatus.PENDING_CONFIRM,
  OrderStatus.PREPARING,
  OrderStatus.COMPLETED,
];

const AdminOrderDrawer: React.FC<Props> = ({ order, onClose, onStatusChange, onVerify, updatingId }) => {
  const [feeInput, setFeeInput] = useState<string>('');

  // 進入不同訂單時，預填目前運費
  useEffect(() => {
    if (order) setFeeInput(String(order.shipping_fee ?? 0));
  }, [order?.id]); // eslint-disable-line

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
  const isCancelled = order.status === OrderStatus.CANCELLED || order.status === OrderStatus.EXPIRED;
  const nextStatuses = NEXT_STATUSES[order.status] || [];

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
            <span className={`status ${STATUS_CLASS_FN(order.status)}`}>
              {STATUS_TEXT_FN(order.status)}
            </span>
            {order.locked && <span className="status" style={{ marginLeft: 6 }}>🔒 已鎖定</span>}
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
                    <span className="step-label">{STATUS_TEXT_FN(step)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 配送 / 收件資訊 */}
          <div className="drawer-section">
            <h4>配送資訊（{deliveryLabel(order.delivery_method)}）</h4>
            <div className="info-grid">
              <div className="info-row">
                <span className="info-label">{order.delivery_method === 'self_pickup' ? '取件人' : '姓名'}</span>
                <span className="info-value">{order.shipping_info.name}</span>
              </div>
              <div className="info-row">
                <span className="info-label">電話</span>
                <span className="info-value">{order.shipping_info.phone}</span>
              </div>
              {order.delivery_method === 'cvs_711' ? (
                <>
                  <div className="info-row">
                    <span className="info-label">門市名稱</span>
                    <span className="info-value">{order.shipping_info.store_name}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">門市店號</span>
                    <span className="info-value">{order.shipping_info.store_code}</span>
                  </div>
                </>
              ) : order.delivery_method === 'self_pickup' ? (
                <>
                  <div className="info-row">
                    <span className="info-label">自取地點</span>
                    <span className="info-value">{order.shipping_info.location_name}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">地址</span>
                    <span className="info-value">{order.shipping_info.address}</span>
                  </div>
                </>
              ) : (
                <div className="info-row">
                  <span className="info-label">地址</span>
                  <span className="info-value">
                    {order.shipping_info.postalCode} {order.shipping_info.city} {order.shipping_info.address}
                  </span>
                </div>
              )}
              {order.shipping_info.note && (
                <div className="info-row">
                  <span className="info-label">備註</span>
                  <span className="info-value">{order.shipping_info.note}</span>
                </div>
              )}
            </div>
          </div>

          {/* 商品明細 */}
          <div className="drawer-section">
            <h4>商品明細</h4>
            <div className="order-items-detail">
              {order.items.map((item) => (
                <div key={item.id} className="order-item-row">
                  <img
                    src={item.product?.main_image || '/images/placeholder.svg'}
                    alt={item.product?.name}
                    className="item-thumb"
                    onError={(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.svg'; }}
                  />
                  <div className="item-info">
                    <div className="item-name">
                      {item.product?.name || item.product_id}
                      {[item.sku?.flavor, item.sku?.spec].filter(Boolean).length > 0 && (
                        <span className="item-sku"> · {[item.sku?.flavor, item.sku?.spec].filter(Boolean).join(' / ')}</span>
                      )}
                    </div>
                    <div className="item-price-row">
                      <span className="item-unit-price">{formatPrice(item.price)} × {item.quantity}</span>
                      <span className="item-subtotal">{formatPrice(item.price * item.quantity)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="order-total-row" style={{ fontWeight: 400, fontSize: 14 }}>
              <span>商品小計</span>
              <span>{formatPrice(order.subtotal)}</span>
            </div>
            <div className="order-total-row" style={{ fontWeight: 400, fontSize: 14 }}>
              <span>運費</span>
              <span>{formatPrice(order.shipping_fee)}</span>
            </div>
            <div className="order-total-row">
              <span>最終金額</span>
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

          {/* 操作（依目前狀態顯示） */}
          <div className="drawer-section">
            <h4>操作</h4>

            {/* 等待核對：輸入運費 → 核對完成 */}
            {order.status === OrderStatus.PENDING_REVIEW ? (
              <div>
                <p className="delivery-note-hint">
                  請先與客戶確認此商品數量是否適用「{deliveryLabel(order.delivery_method)}」，
                  並輸入實際運費後點「核對完成」。核對完成後金額鎖定並進入等待付款。
                </p>
                <div className="form-group" style={{ maxWidth: 220 }}>
                  <label>運費（TWD）</label>
                  <input
                    type="number"
                    min="0"
                    value={feeInput}
                    onChange={e => setFeeInput(e.target.value)}
                  />
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                  <button
                    className="btn-save"
                    disabled={updatingId === order.id}
                    onClick={() => {
                      const fee = parseFloat(feeInput);
                      if (isNaN(fee) || fee < 0) { alert('請輸入有效運費'); return; }
                      onVerify(order.id, fee);
                    }}
                  >
                    核對完成（進入待付款）
                  </button>
                  <button
                    className="btn-delete"
                    disabled={updatingId === order.id}
                    onClick={() => onStatusChange(order.id, OrderStatus.CANCELLED)}
                  >
                    取消訂單
                  </button>
                  {updatingId === order.id && <span className="updating-label">更新中...</span>}
                </div>
              </div>
            ) : nextStatuses.length === 0 ? (
              <p className="updating-label">此訂單已結束，無可用操作。</p>
            ) : (
              <div className="drawer-status-action" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {nextStatuses.map(s => (
                  <button
                    key={s}
                    className={s === OrderStatus.CANCELLED || s === OrderStatus.EXPIRED ? 'btn-delete' : 'btn-save'}
                    disabled={updatingId === order.id}
                    onClick={() => onStatusChange(order.id, s)}
                  >
                    {s === OrderStatus.PENDING_CONFIRM ? '標記已提交付款'
                      : s === OrderStatus.PREPARING ? '確認入帳（準備出貨）'
                      : s === OrderStatus.COMPLETED ? '標記已完成'
                      : s === OrderStatus.CANCELLED ? '取消訂單'
                      : s === OrderStatus.EXPIRED ? '標記逾期'
                      : STATUS_TEXT_FN(s)}
                  </button>
                ))}
                {updatingId === order.id && <span className="updating-label">更新中...</span>}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminOrderDrawer;
