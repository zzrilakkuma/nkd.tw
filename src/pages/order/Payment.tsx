import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Order } from '../../types';
import { formatPrice, formatDate } from '../../utils';
import '../../styles/orders.css';

const Payment: React.FC = () => {
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

  const bankInfo = {
    bankName: '台灣銀行',
    bankCode: '004',
    accountNumber: '123-456-789-012',
    accountName: '水煙商城有限公司'
  };

  if (!order) {
    return <div>載入中...</div>;
  }

  return (
    <div className="payment-page">
      <div className="container">
        <h1>付款資訊</h1>

        <div className="payment-content">
          <div className="order-summary">
            <h2>訂單摘要</h2>

            <div className="order-basic-info">
              <div className="info-row">
                <span>訂單編號:</span>
                <span>{order.id}</span>
              </div>
              <div className="info-row">
                <span>訂單日期:</span>
                <span>{formatDate(order.createdAt)}</span>
              </div>
              <div className="info-row">
                <span>付款金額:</span>
                <span className="amount">{formatPrice(order.totalAmount)}</span>
              </div>
            </div>

            <div className="order-items-summary">
              <h3>商品清單</h3>
              {order.items.map(item => (
                <div key={item.product.id} className="item-summary">
                  <span>{item.product.name} x {item.quantity}</span>
                  <span>{formatPrice(item.product.price * item.quantity)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="payment-info">
            <h2>銀行轉帳資訊</h2>

            <div className="bank-details">
              <div className="bank-info-card">
                <div className="bank-row">
                  <span className="label">銀行名稱:</span>
                  <span className="value">{bankInfo.bankName}</span>
                </div>
                <div className="bank-row">
                  <span className="label">銀行代碼:</span>
                  <span className="value">{bankInfo.bankCode}</span>
                </div>
                <div className="bank-row">
                  <span className="label">帳戶號碼:</span>
                  <span className="value account-number">{bankInfo.accountNumber}</span>
                </div>
                <div className="bank-row">
                  <span className="label">戶名:</span>
                  <span className="value">{bankInfo.accountName}</span>
                </div>
                <div className="bank-row highlight">
                  <span className="label">轉帳金額:</span>
                  <span className="value amount">{formatPrice(order.totalAmount)}</span>
                </div>
              </div>
            </div>

            <div className="payment-instructions">
              <h3>付款說明</h3>
              <ul>
                <li>請使用 ATM 或網路銀行轉帳至上述帳戶</li>
                <li>轉帳時請備註您的訂單編號: <strong>{order.id}</strong></li>
                <li>轉帳完成後，我們將在 1-2 個工作天內確認您的付款</li>
                <li>付款確認後，我們將立即開始準備您的商品並安排出貨</li>
                <li>如有任何問題，請聯絡客服: 02-1234-5678</li>
              </ul>
            </div>

            <div className="payment-notice">
              <h4>重要提醒</h4>
              <p>
                請保留轉帳收據作為付款憑證。如於 3 個工作天內未完成付款，
                訂單將自動取消。完成付款後可在後台查看訂單狀態。
              </p>
            </div>
          </div>
        </div>

        <div className="payment-actions">
          <Link to="/products" className="continue-shopping-btn">
            繼續購物
          </Link>
          <button
            onClick={() => {
              alert('感謝您的訂購！請記得完成轉帳付款。');
              navigate('/');
            }}
            className="complete-btn"
          >
            我已了解付款資訊
          </button>
        </div>
      </div>
    </div>
  );
};

export default Payment;