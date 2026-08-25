import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Order } from '../../types';
import { formatPrice, formatDate } from '../../utils';
import { ordersAPI } from '../../services/api';
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

  const submitPaymentComplete = async () => {
    if (!order || !last5Digits || last5Digits.length !== 5) {
      alert('請輸入轉帳帳號末五碼');
      return;
    }

    try {
      // 透過 API 提交付款：等待付款 → 等待入帳確認
      await ordersAPI.pay(order.id, last5Digits);

      // 關閉彈窗
      setShowPaymentModal(false);
      setLast5Digits('');
      setInputError('');

      alert('付款資訊已提交！我們將確認您的轉帳，確認入帳後即為您準備出貨。');

      // 導向我的訂單頁面
      navigate('/my-orders');
    } catch (error: any) {
      console.error('更新訂單失敗:', error);
      alert('提交付款資訊失敗，請稍後再試');
    }
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
              {order.items.map(item => {
                const price = item.sku?.price ?? item.product.price ?? 0;
                return (
                <div key={item.sku?.id || item.product.id} className="item-summary">
                  <span>{item.product.name} x {item.quantity}</span>
                  <span>{formatPrice(price * item.quantity)}</span>
                </div>
                );
              })}
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
                <li>轉帳完成後，請點「已完成轉帳」並填入帳號末五碼</li>
                <li>我們確認入帳後，將立即開始準備您的商品並安排出貨</li>
                <li>如有任何問題，請聯絡客服: 02-1234-5678</li>
              </ul>
            </div>

            <div className="payment-notice">
              <h4>重要提醒</h4>
              <p>
                請保留轉帳收據作為付款憑證。訂單進入「等待付款」後須於 48 小時內完成付款，
                逾期系統將自動取消並釋放庫存。完成付款後可於「我的訂單」查看狀態。
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

        {/* 付款完成彈窗（與我的訂單共用 mo-modal 樣式） */}
        {showPaymentModal && order && (
          <div className="mo-modal-overlay" onClick={() => setShowPaymentModal(false)}>
            <div className="mo-modal" onClick={(e) => e.stopPropagation()}>
              <div className="mo-modal-head">
                <div>
                  <h3>確認轉帳完成</h3>
                  <p className="mo-modal-sub">提交後訂單將進入「等待入帳確認」</p>
                </div>
                <button className="mo-modal-close" onClick={() => setShowPaymentModal(false)}>✕</button>
              </div>

              <div className="mo-modal-summary">
                <div>
                  <span>訂單編號</span>
                  <strong>#{order.id}</strong>
                </div>
                <div>
                  <span>轉帳金額</span>
                  <strong className="mo-modal-amount">{formatPrice(order.totalAmount)}</strong>
                </div>
              </div>

              <label className="mo-digits-label" htmlFor="last5digits">轉帳帳號末五碼</label>
              <input
                type="text"
                id="last5digits"
                className={`mo-digits-input ${inputError ? 'error' : ''}`}
                value={last5Digits}
                onChange={(e) => {
                  const inputValue = e.target.value;
                  if (inputValue && !/^[0-9]*$/.test(inputValue)) {
                    setInputError('請只輸入數字');
                    return;
                  }
                  if (inputError) setInputError('');
                  if (inputValue.length <= 5) setLast5Digits(inputValue);
                }}
                placeholder="─────"
                maxLength={5}
                autoComplete="off"
                inputMode="numeric"
                pattern="[0-9]*"
                autoFocus
              />
              <div className="mo-digits-progress">
                {[0, 1, 2, 3, 4].map(i => (
                  <span key={i} className={i < last5Digits.length ? 'filled' : ''} />
                ))}
              </div>
              {inputError && <div className="mo-digits-error">{inputError}</div>}
              <p className="mo-digits-help">供店家核對入帳使用，請確認與您轉出帳戶的末五碼一致</p>

              <div className="mo-modal-actions">
                <button className="mo-btn-cancel" onClick={() => setShowPaymentModal(false)}>取消</button>
                <button
                  className="mo-btn-primary"
                  disabled={last5Digits.length !== 5}
                  onClick={submitPaymentComplete}
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