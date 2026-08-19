import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Order } from '../../types';
import { formatPrice, formatDate } from '../../utils';
import { statusText } from '../../utils/orderStatus';
import { deliveryLabel } from '../../utils/delivery';
import '../../styles/orders.css';

const OrderConfirm: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);

  const getStatusText = statusText;

  useEffect(() => {
    const orderData = location.state?.order;
    if (!orderData) {
      navigate('/');
      return;
    }
    setOrder(orderData);
  }, [location, navigate]);

  if (!order) {
    return <div>載入中...</div>;
  }

  return (
    <div className="order-confirm-page">
      <div className="container">
        <div className="order-confirm-content">
          <div className="success-icon">
            ✅
          </div>

          <h1>訂單已確認！</h1>
          <p className="order-message">
            感謝您的訂購！您的訂單已經成功建立，我們將盡快為您準備商品。
          </p>

          <div className="order-details">
            <h2>訂單資訊</h2>

            <div className="order-info">
              <div className="info-row">
                <span className="label">訂單編號:</span>
                <span className="value">{order.id}</span>
              </div>
              <div className="info-row">
                <span className="label">訂單日期:</span>
                <span className="value">{formatDate(order.createdAt)}</span>
              </div>
              <div className="info-row">
                <span className="label">訂單狀態:</span>
                <span className="value status">{getStatusText(order.status)}</span>
              </div>
            </div>

            <h3>配送資訊（{deliveryLabel(order.deliveryMethod)}）</h3>
            <div className="shipping-info">
              <p><strong>{order.deliveryMethod === 'self_pickup' ? '取件人' : '收件人'}:</strong> {order.shippingInfo.name}</p>
              <p><strong>聯絡電話:</strong> {order.shippingInfo.phone}</p>
              {order.deliveryMethod === 'cvs_711' ? (
                <p><strong>取貨門市:</strong> {order.shippingInfo.store_name}（{order.shippingInfo.store_code}）</p>
              ) : order.deliveryMethod === 'self_pickup' ? (
                <p><strong>自取地點:</strong> {order.shippingInfo.location_name} {order.shippingInfo.address}</p>
              ) : (
                <p><strong>配送地址:</strong> {order.shippingInfo.postalCode} {order.shippingInfo.city} {order.shippingInfo.address}</p>
              )}
              {order.shippingInfo.note && <p><strong>備註:</strong> {order.shippingInfo.note}</p>}
            </div>

            <h3>訂單商品</h3>
            <div className="confirm-order-items">
              {order.items.map(item => {
                const price = item.sku?.price ?? item.product.price ?? 0;
                return (
                <div key={item.sku?.id || item.product.id} className="confirm-order-item">
                  <div className="confirm-item-info">
                    <span className="confirm-item-name">{item.product.name}</span>
                    <span className="confirm-item-quantity">數量: {item.quantity}</span>
                  </div>
                  <span className="confirm-item-price">
                    {formatPrice(price * item.quantity)}
                  </span>
                </div>
                );
              })}
            </div>

            <div className="confirm-order-total">
              <div className="confirm-total-row">
                <span className="label">商品小計:</span>
                <span className="amount">{formatPrice(order.subtotal ?? order.totalAmount)}</span>
              </div>
              <div className="confirm-total-row">
                <span className="label">運費 (預估):</span>
                <span className="amount">{(order.shippingFee ?? 0) === 0 ? '免運' : formatPrice(order.shippingFee ?? 0)}</span>
              </div>
              <div className="confirm-total-row">
                <span className="label">預估總計:</span>
                <span className="amount">{formatPrice(order.totalAmount)}</span>
              </div>
            </div>
            <p className="checkout-fee-note">
              訂單已送出，等待店家核對商品與運費。核對完成後才會進入付款階段。
            </p>
          </div>

          <div className="next-steps">
            <div className="action-buttons">
              <Link to="/my-orders" className="payment-btn">
                前往我的訂單
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirm;