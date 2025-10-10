import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Order, OrderStatus } from '../../types';
import { formatPrice, formatDate } from '../../utils';
import { ordersAPI } from '../../services/api';
import '../../styles/orders.css';
import '../../styles/my-orders.css';

const MyOrders: React.FC = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [last5Digits, setLast5Digits] = useState('');
  const [inputError, setInputError] = useState('');

  useEffect(() => {
    const fetchOrders = async () => {
      const currentUser = JSON.parse(localStorage.getItem('user') || 'null');

      if (!currentUser) {
        navigate('/login');
        return;
      }

      try {
        // 檢查是否有 token
        if (currentUser && currentUser.token) {
          // 有 token，從 API 獲取訂單
          try {
            const apiOrders = await ordersAPI.getUserOrders();

            // 轉換 API 回應為前端格式
            const formattedOrders = apiOrders.map((apiOrder: any) => ({
              id: apiOrder.id,
              userId: apiOrder.user_id,
              items: apiOrder.items.map((item: any) => ({
                product: {
                  id: item.product_id,
                  name: item.product?.name || '商品',
                  price: item.price,
                  image: item.product?.image || '/images/placeholder.svg',
                  description: item.product?.description || '',
                  stock: item.product?.stock || 0,
                  category: item.product?.category || ''
                },
                quantity: item.quantity
              })),
              totalAmount: apiOrder.total_amount,
              status: apiOrder.status,
              createdAt: apiOrder.created_at,
              shippingInfo: apiOrder.shipping_info,
              paymentInfo: apiOrder.payment_info
            }));

            // 按日期排序，最新的在前面
            const sortedOrders = formattedOrders.sort((a: Order, b: Order) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );

            setOrders(sortedOrders);

            // 同步更新 localStorage
            localStorage.setItem('orders', JSON.stringify(sortedOrders));
          } catch (apiError) {
            console.warn('API 獲取訂單失敗，使用 localStorage 備援:', apiError);
            // API 失敗時使用 localStorage
            const allOrders = JSON.parse(localStorage.getItem('orders') || '[]');
            const userOrders = allOrders.filter((order: Order) => order.userId === currentUser.id);
            const sortedOrders = userOrders.sort((a: Order, b: Order) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
            setOrders(sortedOrders);
          }
        } else {
          // 沒有 token，使用 localStorage
          const allOrders = JSON.parse(localStorage.getItem('orders') || '[]');
          const userOrders = allOrders.filter((order: Order) => order.userId === currentUser.id);
          const sortedOrders = userOrders.sort((a: Order, b: Order) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          setOrders(sortedOrders);
        }
      } catch (error) {
        console.error('獲取訂單失敗:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [navigate]);

  const getStatusText = (status: string) => {
    const statusMap = {
      pending: '待付款',
      payment_submitted: '待確認',
      confirmed: '已確認',
      shipped: '已出貨',
      delivered: '已送達',
      cancelled: '已取消'
    };
    return statusMap[status as keyof typeof statusMap] || status;
  };

  const getStatusClass = (status: string) => {
    const classMap = {
      pending: 'status-pending',
      payment_submitted: 'status-payment-submitted',
      confirmed: 'status-confirmed',
      shipped: 'status-shipped',
      delivered: 'status-delivered',
      cancelled: 'status-cancelled'
    };
    return classMap[status as keyof typeof classMap] || '';
  };

  const handlePaymentComplete = (order: Order) => {
    setSelectedOrder(order);
    setShowPaymentModal(true);
    setLast5Digits('');
    setInputError('');
  };

  const submitPaymentComplete = () => {
    if (!selectedOrder || !last5Digits || last5Digits.length !== 5) {
      alert('請輸入轉帳帳號末五碼');
      return;
    }

    const updatedOrder: Order = {
      ...selectedOrder,
      status: OrderStatus.PAYMENT_SUBMITTED,
      paymentInfo: {
        last5Digits: last5Digits,
        completedAt: new Date().toISOString()
      }
    };

    // 更新 localStorage 中的訂單
    const allOrders = JSON.parse(localStorage.getItem('orders') || '[]');
    const updatedOrders = allOrders.map((order: Order) =>
      order.id === selectedOrder.id ? updatedOrder : order
    );
    localStorage.setItem('orders', JSON.stringify(updatedOrders));

    // 更新本地狀態
    setOrders(orders.map(order =>
      order.id === selectedOrder.id ? updatedOrder : order
    ));

    // 關閉彈窗
    setShowPaymentModal(false);
    setSelectedOrder(null);
    setLast5Digits('');

    alert('付款資訊已提交！我們將在1-2個工作天內確認您的轉帳，確認後將立即為您準備商品。');
  };

  if (loading) {
    return (
      <div className="my-orders-page">
        <div className="container">
          <div className="loading">載入中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="my-orders-page">
      <div className="container">
        <h1>我的訂單</h1>

        {orders.length === 0 ? (
          <div className="empty-orders">
            <div className="empty-icon">📦</div>
            <h3>您還沒有任何訂單</h3>
            <p>開始購物，創建您的第一個訂單吧！</p>
            <button
              onClick={() => navigate('/products')}
              className="btn btn-primary"
            >
              開始購物
            </button>
          </div>
        ) : (
          <div className="orders-list">
            {orders.map(order => (
              <div key={order.id} className="order-card">
                <div className="order-header">
                  <div className="order-info">
                    <h3>訂單編號: {order.id}</h3>
                    <div className="order-meta">
                      <span className="order-date">
                        下單時間: {formatDate(order.createdAt)}
                      </span>
                      <span className={`order-status ${getStatusClass(order.status)}`}>
                        {getStatusText(order.status)}
                      </span>
                    </div>
                    <div className="order-status-notices">
                      {order.status === 'pending' && (
                        <span className="payment-notice">
                          💳 請記得完成轉帳付款
                        </span>
                      )}
                      {order.status === 'payment_submitted' && (
                        <span className="payment-submitted-notice">
                          ⏳ 付款資訊已提交，等待店家確認
                        </span>
                      )}
                      {order.status === 'confirmed' && (
                        <span className="processing-notice">
                          📦 您的訂單正在處理中
                        </span>
                      )}
                      {order.status === 'shipped' && (
                        <span className="shipped-notice">
                          🚚 商品已出貨，請注意查收
                        </span>
                      )}
                      {order.status === 'delivered' && (
                        <span className="delivered-notice">
                          ✅ 訂單已完成
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="order-amount">
                    {formatPrice(order.totalAmount)}
                  </div>
                </div>

                <div className="order-items">
                  <h4>商品明細</h4>
                  {order.items.map((item, index) => (
                    <div key={index} className="order-item">
                      <div className="item-image">
                        <img
                          src={item.product.image}
                          alt={item.product.name}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/images/placeholder.svg';
                          }}
                        />
                      </div>
                      <div className="item-details">
                        <div className="item-name">{item.product.name}</div>
                        <div className="item-meta">
                          <span>數量: {item.quantity}</span>
                          <span>單價: {formatPrice(item.product.price)}</span>
                        </div>
                      </div>
                      <div className="item-total">
                        {formatPrice(item.product.price * item.quantity)}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="order-shipping">
                  <h4>配送資訊</h4>
                  <div className="shipping-details">
                    <p><strong>收件人:</strong> {order.shippingInfo.name}</p>
                    <p><strong>聯絡電話:</strong> {order.shippingInfo.phone}</p>
                    <p><strong>配送地址:</strong> {order.shippingInfo.postalCode} {order.shippingInfo.city} {order.shippingInfo.address}</p>
                  </div>
                </div>

                <div className="order-actions">
                  {order.status === 'pending' && (
                    <div className="payment-section">
                      <div className="bank-transfer-info">
                        <h4>轉帳資訊</h4>
                        <div className="bank-details-compact">
                          <div className="bank-row-compact">
                            <span className="label">銀行:</span>
                            <span className="value">台灣銀行 (004)</span>
                          </div>
                          <div className="bank-row-compact">
                            <span className="label">帳號:</span>
                            <span className="value account-number">123-456-789-012</span>
                          </div>
                          <div className="bank-row-compact">
                            <span className="label">戶名:</span>
                            <span className="value">水煙商城有限公司</span>
                          </div>
                          <div className="bank-row-compact highlight">
                            <span className="label">金額:</span>
                            <span className="value">{formatPrice(order.totalAmount)}</span>
                          </div>
                          <div className="transfer-note">
                            轉帳備註請填寫訂單編號: <strong>{order.id}</strong>
                          </div>
                        </div>
                        <div className="payment-complete-section">
                          <button
                            onClick={() => handlePaymentComplete(order)}
                            className="payment-complete-btn"
                          >
                            已完成轉帳
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 付款完成彈窗 */}
        {showPaymentModal && selectedOrder && (
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
                  <p><strong>訂單編號:</strong> {selectedOrder.id}</p>
                  <p><strong>轉帳金額:</strong> {formatPrice(selectedOrder.totalAmount)}</p>
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

export default MyOrders;