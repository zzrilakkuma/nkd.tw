import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Order } from '../../types';
import { formatPrice, formatDate } from '../../utils';
import '../../styles/orders.css';
import '../../styles/my-orders.css';

const MyOrders: React.FC = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const currentUser = JSON.parse(localStorage.getItem('user') || 'null');

    if (!currentUser) {
      navigate('/login');
      return;
    }

    // 獲取當前用戶的訂單
    const allOrders = JSON.parse(localStorage.getItem('orders') || '[]');
    const userOrders = allOrders.filter((order: Order) => order.userId === currentUser.id);

    // 按日期排序，最新的在前面
    const sortedOrders = userOrders.sort((a: Order, b: Order) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    setOrders(sortedOrders);
    setLoading(false);
  }, [navigate]);

  const getStatusText = (status: string) => {
    const statusMap = {
      pending: '待處理',
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
      confirmed: 'status-confirmed',
      shipped: 'status-shipped',
      delivered: 'status-delivered',
      cancelled: 'status-cancelled'
    };
    return classMap[status as keyof typeof classMap] || '';
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
                    <span className="payment-notice">
                      💳 請記得完成轉帳付款
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyOrders;