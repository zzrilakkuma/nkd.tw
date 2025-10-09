import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Order, OrderStatus } from '../../types';
import { formatPrice, formatDate } from '../../utils';
import '../../styles/orders.css';
import '../../styles/my-orders.css';

const Payment: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [last5Digits, setLast5Digits] = useState('');
  const [inputError, setInputError] = useState('');

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

  const handlePaymentComplete = () => {
    setShowPaymentModal(true);
    setLast5Digits('');
    setInputError('');
  };

  const submitPaymentComplete = () => {
    if (!order || !last5Digits || last5Digits.length !== 5) {
      alert('請輸入轉帳帳號末五碼');
      return;
    }

    const updatedOrder: Order = {
      ...order,
      status: OrderStatus.PAYMENT_SUBMITTED,
      paymentInfo: {
        last5Digits: last5Digits,
        completedAt: new Date().toISOString()
      }
    };

    // 更新 localStorage 中的訂單
    const allOrders = JSON.parse(localStorage.getItem('orders') || '[]');
    const updatedOrders = allOrders.map((existingOrder: Order) =>
      existingOrder.id === order.id ? updatedOrder : existingOrder
    );
    localStorage.setItem('orders', JSON.stringify(updatedOrders));

    // 關閉彈窗
    setShowPaymentModal(false);
    setLast5Digits('');
    setInputError('');

    alert('付款資訊已提交！我們將在1-2個工作天內確認您的轉帳，確認後將立即為您準備商品。');

    // 導向我的訂單頁面
    navigate('/my-orders');
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
          <Link to="/" className="continue-shopping-btn">
            稍後付款
          </Link>
          <button
            onClick={handlePaymentComplete}
            className="complete-btn"
          >
            已完成轉帳
          </button>
        </div>

        {/* 付款完成彈窗 */}
        {showPaymentModal && order && (
          <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>確認轉帳完成</h3>
                <button
                  className="modal-close"
                  onClick={() => setShowPaymentModal(false)}
                >
                  ×
                </button>
              </div>

              <div className="modal-body">
                <div className="order-info-modal">
                  <p><strong>訂單編號:</strong> {order.id}</p>
                  <p><strong>轉帳金額:</strong> {formatPrice(order.totalAmount)}</p>
                </div>

                <div className="form-group">
                  <label htmlFor="last5digits">請輸入轉帳帳號末五碼:</label>
                  <input
                    type="text"
                    id="last5digits"
                    value={last5Digits}
                    onChange={(e) => {
                      const inputValue = e.target.value;

                      // 檢查是否包含非數字字符
                      if (inputValue && !/^[0-9]*$/.test(inputValue)) {
                        setInputError('請只輸入數字');
                        return;
                      }

                      // 清除錯誤訊息
                      if (inputError) {
                        setInputError('');
                      }

                      // 限制長度為5位
                      if (inputValue.length <= 5) {
                        setLast5Digits(inputValue);
                      }
                    }}
                    onKeyPress={(e) => {
                      // 只允許數字鍵
                      if (!/[0-9]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'Tab') {
                        e.preventDefault();
                        setInputError('請只輸入數字 0-9');
                      }
                    }}
                    placeholder="請輸入5位數字"
                    maxLength={5}
                    className={`last5digits-input ${inputError ? 'error' : ''}`}
                    autoComplete="off"
                    inputMode="numeric"
                    pattern="[0-9]*"
                  />
                  {inputError && (
                    <div className="error-message">{inputError}</div>
                  )}
                  <small className="input-help">
                    請輸入您轉帳帳戶的末五碼數字，用於核對付款資訊
                  </small>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowPaymentModal(false)}
                >
                  取消
                </button>
                <button
                  className="btn btn-primary"
                  onClick={submitPaymentComplete}
                  disabled={last5Digits.length !== 5}
                >
                  確認提交
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Payment;