import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Order } from '../../types';
import { formatPrice, formatDate } from '../../utils';
import { statusText, statusClass } from '../../utils/orderStatus';
import { deliveryLabel } from '../../utils/delivery';
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
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'closed'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
                  image: item.product?.main_image || '/images/placeholder.svg',
                  description: item.product?.description || '',
                  stock: 0,
                  skus: []
                },
                sku: {
                  id: item.sku_id || item.sku?.id || '',
                  product_id: item.product_id,
                  flavor: item.sku?.flavor,
                  spec: item.sku?.spec,
                  unit: item.sku?.unit,
                  price: item.price,
                  stock: 0,
                  reserved: 0,
                  available: 0,
                  is_active: true
                },
                quantity: item.quantity
              })),
              subtotal: apiOrder.subtotal,
              shippingFee: apiOrder.shipping_fee,
              totalAmount: apiOrder.total_amount,
              status: apiOrder.status,
              deliveryMethod: apiOrder.delivery_method,
              paymentDeadline: apiOrder.payment_deadline,
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

  const getStatusText = statusText;
  const getStatusClass = statusClass;

  // 後端存 UTC（無時區字尾），補 Z 再換算剩餘時間
  const remainingText = (deadline?: string | null): string | null => {
    if (!deadline) return null;
    const iso = /Z$|[+-]\d{2}:?\d{2}$/.test(deadline) ? deadline : deadline + 'Z';
    const ms = new Date(iso).getTime() - Date.now();
    if (ms <= 0) return '已逾期';
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return h > 0 ? `剩 ${h} 小時 ${m} 分` : `剩 ${m} 分`;
  };

  // 進度條（正常流程）
  const PROGRESS_STEPS = ['pending_review', 'pending_payment', 'pending_confirm', 'preparing', 'completed'];
  const PROGRESS_LABELS = ['核對', '付款', '入帳確認', '出貨', '完成'];
  const ACTIVE_SET = ['pending_review', 'pending_payment', 'pending_confirm', 'preparing'];

  // 篩選
  const FILTERS = [
    { key: 'all' as const, label: '全部' },
    { key: 'active' as const, label: '進行中' },
    { key: 'completed' as const, label: '已完成' },
    { key: 'closed' as const, label: '已取消／逾期' },
  ];
  const matchFilter = (o: Order) =>
    filter === 'all' ? true
      : filter === 'active' ? ACTIVE_SET.includes(o.status)
      : filter === 'completed' ? o.status === 'completed'
      : o.status === 'cancelled' || o.status === 'expired';
  const visibleOrders = orders.filter(matchFilter);
  const filterCount = (key: typeof filter) =>
    key === 'all' ? orders.length
      : key === 'active' ? orders.filter(o => ACTIVE_SET.includes(o.status)).length
      : key === 'completed' ? orders.filter(o => o.status === 'completed').length
      : orders.filter(o => o.status === 'cancelled' || o.status === 'expired').length;

  // 各狀態的提示文案
  const noticeFor = (order: Order): { icon: string; text: React.ReactNode; tone: string } | null => {
    switch (order.status) {
      case 'pending_review':
        return { icon: '🔎', text: '等待店家核對訂單與運費，核對完成後才需付款', tone: 'info' };
      case 'pending_payment': {
        const remain = remainingText(order.paymentDeadline);
        return {
          icon: '💳',
          text: <>已核對完成，請於 48 小時內完成轉帳付款{remain && <strong>（{remain}）</strong>}</>,
          tone: 'warn',
        };
      }
      case 'pending_confirm':
        return { icon: '⏳', text: '付款資訊已提交，等待店家確認入帳', tone: 'info' };
      case 'preparing':
        return { icon: '📦', text: '已確認入帳，商品準備出貨中', tone: 'ok' };
      default:
        return null;
    }
  };

  const handlePaymentComplete = (order: Order) => {
    setSelectedOrder(order);
    setShowPaymentModal(true);
    setLast5Digits('');
    setInputError('');
  };

  const submitPaymentComplete = async () => {
    if (!selectedOrder || !last5Digits || last5Digits.length !== 5) {
      alert('請輸入轉帳帳號末五碼');
      return;
    }

    try {
      const updated = await ordersAPI.pay(selectedOrder.id, last5Digits);
      setOrders(orders.map(order =>
        order.id === selectedOrder.id
          ? { ...order, status: updated.status, paymentInfo: updated.payment_info }
          : order
      ));
      setShowPaymentModal(false);
      setSelectedOrder(null);
      setLast5Digits('');
      alert('付款資訊已提交！我們將確認您的轉帳，確認入帳後即為您準備出貨。');
    } catch (err: any) {
      alert(err.response?.data?.detail || '提交失敗，請稍後再試');
    }
  };

  const handleCancel = async (order: Order) => {
    if (!window.confirm('確定要取消此訂單嗎？')) return;
    try {
      const updated = await ordersAPI.cancel(order.id);
      setOrders(orders.map(o => (o.id === order.id ? { ...o, status: updated.status } : o)));
    } catch (err: any) {
      alert(err.response?.data?.detail || '取消失敗，請稍後再試');
    }
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

        {orders.length > 0 && (
          <div className="mo-filters">
            {FILTERS.map(f => (
              <button
                key={f.key}
                className={`mo-filter-chip ${filter === f.key ? 'active' : ''}`}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
                <span className="mo-chip-count">{filterCount(f.key)}</span>
              </button>
            ))}
          </div>
        )}

        {orders.length === 0 ? (
          <div className="empty-orders">
            <div className="empty-icon">📦</div>
            <h3>您還沒有任何訂單</h3>
            <p>開始購物，創建您的第一個訂單吧！</p>
            <button onClick={() => navigate('/')} className="btn btn-primary">開始購物</button>
          </div>
        ) : visibleOrders.length === 0 ? (
          <div className="empty-orders"><p>此分類目前沒有訂單</p></div>
        ) : (
          <div className="orders-list">
            {visibleOrders.map(order => {
              const closed = order.status === 'cancelled' || order.status === 'expired';
              const stepIdx = PROGRESS_STEPS.indexOf(order.status);
              const expanded = expandedId === order.id;
              const itemCount = order.items.reduce((s, i) => s + i.quantity, 0);
              const notice = noticeFor(order);
              return (
                <div key={order.id} className={`mo-card ${closed ? 'mo-card-closed' : ''}`}>
                  {/* 標頭 */}
                  <div className="mo-head">
                    <div className="mo-head-left">
                      <span className={`order-status ${getStatusClass(order.status)}`}>{getStatusText(order.status)}</span>
                      <span className="mo-id">#{order.id}</span>
                      <span className="mo-date">{formatDate(order.createdAt)}</span>
                    </div>
                    <div className="mo-amount">
                      {order.status === 'pending_review'
                        ? <span className="mo-amount-pending">{formatPrice(order.subtotal ?? order.totalAmount)} <em>+ 運費待核對</em></span>
                        : <strong>{formatPrice(order.totalAmount)}</strong>}
                    </div>
                  </div>

                  {/* 進度條（非取消/逾期才顯示） */}
                  {!closed && (
                    <div className="mo-progress">
                      {PROGRESS_LABELS.map((label, i) => (
                        <div key={label} className={`mo-step ${i <= stepIdx ? 'done' : ''} ${i === stepIdx ? 'current' : ''}`}>
                          <div className="mo-step-track"><span className="mo-step-dot" /></div>
                          <span className="mo-step-label">{label}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 狀態提示 */}
                  {notice && (
                    <div className={`mo-notice mo-notice-${notice.tone}`}>
                      <span className="mo-notice-icon">{notice.icon}</span>
                      <span>{notice.text}</span>
                    </div>
                  )}

                  {/* 商品摘要（點擊展開明細） */}
                  <button className="mo-summary" onClick={() => setExpandedId(expanded ? null : order.id)}>
                    <div className="mo-thumbs">
                      {order.items.slice(0, 4).map((item, i) => (
                        <img
                          key={i}
                          src={item.product.image}
                          alt={item.product.name}
                          onError={(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.svg'; }}
                        />
                      ))}
                      {order.items.length > 4 && <span className="mo-thumb-more">+{order.items.length - 4}</span>}
                    </div>
                    <span className="mo-summary-text">
                      {order.items[0]?.product.name}
                      {order.items.length > 1 ? ` 等 ${order.items.length} 項` : ''} · 共 {itemCount} 件
                    </span>
                    <span className="mo-expand-hint">{expanded ? '收合明細 ▲' : '查看明細 ▼'}</span>
                  </button>

                  {/* 展開明細 */}
                  {expanded && (
                    <div className="mo-detail">
                      <div className="mo-detail-items">
                        {order.items.map((item, index) => {
                          const unitPrice = item.sku?.price ?? item.product.price ?? 0;
                          const skuLabel = [item.sku?.flavor, item.sku?.spec].filter(Boolean).join(' / ');
                          return (
                            <div key={index} className="mo-detail-item">
                              <img
                                src={item.product.image}
                                alt={item.product.name}
                                onError={(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.svg'; }}
                              />
                              <div className="mo-detail-item-info">
                                <div className="mo-detail-item-name">
                                  {item.product.name}
                                  {skuLabel && <span className="mo-sku"> · {skuLabel}</span>}
                                </div>
                                <div className="mo-detail-item-meta">{formatPrice(unitPrice)} × {item.quantity}</div>
                              </div>
                              <div className="mo-detail-item-total">{formatPrice(unitPrice * item.quantity)}</div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="mo-detail-cols">
                        <div className="mo-detail-block">
                          <h4>配送資訊（{deliveryLabel(order.deliveryMethod)}）</h4>
                          <p>{order.deliveryMethod === 'self_pickup' ? '取件人' : '收件人'}：{order.shippingInfo.name}　{order.shippingInfo.phone}</p>
                          {order.deliveryMethod === 'cvs_711' ? (
                            <p>取貨門市：{order.shippingInfo.store_name}（{order.shippingInfo.store_code}）</p>
                          ) : order.deliveryMethod === 'self_pickup' ? (
                            <p>自取地點：{order.shippingInfo.location_name} {order.shippingInfo.address}</p>
                          ) : (
                            <p>地址：{order.shippingInfo.postalCode} {order.shippingInfo.city} {order.shippingInfo.address}</p>
                          )}
                          {order.shippingInfo.note && <p>備註：{order.shippingInfo.note}</p>}
                        </div>
                        <div className="mo-detail-block mo-detail-amounts">
                          <h4>金額</h4>
                          <p><span>商品小計</span><span>{formatPrice(order.subtotal ?? order.totalAmount)}</span></p>
                          <p><span>運費</span><span>{order.status === 'pending_review' ? '待核對' : formatPrice(order.shippingFee ?? 0)}</span></p>
                          <p className="mo-amount-final"><span>應付金額</span><span>{order.status === 'pending_review' ? '核對後確認' : formatPrice(order.totalAmount)}</span></p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 等待付款：轉帳資訊 + 主要動作 */}
                  {order.status === 'pending_payment' && (
                    <div className="mo-pay-box">
                      <div className="mo-pay-grid">
                        <div><span className="mo-pay-label">銀行</span>台灣銀行 (004)</div>
                        <div><span className="mo-pay-label">帳號</span><strong className="mo-pay-account">123-456-789-012</strong></div>
                        <div><span className="mo-pay-label">戶名</span>水煙商城有限公司</div>
                        <div><span className="mo-pay-label">金額</span><strong>{formatPrice(order.totalAmount)}</strong></div>
                      </div>
                      <p className="mo-pay-note">轉帳備註請填寫訂單編號 <strong>{order.id}</strong></p>
                      <button onClick={() => handlePaymentComplete(order)} className="mo-btn-primary">
                        已完成轉帳，填寫末五碼
                      </button>
                    </div>
                  )}

                  {/* 次要動作 */}
                  {(order.status === 'pending_review' || order.status === 'pending_payment') && (
                    <div className="mo-foot">
                      <button onClick={() => handleCancel(order)} className="mo-btn-ghost">取消訂單</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* 付款完成彈窗 */}
        {showPaymentModal && selectedOrder && (
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
                  <strong>#{selectedOrder.id}</strong>
                </div>
                <div>
                  <span>轉帳金額</span>
                  <strong className="mo-modal-amount">{formatPrice(selectedOrder.totalAmount)}</strong>
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

export default MyOrders;
