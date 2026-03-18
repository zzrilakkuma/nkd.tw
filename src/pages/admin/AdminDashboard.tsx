import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { OrderStatus } from '../../types';
import { formatPrice, formatDate } from '../../utils';
import { ordersAPI } from '../../services/api';
import AdminProducts from './AdminProducts';
import AdminOrderDrawer from './AdminOrderDrawer';
import '../../styles/admin.css';

type AdminTab = 'orders' | 'products';

export interface ApiOrderItem {
  id: number;
  product_id: string;
  quantity: number;
  price: number;
  product?: {
    id: string;
    name: string;
    image: string;
  };
}

export interface ApiOrder {
  id: string;
  user_id: string;
  status: OrderStatus;
  total_amount: number;
  shipping_info: {
    name: string;
    phone: string;
    city: string;
    postalCode: string;
    address: string;
  };
  payment_info?: {
    last5Digits: string;
    completedAt: string;
  };
  created_at: string;
  updated_at: string;
  items: ApiOrderItem[];
}

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AdminTab>('orders');
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<ApiOrder | null>(null);

  useEffect(() => {
    const currentUser = JSON.parse(localStorage.getItem('user') || 'null');

    if (!currentUser || !currentUser.isAdmin) {
      alert('您沒有權限訪問此頁面');
      navigate('/');
      return;
    }

    fetchOrders();
  }, [navigate]);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ordersAPI.getAllOrders();
      setOrders(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || '無法載入訂單，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    setUpdatingId(orderId);
    try {
      await ordersAPI.update(orderId, { status: newStatus });
      setOrders(prev =>
        prev.map(order =>
          order.id === orderId ? { ...order, status: newStatus } : order
        )
      );
      setSelectedOrder(prev =>
        prev?.id === orderId ? { ...prev, status: newStatus } : prev
      );
    } catch (err: any) {
      alert(err.response?.data?.detail || '更新狀態失敗，請再試一次');
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: '待付款',
      payment_submitted: '待確認',
      confirmed: '已確認',
      shipped: '已出貨',
      delivered: '已送達',
      cancelled: '已取消'
    };
    return statusMap[status] || status;
  };

  const getStatusClass = (status: string) => {
    const classMap: Record<string, string> = {
      pending: 'status-pending',
      payment_submitted: 'status-payment-submitted',
      confirmed: 'status-confirmed',
      shipped: 'status-shipped',
      delivered: 'status-delivered',
      cancelled: 'status-cancelled'
    };
    return classMap[status] || '';
  };

  const todayRevenue = orders
    .filter(order => {
      const orderDate = new Date(order.created_at).toDateString();
      const today = new Date().toDateString();
      return orderDate === today;
    })
    .reduce((total, order) => total + order.total_amount, 0);

  return (
    <div className="admin-dashboard">
      <div className="container">
        <h1>後台管理</h1>

        <div className="admin-tabs">
          <button
            className={`admin-tab ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            訂單管理
          </button>
          <button
            className={`admin-tab ${activeTab === 'products' ? 'active' : ''}`}
            onClick={() => setActiveTab('products')}
          >
            商品管理
          </button>
        </div>

        {activeTab === 'products' && <AdminProducts />}

        {activeTab === 'orders' && <>
        <div className="admin-stats">
          <div className="stat-card">
            <h3>總訂單數</h3>
            <div className="stat-number">{orders.length}</div>
          </div>
          <div className="stat-card">
            <h3>待處理訂單</h3>
            <div className="stat-number">
              {orders.filter(order => order.status === 'pending').length}
            </div>
          </div>
          <div className="stat-card">
            <h3>今日營收</h3>
            <div className="stat-number">{formatPrice(todayRevenue)}</div>
          </div>
        </div>

        <div className="orders-table">
          <h2>訂單列表</h2>

          {loading ? (
            <div className="empty-orders">
              <p>載入中...</p>
            </div>
          ) : error ? (
            <div className="empty-orders">
              <p style={{ color: '#e74c3c' }}>{error}</p>
              <button onClick={fetchOrders} style={{ marginTop: '12px', padding: '8px 16px', cursor: 'pointer' }}>
                重新載入
              </button>
            </div>
          ) : orders.length === 0 ? (
            <div className="empty-orders">
              <p>目前沒有訂單</p>
            </div>
          ) : (
            <>
              {/* 桌面版表格 */}
              <div className="table-container desktop-only">
                <table>
                  <thead>
                    <tr>
                      <th>訂單編號</th>
                      <th>下單日期</th>
                      <th>客戶資訊</th>
                      <th>商品</th>
                      <th>金額</th>
                      <th>狀態 / 付款</th>
                      <th>更改狀態</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map(order => (
                      <tr
                        key={order.id}
                        className="clickable-row"
                        onClick={() => setSelectedOrder(order)}
                      >
                        <td>
                          <span className="order-id" title={order.id}>
                            {order.id.length > 10 ? `${order.id.slice(0, 8)}…` : order.id}
                          </span>
                        </td>
                        <td>{formatDate(order.created_at)}</td>
                        <td>
                          <div className="customer-info">
                            <div>{order.shipping_info.name}</div>
                            <div className="phone">{order.shipping_info.phone}</div>
                            <div className="address">
                              {order.shipping_info.city} {order.shipping_info.address}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="order-items">
                            {order.items.map((item, index) => (
                              <div key={index} className="item">
                                {item.product?.name || item.product_id} x {item.quantity}
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="amount">{formatPrice(order.total_amount)}</td>
                        <td>
                          <span className={`status ${getStatusClass(order.status)}`}>
                            {getStatusText(order.status)}
                          </span>
                          {order.payment_info && (
                            <div className="admin-payment-info">
                              <small>
                                轉帳末五碼: <strong>{order.payment_info.last5Digits}</strong>
                              </small>
                              <small>
                                提交時間: {formatDate(order.payment_info.completedAt)}
                              </small>
                            </div>
                          )}
                        </td>
                        <td onClick={e => e.stopPropagation()}>
                          <div className="status-controls">
                            <select
                              value={order.status}
                              onChange={(e) => updateOrderStatus(order.id, e.target.value as OrderStatus)}
                              className="status-select"
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
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 手機版卡片列表 */}
              <div className="mobile-order-list mobile-only">
                {orders.map(order => (
                  <div
                    key={order.id}
                    className="mobile-order-card"
                    onClick={() => setSelectedOrder(order)}
                  >
                    <div className="moc-top">
                      <span className="order-id" title={order.id}>
                        #{order.id.length > 10 ? `${order.id.slice(0, 8)}…` : order.id}
                      </span>
                      <span className={`status ${getStatusClass(order.status)}`}>
                        {getStatusText(order.status)}
                      </span>
                    </div>
                    <div className="moc-middle">
                      <span className="moc-name">{order.shipping_info.name}</span>
                      <span className="moc-amount">{formatPrice(order.total_amount)}</span>
                    </div>
                    <div className="moc-bottom">
                      <span className="moc-date">{formatDate(order.created_at)}</span>
                      <span className="moc-items">
                        {order.items.map(i => i.product?.name || i.product_id).join('、')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        </>}
      </div>

      <AdminOrderDrawer
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onStatusChange={updateOrderStatus}
        updatingId={updatingId}
      />
    </div>
  );
};

export default AdminDashboard;
