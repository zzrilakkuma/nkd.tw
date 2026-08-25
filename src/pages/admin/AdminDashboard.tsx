import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { OrderStatus } from '../../types';
import { formatPrice, formatDate } from '../../utils';
import { statusText, statusClass, NEXT_STATUSES } from '../../utils/orderStatus';
import { deliveryLabel } from '../../utils/delivery';
import { ordersAPI } from '../../services/api';
import AdminProducts from './AdminProducts';
import AdminUsers from './AdminUsers';
import AdminPickupLocations from './AdminPickupLocations';
import AdminAuditLogs from './AdminAuditLogs';
import AdminOrderDrawer from './AdminOrderDrawer';
import '../../styles/admin.css';
import '../../styles/profile.css';

type AdminTab = 'orders' | 'products' | 'accounts' | 'pickups' | 'audit';

export interface ApiOrderItem {
  id: number;
  product_id: string;
  sku_id?: string;
  quantity: number;
  price: number;
  product?: {
    id: string;
    name: string;
    main_image?: string;
  };
  sku?: {
    id: string;
    flavor?: string;
    spec?: string;
    unit?: string;
  };
}

export interface ApiOrder {
  id: string;
  user_id: string;
  status: OrderStatus;
  delivery_method?: string;
  subtotal: number;
  discount: number;
  invoice?: { tax_id: string; company_name: string } | null;
  shipping_fee: number;
  total_amount: number;
  locked: boolean;
  paid_at?: string | null;
  payment_deadline?: string | null;
  shipping_info: {
    name?: string;
    phone?: string;
    city?: string;
    postalCode?: string;
    address?: string;
    store_name?: string;
    store_code?: string;
    pickup_location_id?: string;
    location_name?: string;
    contact?: string;
    note?: string;
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
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  // 篩選或搜尋改變時回到第 1 頁
  useEffect(() => {
    setPage(1);
  }, [statusFilter, search]);

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
      const updated = await ordersAPI.changeStatus(orderId, newStatus);
      setOrders(prev =>
        prev.map(order => (order.id === orderId ? { ...order, ...updated } : order))
      );
      setSelectedOrder(prev =>
        prev?.id === orderId ? { ...prev, ...updated } : prev
      );
    } catch (err: any) {
      alert(err.response?.data?.detail || '更新狀態失敗，請再試一次');
    } finally {
      setUpdatingId(null);
    }
  };

  const updateOrderItems = async (
    orderId: string,
    items: Array<{ sku_id: string; quantity: number }>,
    discount?: number,
  ) => {
    setUpdatingId(orderId);
    try {
      const updated = await ordersAPI.updateItems(orderId, items, discount);
      setOrders(prev => prev.map(o => (o.id === orderId ? { ...o, ...updated } : o)));
      setSelectedOrder(prev => (prev?.id === orderId ? { ...prev, ...updated } : prev));
    } catch (err: any) {
      alert(err.response?.data?.detail || '品項調整失敗，請再試一次');
    } finally {
      setUpdatingId(null);
    }
  };

  const verifyOrder = async (orderId: string, shippingFee: number, discount = 0) => {
    setUpdatingId(orderId);
    try {
      const updated = await ordersAPI.verify(orderId, shippingFee, discount);
      setOrders(prev => prev.map(o => (o.id === orderId ? { ...o, ...updated } : o)));
      setSelectedOrder(prev => (prev?.id === orderId ? { ...prev, ...updated } : prev));
    } catch (err: any) {
      alert(err.response?.data?.detail || '核對失敗，請再試一次');
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusText = statusText;
  const getStatusClass = statusClass;

  // 需要管理員處理的狀態
  const ACTIONABLE = ['pending_review', 'pending_confirm'];

  const STATUS_FILTERS = [
    { key: 'all', label: '全部' },
    { key: 'pending_review', label: '等待核對' },
    { key: 'pending_payment', label: '等待付款' },
    { key: 'pending_confirm', label: '等待入帳確認' },
    { key: 'preparing', label: '準備出貨' },
    { key: 'completed', label: '已完成' },
    { key: 'cancelled', label: '已取消' },
    { key: 'expired', label: '已逾期' },
  ];

  // 由新到舊
  const sortedOrders = [...orders].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const statusCounts = orders.reduce<Record<string, number>>((m, o) => {
    m[o.status] = (m[o.status] || 0) + 1;
    return m;
  }, {});

  const q = search.trim().toLowerCase();
  const filteredOrders = sortedOrders.filter(o => {
    if (statusFilter !== 'all' && o.status !== statusFilter) return false;
    if (!q) return true;
    return (
      o.id.toLowerCase().includes(q) ||
      (o.shipping_info.name || '').toLowerCase().includes(q) ||
      (o.shipping_info.phone || '').includes(q)
    );
  });

  const pendingCount = orders.filter(o => ACTIONABLE.includes(o.status)).length;
  const preparingCount = orders.filter(o => o.status === 'preparing').length;
  const completedRevenue = orders
    .filter(o => o.status === 'completed')
    .reduce((total, o) => total + o.total_amount, 0);

  // 分頁
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedOrders = filteredOrders.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const rangeStart = filteredOrders.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, filteredOrders.length);

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
          <button
            className={`admin-tab ${activeTab === 'accounts' ? 'active' : ''}`}
            onClick={() => setActiveTab('accounts')}
          >
            帳號管理
          </button>
          <button
            className={`admin-tab ${activeTab === 'pickups' ? 'active' : ''}`}
            onClick={() => setActiveTab('pickups')}
          >
            自取點
          </button>
          <button
            className={`admin-tab ${activeTab === 'audit' ? 'active' : ''}`}
            onClick={() => setActiveTab('audit')}
          >
            操作紀錄
          </button>
        </div>

        {activeTab === 'products' && <AdminProducts />}

        {activeTab === 'accounts' && <AdminUsers />}

        {activeTab === 'pickups' && <AdminPickupLocations />}

        {activeTab === 'audit' && <AdminAuditLogs />}

        {activeTab === 'orders' && <>
        <div className="admin-stats">
          <div className="stat-card clickable" onClick={() => setStatusFilter('all')}>
            <h3>總訂單數</h3>
            <div className="stat-number">{orders.length}</div>
            <span className="stat-sub">點擊顯示全部</span>
          </div>
          <div
            className={`stat-card clickable ${pendingCount > 0 ? 'stat-card-alert' : ''}`}
            onClick={() => setStatusFilter('pending_review')}
          >
            <h3>待處理</h3>
            <div className="stat-number">{pendingCount}</div>
            <span className="stat-sub">等待核對 / 入帳確認</span>
          </div>
          <div className="stat-card clickable" onClick={() => setStatusFilter('preparing')}>
            <h3>準備出貨</h3>
            <div className="stat-number">{preparingCount}</div>
          </div>
          <div className="stat-card clickable" onClick={() => setStatusFilter('completed')}>
            <h3>已完成營收</h3>
            <div className="stat-number">{formatPrice(completedRevenue)}</div>
          </div>
        </div>

        <div className="orders-table">
          <div className="orders-toolbar">
            <div className="status-filter-chips">
              {STATUS_FILTERS.map(f => (
                <button
                  key={f.key}
                  className={`filter-chip ${statusFilter === f.key ? 'active' : ''}`}
                  onClick={() => setStatusFilter(f.key)}
                >
                  {f.label}
                  <span className="chip-count">
                    {f.key === 'all' ? orders.length : (statusCounts[f.key] || 0)}
                  </span>
                </button>
              ))}
            </div>
            <input
              className="orders-search"
              type="text"
              placeholder="搜尋訂單編號 / 客戶姓名 / 電話"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

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
          ) : filteredOrders.length === 0 ? (
            <div className="empty-orders">
              <p>沒有符合條件的訂單</p>
              <button
                onClick={() => { setStatusFilter('all'); setSearch(''); }}
                style={{ marginTop: 12, padding: '8px 16px', cursor: 'pointer' }}
              >
                清除篩選
              </button>
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
                    {pagedOrders.map(order => (
                      <tr
                        key={order.id}
                        className={`clickable-row ${ACTIONABLE.includes(order.status) ? 'needs-action' : ''}`}
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
                              <span className="category-badge">{deliveryLabel(order.delivery_method)}</span>{' '}
                              {order.delivery_method === 'cvs_711'
                                ? `${order.shipping_info.store_name || ''} (${order.shipping_info.store_code || ''})`
                                : order.delivery_method === 'self_pickup'
                                ? order.shipping_info.location_name
                                : `${order.shipping_info.city || ''} ${order.shipping_info.address || ''}`}
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
                            {NEXT_STATUSES[order.status]?.length > 0 ? (
                              <select
                                value=""
                                onChange={(e) => e.target.value && updateOrderStatus(order.id, e.target.value as OrderStatus)}
                                className="status-select"
                                disabled={updatingId === order.id}
                              >
                                <option value="">變更為…</option>
                                {NEXT_STATUSES[order.status].map(s => (
                                  <option key={s} value={s}>{getStatusText(s)}</option>
                                ))}
                              </select>
                            ) : (
                              <span className="updating-label">—</span>
                            )}
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
                {pagedOrders.map(order => (
                  <div
                    key={order.id}
                    className={`mobile-order-card ${ACTIONABLE.includes(order.status) ? 'needs-action' : ''}`}
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

              {/* 分頁 */}
              <div className="orders-pagination">
                <span className="pagination-summary">
                  顯示 {rangeStart}–{rangeEnd}，共 {filteredOrders.length} 筆
                </span>
                {totalPages > 1 && (
                  <div className="pagination-controls">
                    <button
                      className="page-btn"
                      disabled={currentPage === 1}
                      onClick={() => setPage(currentPage - 1)}
                    >
                      上一頁
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                      .reduce<(number | string)[]>((acc, p, idx, arr) => {
                        if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('…');
                        acc.push(p);
                        return acc;
                      }, [])
                      .map((p, i) =>
                        typeof p === 'number' ? (
                          <button
                            key={i}
                            className={`page-btn ${p === currentPage ? 'active' : ''}`}
                            onClick={() => setPage(p)}
                          >
                            {p}
                          </button>
                        ) : (
                          <span key={i} className="page-ellipsis">…</span>
                        )
                      )}
                    <button
                      className="page-btn"
                      disabled={currentPage === totalPages}
                      onClick={() => setPage(currentPage + 1)}
                    >
                      下一頁
                    </button>
                  </div>
                )}
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
        onVerify={verifyOrder}
        onUpdateItems={updateOrderItems}
        updatingId={updatingId}
      />
    </div>
  );
};

export default AdminDashboard;
