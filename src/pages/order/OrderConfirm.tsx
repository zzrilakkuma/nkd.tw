import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Order } from '../../types';
import { formatPrice, formatDate } from '../../utils';
import '../../styles/orders.css';

const OrderConfirm: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);

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
                <span className="value status">待處理</span>
              </div>
            </div>

            <h3>配送資訊</h3>
            <div className="shipping-info">
              <p><strong>收件人:</strong> {order.shippingInfo.name}</p>
              <p><strong>聯絡電話:</strong> {order.shippingInfo.phone}</p>
              <p><strong>配送地址:</strong> {order.shippingInfo.postalCode} {order.shippingInfo.city} {order.shippingInfo.address}</p>
            </div>

            <h3>訂單商品</h3>
            <div className="order-items">
              {order.items.map(item => (
                <div key={item.product.id} className="order-item">
                  <div className="item-info">
                    <span className="item-name">{item.product.name}</span>
                    <span className="item-quantity">數量: {item.quantity}</span>
                  </div>
                  <span className="item-price">
                    {formatPrice(item.product.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            <div className="order-total">
              <div className="total-row">
                <span className="label">總計:</span>
                <span className="amount">{formatPrice(order.totalAmount)}</span>
              </div>
            </div>
          </div>

          <div className="next-steps">
            <h3>接下來的步驟</h3>
            <p>請點擊下方按鈕查看付款資訊，完成付款後我們將開始處理您的訂單。</p>

            <div className="action-buttons">
              <Link to="/payment" state={{ order }} className="payment-btn">
                查看付款資訊
              </Link>
              <Link to="/my-orders" className="my-orders-btn">
                查看我的訂單
              </Link>
              <Link to="/products" className="continue-shopping-btn">
                繼續購物
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirm;