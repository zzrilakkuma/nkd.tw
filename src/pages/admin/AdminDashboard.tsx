import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Order, OrderStatus } from '../../types';
import { formatPrice, formatDate } from '../../utils';
import '../../styles/admin.css';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    const currentUser = JSON.parse(localStorage.getItem('user') || 'null');

    if (!currentUser || !currentUser.isAdmin) {
      alert('您沒有權限訪問此頁面');
      navigate('/');
      return;
    }

    const savedOrders = JSON.parse(localStorage.getItem('orders') || '[]');
    setOrders(savedOrders);
  }, [navigate]);

  const updateOrderStatus = (orderId: string, newStatus: OrderStatus) => {
    const updatedOrders = orders.map(order =>
      order.id === orderId
        ? { ...order, status: newStatus }
        : order
    );

    setOrders(updatedOrders);
    localStorage.setItem('orders', JSON.stringify(updatedOrders));
  };

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

  return (
    <div className="admin-dashboard">
      <div className="container">
        <h1>後台管理 - 訂單管理</h1>

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
            <div className="stat-number">
              {formatPrice(
                orders
                  .filter(order => {
                    const orderDate = new Date(order.createdAt).toDateString();
                    const today = new Date().toDateString();
                    return orderDate === today;
                  })
                  .reduce((total, order) => total + order.totalAmount, 0)
              )}
            </div>
          </div>
        </div>

        <div className="orders-table">
          <h2>訂單列表</h2>

          {orders.length === 0 ? (
            <div className="empty-orders">
              <p>目前沒有訂單</p>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>訂單編號</th>
                    <th>下單日期</th>
                    <th>客戶資訊</th>
                    <th>商品</th>
                    <th>金額</th>
                    <th>狀態</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(order => (
                    <tr key={order.id}>
                      <td className="order-id">{order.id}</td>
                      <td>{formatDate(order.createdAt)}</td>
                      <td>
                        <div className="customer-info">
                          <div>{order.shippingInfo.name}</div>
                          <div className="phone">{order.shippingInfo.phone}</div>
                          <div className="address">
                            {order.shippingInfo.city} {order.shippingInfo.address}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="order-items">
                          {order.items.map((item, index) => (
                            <div key={index} className="item">
                              {item.product.name} x {item.quantity}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="amount">{formatPrice(order.totalAmount)}</td>
                      <td>
                        <span className={`status ${getStatusClass(order.status)}`}>
                          {getStatusText(order.status)}
                        </span>
                      </td>
                      <td>
                        <div className="status-controls">
                          <select
                            value={order.status}
                            onChange={(e) => updateOrderStatus(order.id, e.target.value as OrderStatus)}
                            className="status-select"
                          >
                            <option value={OrderStatus.PENDING}>待處理</option>
                            <option value={OrderStatus.CONFIRMED}>已確認</option>
                            <option value={OrderStatus.SHIPPED}>已出貨</option>
                            <option value={OrderStatus.DELIVERED}>已送達</option>
                            <option value={OrderStatus.CANCELLED}>已取消</option>
                          </select>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;